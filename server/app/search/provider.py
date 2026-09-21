"""Concrete search provider implementations and factory.

The Tavily provider is the default external source; the mock provider
produces deterministic, clearly fake results so the pipeline and tests can
run without any API keys (``REACH_MOCK_MODE=mock``).
"""

import logging

import httpx

from app.search.base import SearchProvider
from app.search.models import SearchResult
from app.search.utils import extract_domain
from app.search.web_provider import WebSearchProvider

logger = logging.getLogger(__name__)

TAVILY_ENDPOINT = "https://api.tavily.com/search"


class TavilySearchProvider(SearchProvider):
    """Search backend backed by the Tavily API."""

    name = "tavily"

    def __init__(self, api_key: str, base_url: str = TAVILY_ENDPOINT) -> None:
        if not api_key:
            raise ValueError("Tavily provider requires an API key")
        self._api_key = api_key
        self._base_url = base_url
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=httpx.Timeout(20.0, connect=10.0),
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        body = {
            "query": query,
            "max_results": limit,
            "search_depth": "basic",
            "include_answer": False,
            "include_raw_content": False,
        }
        response = await self._get_client().post(self._base_url, json=body)
        response.raise_for_status()
        payload = response.json()
        raw_results = payload.get("results") or []
        results: list[SearchResult] = []
        for raw in raw_results:
            if not isinstance(raw, dict):
                continue
            url = str(raw.get("url") or "").strip()
            if not url:
                continue
            results.append(
                SearchResult(
                    title=str(raw.get("title") or url).strip(),
                    url=url,
                    snippet=str(raw.get("content") or "").strip()[:600],
                    source_domain=extract_domain(url),
                    score=raw.get("score"),
                    query=query,
                )
            )
        return results


class MockSearchProvider(SearchProvider):
    """Deterministic fake search provider for development and tests.

    Generates plausible-looking results per query. Clearly not real content;
    it exists so the full pipeline can be exercised without network access.
    """

    name = "mock"

    def __init__(self, results_per_query: int = 8) -> None:
        self._results_per_query = results_per_query

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        count = max(1, min(limit, self._results_per_query))
        results = [self._build(query, index) for index in range(1, count + 1)]
        return results

    @staticmethod
    def _build(query: str, index: int) -> SearchResult:
        template = _TEMPLATES[index % len(_TEMPLATES)]
        return SearchResult(
            title=f"{template['title']} — {query[:48]}",
            url=f"https://{template['host']}/{index}-{query.replace(' ', '-').lower()[:40]}",
            snippet=f"\"{query}\" — {template['blurb']}",
            source_domain=template["host"],
            score=max(0.0, 1.0 - index * 0.08),
            query=query,
        )


_TEMPLATES: list[dict[str, str]] = [
    {"host": "en.wikipedia.org", "title": "Encyclopedia article", "blurb": "A broad overview article on this topic."},
    {"host": "arxiv.org", "title": "Research paper", "blurb": "An academic paper on this topic."},
    {"host": "github.com", "title": "Project repository", "blurb": "A public project or working files related to this topic."},
    {"host": "archive.org", "title": "Archival document", "blurb": "Primary or historical material on this topic."},
    {"host": "semanticscholar.org", "title": "Scholarly review", "blurb": "A scholarly paper or review on this topic."},
    {"host": "press.example.com", "title": "News article", "blurb": "A journalism piece covering recent developments."},
]


def build_search_provider(
    provider_name: str,
    api_key: str,
    results_per_query: int = 10,
    mock_mode: str = "off",
) -> SearchProvider:
    """Construct the configured search provider.

    Resolution order:

    - ``mock_mode == "mock"`` → deterministic offline provider (test/demo only;
      never the product default).
    - ``provider_name == "tavily"`` with a key → live Tavily API.
    - otherwise → the real keyless :class:`WebSearchProvider`, which searches
      public endpoints (DuckDuckGo, Wikipedia, arXiv, Crossref, GitHub,
      StackExchange, Hacker News, Reddit) with no API key and never fabricates
      results.
    """
    if mock_mode == "mock":
        return MockSearchProvider(results_per_query=results_per_query)
    known = {"tavily", "web", "keyless", "auto"}
    if provider_name not in known:
        raise ValueError(f"unknown search provider: {provider_name!r}")
    if provider_name == "tavily" and api_key:
        return TavilySearchProvider(api_key=api_key)
    if provider_name == "tavily":
        logger.warning("tavily requested but no API key configured; falling back to keyless web search")
    return WebSearchProvider()