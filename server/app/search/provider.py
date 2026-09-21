"""Concrete search provider implementations and factory.

The Tavily provider is the keyed external source; the keyless web provider
queries public endpoints. Both return only real results.
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


def build_search_provider(
    provider_name: str,
    api_key: str,
    results_per_query: int = 10,
) -> SearchProvider:
    """Construct the real configured search provider.

    Resolution order:

    - ``provider_name == "tavily"`` with a key → live Tavily API.
    - otherwise → the real keyless :class:`WebSearchProvider`, which searches
      public endpoints (DuckDuckGo, Wikipedia, arXiv, Crossref, GitHub,
      StackExchange, Hacker News, Reddit) with no API key and never fabricates
      results.
    """
    known = {"tavily", "web", "keyless", "auto"}
    if provider_name not in known:
        raise ValueError(f"unknown search provider: {provider_name!r}")
    if provider_name == "tavily" and api_key:
        logger.info("search provider: tavily (live API, %d results/query)", results_per_query)
        return TavilySearchProvider(api_key=api_key)
    if provider_name == "tavily":
        logger.warning("tavily requested but no API key configured; falling back to keyless web search")
    logger.info("search provider: keyless web search (DuckDuckGo/Wikipedia/arXiv/GitHub/Crossref/StackExchange/HN/Reddit)")
    return WebSearchProvider()