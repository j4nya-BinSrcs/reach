"""Source fetcher: bounded, failure-tolerant HTTP retrieval.

Fetched content is bounded in size and time, and is treated as untrusted
input. Only ``http``/``https`` URLs are fetched. Per-run caching prevents
re-fetching the same URL within one research session.
"""

import logging
from dataclasses import dataclass

import httpx

from app.models.source import SourceFetchStatus
from app.search.utils import normalize_url
from app.sources.parser import ParsedContent, parse_content

logger = logging.getLogger(__name__)


@dataclass
class FetchOutcome:
    """Result of fetching a single URL."""

    status: SourceFetchStatus
    content: ParsedContent
    error: str = ""


class SourceFetcher:
    """Bounded HTTP fetcher with a session-local cache."""

    def __init__(
        self,
        max_bytes: int = 300_000,
        timeout_seconds: float = 15.0,
        max_text_length: int = 12_000,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._max_bytes = max_bytes
        self._timeout = timeout_seconds
        self._max_text_length = max_text_length
        self._transport = transport
        self._cache: dict[str, FetchOutcome] = {}
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                follow_redirects=True,
                timeout=httpx.Timeout(self._timeout, connect=10.0),
                headers={"User-Agent": "REACH-research/0.1 (+research-intelligence prototype)"},
                limits=httpx.Limits(max_connections=8, max_keepalive_connections=4),
                transport=self._transport,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def fetch(self, url: str) -> FetchOutcome:
        """Fetch and parse *url*, consulting the session-local cache first."""
        cache_key = normalize_url(url)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        if not self._allowed_scheme(url):
            outcome = FetchOutcome(status=SourceFetchStatus.FAILED, content=ParsedContent(), error="blocked scheme")
            self._cache[cache_key] = outcome
            return outcome

        outcome = await self._fetch_remote(url)
        self._cache[cache_key] = outcome
        return outcome

    async def _fetch_remote(self, url: str) -> FetchOutcome:
        try:
            async with self._get_client().stream("GET", url, headers={"Accept": "text/html,text/plain,*/*"}) as response:
                if response.status_code >= 400:
                    return FetchOutcome(
                        status=SourceFetchStatus.FAILED,
                        content=ParsedContent(),
                        error=f"HTTP {response.status_code}",
                    )
                content_type = response.headers.get("content-type", "")
                chunks = bytearray()
                async for chunk in response.aiter_bytes():
                    chunks.extend(chunk)
                    if len(chunks) > self._max_bytes:
                        return FetchOutcome(
                            status=SourceFetchStatus.PARTIAL,
                            content=ParsedContent(),
                            error="content exceeded fetch limit",
                        )
        except httpx.TimeoutException:
            return FetchOutcome(status=SourceFetchStatus.FAILED, content=ParsedContent(), error="connection timed out")
        except httpx.HTTPError as exc:
            return FetchOutcome(status=SourceFetchStatus.FAILED, content=ParsedContent(), error=str(exc)[:200])

        parsed = parse_content(bytes(chunks), content_type, max_length=self._max_text_length)
        if not parsed.text.strip():
            return FetchOutcome(
                status=SourceFetchStatus.PARTIAL,
                content=ParsedContent(title=parsed.title, description=parsed.description),
                error="no readable content extracted",
            )
        return FetchOutcome(status=SourceFetchStatus.FETCHED, content=parsed)

    @staticmethod
    def _allowed_scheme(url: str) -> bool:
        scheme = url.split(":", 1)[0].lower()
        return scheme in {"http", "https"}