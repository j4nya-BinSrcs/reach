"""Search layer tests: normalization, deduplication, and real provider resolution."""

import pytest

from app.search.models import SearchResult
from app.search.provider import WebSearchProvider, build_search_provider
from app.search.utils import dedupe_results, extract_domain, normalize_url
from tests._doubles import ScriptedSearchProvider


class TestNormalizeUrl:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("https://GitHub.com/Tantivy/", "https://github.com/Tantivy"),
            ("https://github.com/tantivy/#readme", "https://github.com/tantivy"),
            (
                "https://example.com/page?utm_source=x&utm_medium=y&id=5",
                "https://example.com/page?id=5",
            ),
            ("https://example.com/a/b/", "https://example.com/a/b"),
            ("https://example.com/", "https://example.com"),
        ],
        ids=["case-host", "fragment", "tracking", "trailing-slash", "origin"],
    )
    def test_normalize(self, raw: str, expected: str) -> None:
        assert normalize_url(raw) == expected

    def test_keeps_weird_input(self) -> None:
        assert normalize_url("not a url") == "not a url"


class TestExtractDomain:
    @pytest.mark.parametrize(
        ("url", "expected"),
        [
            ("https://www.github.com/org/repo", "github.com"),
            ("https://ArXiv.org/abs/1234", "arxiv.org"),
            ("https://docs.rs/tantivy", "docs.rs"),
        ],
    )
    def test_domain(self, url: str, expected: str) -> None:
        assert extract_domain(url) == expected


class TestDedupeResults:
    def _result(self, url: str, title: str) -> SearchResult:
        return SearchResult(title=title, url=url)

    def test_dedupes_by_url_with_tracking(self) -> None:
        results = [
            self._result("https://example.com/a?utm_source=x", "A"),
            self._result("https://example.com/a", "A"),
        ]
        assert len(dedupe_results(results)) == 1

    def test_dedupes_duplicate_titles(self) -> None:
        results = [
            self._result("https://one.example.com/a", "Same Title Here"),
            self._result("https://two.example.com/b", "Same Title Here"),
        ]
        assert len(dedupe_results(results)) == 1

    def test_keeps_distinct_results(self) -> None:
        results = [
            self._result("https://one.example.com/a", "First"),
            self._result("https://two.example.com/b", "Second"),
        ]
        assert len(dedupe_results(results)) == 2


class TestScriptedProvider:
    @pytest.mark.asyncio
    async def test_returns_bounded_normalized_results(self) -> None:
        provider = ScriptedSearchProvider(results_per_query=8)
        results = await provider.search("rust privacy search engine", limit=10)
        assert len(results) == 8
        assert all(isinstance(result, SearchResult) for result in results)
        assert all(result.url.startswith("https://") for result in results)
        assert all(result.source_domain for result in results)
        assert all(result.query == "rust privacy search engine" for result in results)

    @pytest.mark.asyncio
    async def test_respects_limit(self) -> None:
        provider = ScriptedSearchProvider(results_per_query=8)
        results = await provider.search("x", limit=3)
        assert len(results) == 3


class TestKeylessProvider:
    def test_builds_keyless_web_provider_without_key(self) -> None:
        provider = build_search_provider("tavily", api_key="")
        assert isinstance(provider, WebSearchProvider)
        assert provider.name == "web"

    def test_unknown_provider_raises(self) -> None:
        with pytest.raises(ValueError):
            build_search_provider("nope", api_key="k")

    def test_tavily_requires_key(self) -> None:
        from app.search.provider import TavilySearchProvider

        with pytest.raises(ValueError):
            TavilySearchProvider(api_key="")
