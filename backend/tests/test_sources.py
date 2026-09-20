"""Source processing tests: classification, parsing, and bounded fetching."""

import httpx
import pytest

from app.models.source import SourceFetchStatus, SourceType
from app.sources.classifier import classify_source
from app.sources.fetcher import SourceFetcher
from app.sources.parser import parse_content


class TestClassifier:
    @pytest.mark.parametrize(
        ("url", "title", "expected"),
        [
            ("https://github.com/quickwit-oss/tantivy", "Tantivy", SourceType.GITHUB),
            ("https://arxiv.org/abs/2301.01330", "A paper", SourceType.PAPER),
            ("https://aclanthology.org/2021.foo.1/", "Paper", SourceType.PAPER),
            ("https://docs.rs/tantivy", "tantivy docs", SourceType.DOCUMENTATION),
            ("https://readthedocs.io/projects/foo", "Foo docs", SourceType.DOCUMENTATION),
            ("https://docs.example.com/guide", "Guide", SourceType.DOCUMENTATION),
            ("https://developer.mozilla.org/en-US/docs/Web/API", "MDN", SourceType.DOCUMENTATION),
            ("https://crates.io/crates/tantivy", "crates.io", SourceType.TOOL),
            ("https://pypi.org/project/whoosh/", "PyPI", SourceType.TOOL),
            ("https://gitlab.com/group/project", "GitLab", SourceType.PROJECT),
            ("https://medium.com/@user/post", "A blog post", SourceType.ARTICLE),
            ("https://example.com/unknown", "Something", SourceType.OTHER),
        ],
        ids=["github", "arxiv", "acl-paper", "docs-rs", "readthedocs", "docs-subdomain", "mdn", "crates", "pypi", "gitlab", "medium", "other"],
    )
    def test_deterministic_classification(self, url: str, title: str, expected: SourceType) -> None:
        assert classify_source(url, title) is expected

    def test_title_heuristic_when_domain_is_neutral(self) -> None:
        assert classify_source("https://example.com/package", "Official Documentation") is SourceType.DOCUMENTATION


class TestParser:
    def test_parses_html(self) -> None:
        html = (
            "<!doctype html><html><head><title>My Page</title>"
            "<meta name='description' content='A description'>"
            "</head><body><script>bad()</script><p>Hello    world.</p><h1>Title</h1><ul><li>Item A</li><li>Item B</li></ul></body></html>"
        )
        parsed = parse_content(html, content_type="text/html")
        assert parsed.title == "My Page"
        assert parsed.description == "A description"
        assert "bad()" not in parsed.text
        assert "Hello world." in parsed.text
        assert "Item A" in parsed.text and "Item B" in parsed.text

    def test_parses_plain_text(self) -> None:
        parsed = parse_content("line one\nline two", content_type="text/plain")
        assert parsed.text == "line one\nline two"

    def test_truncates_to_max_length(self) -> None:
        parsed = parse_content("x" * 50_000, content_type="text/plain", max_length=200)
        assert len(parsed.text) == 200

    def test_empty_input(self) -> None:
        parsed = parse_content("", content_type="text/html")
        assert parsed.text == ""

    def test_decodes_bytes(self) -> None:
        raw = "Café au lait".encode("utf-8")
        parsed = parse_content(raw, content_type="text/plain; charset=utf-8")
        assert "Café au lait" in parsed.text


class TestFetcher:
    def _transport(self, handler):
        return httpx.MockTransport(handler)

    @pytest.mark.asyncio
    async def test_fetches_and_parses_html(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                headers={"Content-Type": "text/html"},
                content="<html><head><title>Doc</title></head><body><p>Body text</p></body></html>",
                request=request,
            )

        fetcher = SourceFetcher(transport=self._transport(handler))
        outcome = await fetcher.fetch("https://example.com/doc")
        assert outcome.status is SourceFetchStatus.FETCHED
        assert outcome.content.title == "Doc"
        assert "Body text" in outcome.content.text

    @pytest.mark.asyncio
    async def test_failed_status_code(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(404, request=request)

        fetcher = SourceFetcher(transport=self._transport(handler), timeout_seconds=5.0)
        outcome = await fetcher.fetch("https://example.com/missing")
        assert outcome.status is SourceFetchStatus.FAILED
        assert "404" in outcome.error

    @pytest.mark.asyncio
    async def test_partial_when_oversized(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                headers={"Content-Type": "text/plain"},
                content=b"x" * 100_000,
                request=request,
            )

        fetcher = SourceFetcher(transport=self._transport(handler), max_bytes=1_000)
        outcome = await fetcher.fetch("https://example.com/big")
        assert outcome.status is SourceFetchStatus.PARTIAL

    @pytest.mark.asyncio
    async def test_blocks_non_http_scheme(self) -> None:
        fetcher = SourceFetcher()
        outcome = await fetcher.fetch("javascript:alert(1)")
        assert outcome.status is SourceFetchStatus.FAILED
        assert "scheme" in outcome.error

    @pytest.mark.asyncio
    async def test_timeout_yields_failed(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("simulated timeout", request=request)

        fetcher = SourceFetcher(transport=self._transport(handler), timeout_seconds=0.05)
        outcome = await fetcher.fetch("https://example.com/slow")
        assert outcome.status is SourceFetchStatus.FAILED

    @pytest.mark.asyncio
    async def test_caches_per_session(self) -> None:
        calls = {"count": 0}

        async def handler(request: httpx.Request) -> httpx.Response:
            calls["count"] += 1
            return httpx.Response(200, text="same", request=request)

        fetcher = SourceFetcher(transport=self._transport(handler))
        first = await fetcher.fetch("https://example.com/same?utm_source=x")
        second = await fetcher.fetch("https://example.com/same")
        assert first.status is SourceFetchStatus.FETCHED
        assert second.status is SourceFetchStatus.FETCHED
        assert calls["count"] == 1