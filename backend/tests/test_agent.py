"""Research agent tests: selection, discovery, fetching, and analysis."""

import httpx
import pytest

from app.agent.researcher import Researcher, SourceSelector
from app.llm.provider import MockLLMProvider
from app.models.source import Source, SourceAnalysis, SourceFetchStatus, SourceType
from app.search.base import SearchProvider
from app.search.models import SearchQuery, SearchResult
from app.sources.fetcher import SourceFetcher


class ScriptedSearch(SearchProvider):
    name = "scripted"

    def __init__(self, results_by_query: dict[str, list[SearchResult]]) -> None:
        self._results = results_by_query

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        return self._results.get(query, [])[:limit]


def _result(url: str, title: str = "Result", query: str = "q", score: float = 0.5) -> SearchResult:
    return SearchResult(title=title, url=url, snippet=f"snippet {title}", query=query, score=score)


class TestSourceSelector:
    def setup_method(self) -> None:
        self.selector = SourceSelector(min_sources=2, max_sources=4)
        self.objective = "privacy focused search engine in rust"

    def _source(self, url: str, score: float, source_type: SourceType) -> Source:
        return Source(
            session_id="s",
            url=url,
            title="title",
            snippet="rust search indexing privacy",
            relevance=score,
            source_type=source_type,
        )

    def test_ranks_quality_types_first(self) -> None:
        candidates = [
            self._source("https://blog.example.com/post", 0.5, SourceType.ARTICLE),
            self._source("https://arxiv.org/abs/1234", 0.5, SourceType.PAPER),
            self._source("https://github.com/org/tantivy", 0.5, SourceType.GITHUB),
        ]
        picked = self.selector.select(candidates, self.objective)
        kinds = [source.source_type for source in picked]
        assert SourceType.PAPER in kinds
        assert SourceType.GITHUB in kinds
        assert SourceType.ARTICLE not in kinds

    def test_respects_upper_bound(self) -> None:
        candidates = [self._source(f"https://example.com/site/{i}", 0.9, SourceType.GITHUB) for i in range(20)]
        picked = self.selector.select(candidates, self.objective)
        assert len(picked) <= 4

    def test_empty_candidates(self) -> None:
        assert self.selector.select([], self.objective) == []

    def test_keeps_at_least_one_when_poor(self) -> None:
        candidates = [self._source("https://u.example.com/x", 0.05, SourceType.OTHER)]
        picked = self.selector.select(candidates, self.objective)
        assert len(picked) >= 1

    def test_target_35_percent_between_bounds(self) -> None:
        candidates = [self._source(f"https://example.com/site/{i}", 0.8 - i * 0.01, SourceType.PAPER) for i in range(10)]
        picked = self.selector.select(candidates, self.objective)
        assert len(picked) == 3  # int(10 * 0.35)

    def test_selected_are_the_highest_relevance(self) -> None:
        candidates = [
            self._source(f"https://example.com/site/{i}", score, SourceType.PAPER)
            for i, score in enumerate([0.9, 0.2, 0.7, 0.4, 0.8, 0.1])
        ]
        picked = self.selector.select(candidates, self.objective)
        picked_urls = {source.url for source in picked}
        assert "https://example.com/site/0" in picked_urls  # 0.9
        assert "https://example.com/site/4" in picked_urls  # 0.8
        assert "https://example.com/site/5" not in picked_urls  # 0.1 dropped


class TestResearcher:
    def _researcher(self, search: SearchProvider, transport) -> Researcher:
        fetcher = SourceFetcher(transport=transport)
        return Researcher(search=search, llm=MockLLMProvider(), fetcher=fetcher, concurrency=4)

    @pytest.mark.asyncio
    async def test_discovery_dedupes_and_selects(self) -> None:
        queries = [SearchQuery(query="q1"), SearchQuery(query="q2")]
        search = ScriptedSearch(
            {
                "q1": [
                    _result("https://github.com/a/repo?utm_source=x", "Repo A", score=0.9),
                    _result("https://arxiv.org/abs/1", "Paper 1", score=0.8),
                    _result("https://blog.example.com/post", "Blog", score=0.5),
                ],
                "q2": [
                    _result("https://github.com/a/repo", "Repo A", score=0.9),  # duplicate
                    _result("https://example.com/junk", "Junk", score=0.1),
                ],
            }
        )
        researcher = self._researcher(search, transport=None)
        sources, stats = await researcher.discover("privacy focused search engine rust", queries)
        assert stats.queries_run == 2
        assert stats.results_discovered == 5
        assert stats.candidates == 4  # one URL duplicate removed
        urls = {source.url for source in sources}
        assert "https://github.com/a/repo" in urls
        assert "https://github.com/a/repo?utm_source=x" not in urls

    @pytest.mark.asyncio
    async def test_search_failure_does_not_kill_discovery(self) -> None:
        class ExplodingSearch(SearchProvider):
            name = "exploding"

            async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
                if query == "bad":
                    raise RuntimeError("search down")
                return [_result("https://github.com/good/repo", "Good", score=0.8)]

        queries = [SearchQuery(query="bad"), SearchQuery(query="good")]
        researcher = self._researcher(ExplodingSearch(), transport=None)
        sources, stats = await researcher.discover("topic", queries)
        assert stats.queries_run == 2
        assert len(sources) == 1
        assert sources[0].url == "https://github.com/good/repo"

    @pytest.mark.asyncio
    async def test_fetch_and_analyze_in_place(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                headers={"Content-Type": "text/html"},
                content="<html><head><title>Doc Title</title></head><body><p>Rust indexing body content</p></body></html>",
                request=request,
            )

        researcher = self._researcher(ScriptedSearch({}), transport=httpx.MockTransport(handler))
        source = Source(session_id="s", url="https://docs.rs/tantivy", title="Doc")
        await researcher.fetch_sources([source], "objective")
        assert source.fetch_status is SourceFetchStatus.FETCHED
        assert "Rust indexing" in source.content

        await researcher.analyze_sources([source], "objective")
        assert source.analysis.summary
        assert source.analysis.key_points
        assert source.analysis.why_relevant

    @pytest.mark.asyncio
    async def test_unfetchable_sources_are_not_analyzed(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, request=request)

        researcher = self._researcher(ScriptedSearch({}), transport=httpx.MockTransport(handler))
        source = Source(session_id="s", url="https://example.com/down")
        await researcher.fetch_sources([source], "objective")
        assert source.fetch_status is SourceFetchStatus.FAILED
        await researcher.analyze_sources([source], "objective")
        assert any("content was unavailable" in limitation for limitation in source.analysis.limitations)


class TestSourceAnalyzer:
    @pytest.mark.asyncio
    async def test_empty_source_yields_notice(self) -> None:
        from app.sources.analyzer import SourceAnalyzer

        analyzer = SourceAnalyzer(MockLLMProvider())
        source = Source(session_id="s", url="https://example.com/empty", content="")
        analysis = await analyzer.analyze(source, "objective")
        assert analysis is not None
        assert analysis.limitations
        assert not analysis.summary or "content" in analysis.summary.lower()