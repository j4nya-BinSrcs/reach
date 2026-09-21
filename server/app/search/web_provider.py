"""Real, keyless web search provider.

Aggregates genuine search results from public, free endpoints — no API keys,
no demo data, no fabricated URLs:

- DuckDuckGo HTML results (general web / articles / docs)
- Wikipedia search API (encyclopedia / reference material)
- arXiv Atom API (papers)
- Crossref REST API (papers / DOIs)
- GitHub repository search (open-source repos)
- StackExchange search API (Q&A discussions)
- Hacker News Algolia (community discussions)
- Reddit search JSON (community discussions)

Every provider is optional and failure-tolerant: a single quote outage never
aborts a research query. Results are normalized into :class:`SearchResult`
with real URLs, titles, and snippets taken straight from each source's own
response, then deduplicated.
"""

import logging
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html import unescape
from urllib.parse import parse_qs, quote, urlsplit

import httpx

from app.search.models import SearchResult
from app.search.utils import dedupe_results, extract_domain, normalize_url

logger = logging.getLogger(__name__)

_BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0 "
    "REACH-research/0.1"
)

ATOM_NS = "{http://www.w3.org/2005/Atom}"
_STACKEXCHANGE_BODY_FILTER = "!nNPvSNdWme"


@dataclass
class Hit:
    """A raw candidate before normalization."""

    url: str
    title: str
    snippet: str = ""
    score: float | None = None


class _RateBudget:
    """Small per-run budget for rate-limited providers (e.g. GitHub)."""

    def __init__(self, limit: int) -> None:
        self._limit = limit
        self._used = 0

    def spend(self) -> bool:
        if self._used >= self._limit:
            return False
        self._used += 1
        return True


def _strip_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _decaying_scores(count: int) -> list[float]:
    return [max(0.1, round(0.95 - index * 0.07, 3)) for index in range(count)]


def _result(hit: Hit, query: str) -> SearchResult | None:
    url = normalize_url(hit.url)
    if not url.startswith(("http://", "https://")):
        return None
    return SearchResult(
        title=(hit.title or url)[:300].strip(),
        url=url,
        snippet=(hit.snippet or "")[:600],
        source_domain=extract_domain(url),
        score=hit.score,
        query=query,
    )


class DdgProvider:
    """DuckDuckGo HTML search."""

    name = "ddg"
    kind = "general"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        response = await self._client.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
        )
        response.raise_for_status()
        soup = _make_soup(response.text)
        hits: list[Hit] = []
        for anchor in soup.select("a.result__a")[:limit]:
            title = " ".join(anchor.get_text(" ", strip=True).split())
            if not title:
                continue
            href = anchor.get("href", "")
            url = _unwarp_ddg(href)
            snippet_block = anchor.find_next("a", class_="result__snippet")
            snippet = " ".join(snippet_block.get_text(" ", strip=True).split()) if snippet_block else ""
            hits.append(Hit(url=url, title=title, snippet=snippet))
        return hits


def _unwarp_ddg(href: str) -> str:
    """Extract the real target from DuckDuckGo's redirect links."""
    if "away" not in href and "/l/?" in href:
        uddg = parse_qs(urlsplit(href).query).get("uddg")
        if uddg:
            return uddg[0]
    return href


class WikipediaProvider:
    """Wikipedia search API."""

    name = "wikipedia"
    kind = "documentation"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        response = await self._client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": str(limit),
                "format": "json",
                "utf8": "1",
            },
        )
        response.raise_for_status()
        items = (response.json().get("query") or {}).get("search") or []
        hits: list[Hit] = []
        for item in items[:limit]:
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            slug = quote(title.replace(" ", "_"))
            snippet = _strip_html(str(item.get("snippet") or ""))
            hits.append(
                Hit(
                    url=f"https://en.wikipedia.org/wiki/{slug}",
                    title=title,
                    snippet=snippet[:400],
                )
            )
        return hits


class ArxivProvider:
    """arXiv Atom API (papers)."""

    name = "arxiv"
    kind = "paper"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        token = _safe_query(query)
        response = await self._client.get(
            "http://export.arxiv.org/api/query",
            params={"search_query": f"all:{token}", "start": 0, "max_results": str(limit)},
            headers={"Accept": "application/atom+xml"},
        )
        response.raise_for_status()
        root = ET.fromstring(response.text)
        hits: list[Hit] = []
        for entry in root.findall(f"{ATOM_NS}entry")[:limit]:
            title = _strip_html(entry.findtext(f"{ATOM_NS}title") or "").strip()
            url = (entry.findtext(f"{ATOM_NS}id") or "").strip()
            summary = _strip_html(entry.findtext(f"{ATOM_NS}summary") or "")
            if title and url.startswith(("http://", "https://")):
                hits.append(Hit(url=url, title=title, snippet=summary[:400]))
        return hits


