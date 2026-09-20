"""Research agent orchestration: discovery, selection, fetching, analysis.

Single orchestrator with deterministic stages, mirroring the spec:

    SEARCH → FILTER → SELECT → FETCH → ANALYZE

The number of external calls is bounded (``queries x results_per_query``
searches, at most ``max_sources`` fetches/analyses). Failures degrade
per-item and never abort the whole research run.
"""

import asyncio
import logging

from pydantic import BaseModel

from app.llm.base import LLMProvider
from app.models.source import Source, SourceFetchStatus
from app.search.base import SearchProvider
from app.search.models import SearchQuery, SearchResult
from app.search.utils import dedupe_results, extract_domain, normalize_url
from app.sources.analyzer import SourceAnalyzer
from app.sources.classifier import classify_source
from app.sources.fetcher import SourceFetcher

logger = logging.getLogger(__name__)

_SEARCH_FAILED = object()


class DiscoveryStats(BaseModel):
    """Counts surfaced to the progress UI."""

    queries_run: int
    results_discovered: int
    candidates: int
    selected: int


_TYPE_QUALITY = {
    "paper": 1.0,
    "github": 0.9,
    "documentation": 0.85,
    "project": 0.75,
    "tool": 0.7,
    "article": 0.5,
    "other": 0.4,
}

_HIGH_QUALITY_DOMAINS = {
    "github.com",
    "arxiv.org",
    "docs.rs",
    "crates.io",
    "readthedocs.io",
    "developer.mozilla.org",
    "semanticscholar.org",
    "acm.org",
    "ieee.org",
}

_STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "for",
    "with",
    "using",
    "build",
    "build a",
    "want",
    "make",
    "find",
    "relevant",
    "information",
    "i",
    "to",
    "of",
    "in",
    "on",
    "about",
    "that",
    "this",
    "what",
    "research",
    "papers",
    "tools",
    "projects",
}


class SourceSelector:
    """Rank candidate sources and pick the strongest subset."""

    def __init__(self, min_sources: int = 8, max_sources: int = 15) -> None:
        self._min_sources = min_sources
        self._max_sources = max_sources

    def select(self, candidates: list[Source], objective: str) -> list[Source]:
        if not candidates:
            return []
        for source in candidates:
            source.relevance = self._relevance_score(source, objective)
        ranked = sorted(candidates, key=lambda source: source.relevance, reverse=True)
        target = min(self._max_sources, max(self._min_sources, int(len(candidates) * 0.35)))
        picked = [source for source in ranked if source.relevance >= 0.25][:target]
        if not picked and ranked:
            picked = ranked[: min(1, len(ranked))]
        return picked

    @staticmethod
    def _relevance_score(source: Source, objective: str) -> float:
        provider_score = source.relevance if source.relevance else 0.5
        type_score = _TYPE_QUALITY.get(source.source_type.value, 0.4)
        domain_score = 1.0 if source.domain in _HIGH_QUALITY_DOMAINS else 0.5
        overlap = _token_overlap(objective, f"{source.title} {source.snippet}")
        return max(0.0, min(1.0, 0.4 * provider_score + 0.25 * type_score + 0.15 * domain_score + 0.2 * overlap))


class Researcher:
    """Runs the discovery/fetch/analyze stages for a research session."""

    def __init__(
        self,
        search: SearchProvider,
        llm: LLMProvider,
        fetcher: SourceFetcher,
        *,
        concurrency: int = 5,
        min_sources: int = 8,
        max_sources: int = 15,
    ) -> None:
        self._search = search
        self._fetcher = fetcher
        self._analyzer = SourceAnalyzer(llm)
        self._selector = SourceSelector(min_sources=min_sources, max_sources=max_sources)
        self._concurrency = max(1, concurrency)

    async def discover(
        self,
        objective: str,
        queries: list[SearchQuery],
        results_per_query: int = 10,
    ) -> tuple[list[Source], DiscoveryStats]:
        """Run queries, normalize/dedupe results, and select strong sources."""
        raw_results = await self._run_searches(queries, results_per_query)
        candidates = self._build_candidates(raw_results)
        selected = self._selector.select(candidates, objective=objective)
        stats = DiscoveryStats(
            queries_run=len(queries),
            results_discovered=len(raw_results),
            candidates=len(candidates),
            selected=len(selected),
        )
        return selected, stats

    async def fetch_sources(self, sources: list[Source], objective: str) -> None:
        """Fetch all selected sources with bounded concurrency (in place)."""
        semaphore = asyncio.Semaphore(self._concurrency)

        async def fetch_one(source: Source) -> None:
            async with semaphore:
                outcome = await self._fetcher.fetch(source.url)
            source.fetch_status = outcome.status
            if outcome.content.title:
                source.title = outcome.content.title or source.title
            if outcome.content.description:
                source.description = outcome.content.description
            source.content = outcome.content.text

        await asyncio.gather(*(fetch_one(source) for source in sources))
        logger.info("fetch stage complete for %d sources", len(sources))

    async def analyze_sources(self, sources: list[Source], objective: str) -> None:
        """Analyze sources whose content is usable (in place)."""
        semaphore = asyncio.Semaphore(self._concurrency)

        async def analyze_one(source: Source) -> None:
            async with semaphore:
                source.analysis = await self._analyzer.analyze(source, objective)

        fetchable = [source for source in sources if source.fetch_status in {SourceFetchStatus.FETCHED, SourceFetchStatus.PARTIAL}]
        await asyncio.gather(*(analyze_one(source) for source in fetchable))
        for source in sources:
            if source.fetch_status not in {SourceFetchStatus.FETCHED, SourceFetchStatus.PARTIAL}:
                source.analysis.limitations.append("Source content was unavailable; not deeply analyzed.")

    async def _run_searches(self, queries: list[SearchQuery], results_per_query: int) -> list[SearchResult]:
        collected: list[SearchResult] = []

        async def run_one(query: SearchQuery) -> None:
            try:
                results = await self._search.search(query.query, limit=results_per_query)
            except Exception as exc:  # noqa: BLE001
                logger.warning("search query failed (%s): %s", query.query, exc)
                return
            for result in results:
                result.query = query.query
            collected.extend(results)

        await asyncio.gather(*(run_one(query) for query in queries))
        return collected

    def _build_candidates(self, raw_results: list[SearchResult]) -> list[Source]:
        deduped = dedupe_results(raw_results)
        candidates: list[Source] = []
        for result in deduped:
            url = normalize_url(result.url)
            if not url.startswith(("http://", "https://")):
                continue
            source_type = classify_source(url, result.title)
            candidates.append(
                Source(
                    session_id="",
                    url=url,
                    title=result.title or url,
                    source_type=source_type,
                    domain=extract_domain(url),
                    description=result.snippet[:500],
                    snippet=result.snippet,
                    relevance=result.score if result.score is not None else 0.0,
                )
            )
        return candidates


def _token_overlap(objective: str, text: str) -> float:
    """Rough lexical overlap between objective and candidate text (0..1)."""
    objective_tokens = {token for token in objective.lower().split() if token not in _STOPWORDS}
    text_tokens = {token for token in text.lower().split() if token not in _STOPWORDS}
    if not objective_tokens:
        return 0.0
    hits = objective_tokens & text_tokens
    return len(hits) / len(objective_tokens)