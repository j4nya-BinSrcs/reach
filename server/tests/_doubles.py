"""Test-only doubles. These live in tests/ and are not product code."""

import httpx

from app.search.base import SearchProvider
from app.search.models import SearchResult
from app.search.utils import extract_domain
from app.sources.fetcher import SourceFetcher

_SCRIPTED_HTML = (
    "<!doctype html><html><head><title>Scripted Source</title></head>"
    "<body><h1>Scripted Source</h1>"
    "<p>This is a realistic research source about privacy-focused search engines built in Rust. "
    "It discusses inverted indexes, Tantivy, and quickwit-oss performance.</p>"
    "<p>Will these runtimes converge on a single standard remains an open question, "
    "and whether async runtimes can match C++ throughput is unresolved.</p>"
    "<p>Key technologies include Rust, async runtimes, and full-text search libraries.</p>"
    "</body></html>"
)


class ScriptedSearchProvider(SearchProvider):
    """Deterministic, offline search double for hermetic pipeline tests."""

    name = "scripted"

    def __init__(self, results_per_query: int = 8) -> None:
        self._results_per_query = results_per_query

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        count = max(1, min(limit, self._results_per_query))
        return [
            SearchResult(
                title=f"Scripted result {i} for {query[:40]}",
                url=f"https://example.com/scripted/{i}-{query.replace(' ', '-').lower()[:30]}",
                snippet=f"Content about {query}.",
                source_domain=extract_domain(f"https://example.com/scripted/{i}"),
                score=max(0.0, 1.0 - i * 0.05),
                query=query,
            )
            for i in range(1, count + 1)
        ]


def scripted_fetcher(max_bytes: int = 300_000, timeout_seconds: float = 15.0) -> SourceFetcher:
    """SourceFetcher bound to a transport that returns realistic HTML for any URL."""
    return SourceFetcher(
        max_bytes=max_bytes,
        timeout_seconds=timeout_seconds,
        transport=httpx.MockTransport(lambda _request: httpx.Response(200, headers={"Content-Type": "text/html"}, content=_SCRIPTED_HTML)),
    )