class CrossrefProvider:
    """Crossref REST API (scholarly works / DOIs)."""

    name = "crossref"
    kind = "paper"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        response = await self._client.get(
            "https://api.crossref.org/works",
            params={
                "query": query,
                "rows": str(limit),
                "select": "DOI,title,URL,abstract,container-title,author,published",
                "mailto": "reach.research@example.com",
            },
        )
        response.raise_for_status()
        items = (response.json().get("message") or {}).get("items") or []
        hits: list[Hit] = []
        for item in items[:limit]:
            titles = item.get("title") or []
            title = (titles[0] if titles else "").strip()
            doi = str(item.get("DOI") or "").strip()
            url = str(item.get("URL") or "").strip()
            if not url and doi:
                url = f"https://doi.org/{doi}"
            if not title or not url:
                continue
            abstract = _strip_html(str(item.get("abstract") or ""))
            container = (item.get("container-title") or [])
            container = container[0] if container else ""
            snippet = abstract[:400] or (f"Published in {container}" if container else "")
            hits.append(Hit(url=url, title=title, snippet=snippet[:400]))
        return hits


class GithubProvider:
    """GitHub repository search (unauthenticated, rate-budgeted)."""

    name = "github"
    kind = "github"

    def __init__(self, client: httpx.AsyncClient, budget: int = 6) -> None:
        self._client = client
        self._budget = _RateBudget(budget)

    async def search(self, query: str, limit: int) -> list[Hit]:
        if not self._budget.spend():
            logger.info("github search budget exhausted; skipping query %r", query)
            return []
        response = await self._client.get(
            "https://api.github.com/search/repositories",
            params={"q": query, "per_page": min(limit, 10)},
        )
        if response.status_code in (403, 429, 503):
            logger.warning("github search rate limited (%s); skipping", response.status_code)
            return []
        response.raise_for_status()
        items = (response.json().get("items")) or []
        hits: list[Hit] = []
        for item in items[:limit]:
            name = str(item.get("full_name") or "").strip()
            url = str(item.get("html_url") or "").strip()
            description = str(item.get("description") or "").strip()
            stars = item.get("stargazers_count")
            if not name or not url:
                continue
            snippet = description
            if stars:
                metadata = f"★ {stars}" if snippet else f"{stars} stars"
                snippet = f"{snippet} — {metadata}" if snippet and metadata else snippet
            hits.append(Hit(url=url, title=f"{name} — GitHub repository", snippet=snippet[:400]))
        return hits


class StackExchangeProvider:
    """StackExchange search API (Q&A discussions)."""

    name = "stackexchange"
    kind = "discussion"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        response = await self._client.get(
            "https://api.stackexchange.com/2.3/search/advanced",
            params={
                "order": "desc",
                "sort": "relevance",
                "q": query,
                "site": "stackoverflow",
                "pagesize": str(limit),
                "filter": _STACKEXCHANGE_BODY_FILTER,
            },
        )
        response.raise_for_status()
        items = response.json().get("items") or []
        hits: list[Hit] = []
        for item in items[:limit]:
            title = str(item.get("title") or "").strip()
            link = str(item.get("link") or "").strip()
            body = _strip_html(str(item.get("body") or ""))
            tags = item.get("tags") or []
            snippet = body[:400] if body else (f"Tags: {', '.join(tags)}" if tags else "")
            views = item.get("view_count")
            if views and not body:
                snippet = f"{snippet} — {views} views" if snippet else f"{views} views"
            if title and link and link.startswith(("http://", "https://")):
                hits.append(Hit(url=link, title=title, snippet=snippet[:400]))
        return hits


class HackerNewsProvider:
    """Hacker News search via Algolia (community discussions)."""

    name = "hackernews"
    kind = "discussion"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        response = await self._client.get(
            "https://hn.algolia.com/api/v1/search",
            params={"query": query, "hitsPerPage": str(limit), "tags": "story"},
        )
        response.raise_for_status()
        hits: list[Hit] = []
        for item in (response.json().get("hits") or [])[:limit]:
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            object_id = item.get("objectID")
            url = str(item.get("url") or "").strip()
            if not url and object_id:
                url = f"https://news.ycombinator.com/item?id={object_id}"
            story = _strip_html(str(item.get("story_text") or ""))
            snippet = story[:400] or (f"Discussion by {item.get('author')}" if item.get("author") else "")
            if url.startswith(("http://", "https://")):
                hits.append(Hit(url=url, title=f"{title} — Hacker News discussion", snippet=snippet))
        return hits


class RedditProvider:
    """Reddit search JSON (community discussions)."""

    name = "reddit"
    kind = "discussion"

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def search(self, query: str, limit: int) -> list[Hit]:
        response = await self._client.get(
            "https://www.reddit.com/search.json",
            params={"q": query, "limit": str(limit), "sort": "relevance"},
        )
        response.raise_for_status()
        children = ((response.json().get("data") or {}).get("children")) or []
        hits: list[Hit] = []
        for child in children[:limit]:
            data = child.get("data") or {}
            title = str(data.get("title") or "").strip()
            permalink = str(data.get("permalink") or "").strip()
            if not title or not permalink:
                continue
            subreddit = str(data.get("subreddit") or "").strip()
            selftext = str(data.get("selftext") or "").strip()
            snippet = selftext[:400] if selftext else (f"Discussion in r/{subreddit}" if subreddit else "")
            hits.append(Hit(url=f"https://www.reddit.com{permalink}", title=title, snippet=snippet))
        return hits


def _safe_query(query: str) -> str:
    """A query token safe for arXiv's search_query grammar."""
    return re.sub(r"[^a-zA-Z0-9+\-_:. ]+", " ", query).strip().replace(" ", "+")


def _make_soup(html: str):
    from bs4 import BeautifulSoup

    return BeautifulSoup(html, "lxml")


class WebSearchProvider:
    """Keyless multi-source web search: real URLs, titles, and snippets.

    ``mode`` "avalanche" (default) fans out to every provider in parallel so
    results span papers, documentation, code, and discussions. ``mode``
    "simple" uses a single serial provider chain (handy for constrained
    environments) — the normal mode is the concurrent fan-out.
    """

    name = "web"

    def __init__(
        self,
        *,
        timeout_seconds: float = 12.0,
        connect_timeout: float = 8.0,
        github_budget: int = 6,
        user_agent: str = _BROWSER_UA,
    ) -> None:
        self._timeout = timeout_seconds
        self._connect_timeout = connect_timeout
        self._user_agent = user_agent
        self._github_budget = github_budget
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                follow_redirects=True,
                timeout=httpx.Timeout(self._timeout, connect=self._connect_timeout),
                headers={"User-Agent": self._user_agent, "Accept-Language": "en-US,en;q=0.8"},
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
                http2=False,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _providers(self) -> list:
        client = self._get_client()
        return [
            DdgProvider(client),
            WikipediaProvider(client),
            ArxivProvider(client),
            CrossrefProvider(client),
            GithubProvider(client, budget=self._github_budget),
            StackExchangeProvider(client),
            HackerNewsProvider(client),
            RedditProvider(client),
        ]

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        per_provider = max(2, min(limit, 8))
        providers = self._providers()

        async def run_one(provider) -> list[SearchResult]:
            try:
                hits = await provider.search(query, per_provider)
            except httpx.HTTPError as exc:
                logger.info("search provider %s failed for %r (%s)", provider.name, query, exc)
                return []
            except Exception as exc:  # noqa: BLE001 - any provider bug must not abort
                logger.warning("search provider %s errored for %r (%s)", provider.name, query, exc)
                return []
            scored = list(zip(hits, _decaying_scores(len(hits)), strict=False))
            results = []
            for hit, score in scored:
                hit.score = score
                result = _result(hit, query)
                if result is not None:
                    results.append(result)
            return results

        batches = await _gather_with_limits([run_one(provider) for provider in providers])
        merged: list[SearchResult] = []
        for batch in batches:
            merged.extend(batch)
        return dedupe_results(merged)[: max(limit * 2, 12)]


async def _gather_with_limits(awaitables, concurrency: int = 6):
    import asyncio

    semaphore = asyncio.Semaphore(concurrency)

    async def guarded(awaitable):
        async with semaphore:
            return await awaitable

    return await asyncio.gather(*(guarded(a) for a in awaitables))


def build_web_provider(**kwargs) -> WebSearchProvider:
    """Factory used when no search API key is configured."""
    return WebSearchProvider(**kwargs)