"""Research service: the single orchestrator behind the API.

Coordinates the planner, researcher, and synthesizer against SQLite while
persisting progress so clients can poll status and render a workspace.
Research runs are lightweight in-process ``asyncio`` tasks — no workers.
"""

import asyncio
import logging

from app.agent.comparator import SourceComparator
from app.agent.planner import Planner
from app.agent.report_writer import ReportWriter
from app.agent.researcher import Researcher
from app.agent.synthesizer import Synthesizer
from app.config import Settings
from app.llm.provider import build_llm_provider
from app.models.finding import ResearchSynthesis, SourceComparison, SourceComparisonResult
from app.models.report import ResearchReport
from app.models.research import (
    ProgressUpdate,
    ResearchSession,
    ResearchSessionDetail,
    SessionStatus,
)
from app.models.source import Source, SourceAnalysis, SourceFetchStatus
from app.search.provider import build_search_provider
from app.sources.analyzer import SourceAnalyzer
from app.sources.fetcher import SourceFetcher
from app.storage.database import init_db
from app.storage.repositories import (
    ComparisonRepository,
    FindingRepository,
    SessionRepository,
    SourceRepository,
)

logger = logging.getLogger(__name__)

MAX_CONCURRENT_RUNS = 16

_STAGE_PROGRESS = {
    SessionStatus.PLANNING: 5,
    SessionStatus.SEARCHING: 20,
    SessionStatus.FILTERING: 40,
    SessionStatus.FETCHING: 60,
    SessionStatus.ANALYZING: 82,
    SessionStatus.SYNTHESIZING: 95,
    SessionStatus.COMPLETE: 100,
}

_MESSAGES = {
    SessionStatus.PLANNING: "Understanding objective and generating research queries",
    SessionStatus.SEARCHING: "Discovering relevant sources across the web",
    SessionStatus.FILTERING: "Filtering and ranking candidate sources",
    SessionStatus.FETCHING: "Fetching selected sources",
    SessionStatus.ANALYZING: "Analyzing source content",
    SessionStatus.SYNTHESIZING: "Building the research brief and open questions",
}


class ResearchService:
    """Orchestrates research sessions and exposes typed read/write helpers."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        db = settings.database_absolute_path
        init_db(db)
        self._sessions = SessionRepository(db)
        self._sources = SourceRepository(db)
        self._findings = FindingRepository(db)
        self._comparisons = ComparisonRepository(db)
        self._runs: dict[str, asyncio.Task] = {}

    # --- read/write helpers --------------------------------------------------

    async def start(self, objective: str) -> ResearchSession:
        """Create a session row and launch the async research pipeline."""
        if len(self._runs) >= MAX_CONCURRENT_RUNS:
            raise RuntimeError("Too many research sessions in flight; try again shortly.")
        session = await asyncio.to_thread(self._sessions.create_session, objective)
        task = asyncio.create_task(self._run(session.id))
        self._runs[session.id] = task
        return session

    def get_session(self, session_id: str) -> ResearchSession | None:
        return self._sessions.get_session(session_id)

    def get_status(self, session_id: str) -> ProgressUpdate | None:
        session = self._sessions.get_session(session_id)
        if session is None:
            return None
        return ProgressUpdate(status=session.status, progress=session.progress, message=session.message or _MESSAGES.get(session.status, ""))

    def get_detail(self, session_id: str) -> ResearchSessionDetail | None:
        """Assemble the full workspace payload for a session."""
        session = self._sessions.get_session(session_id)
        if session is None:
            return None
        sources = self._sources.get_sources(session_id)
        findings = self._findings.get_findings(session_id)
        gaps = self._findings.get_gaps(session_id)
        synthesis = self._sessions.get_synthesis(session_id)
        comparisons = self._comparisons.get_comparisons(session_id)
        report = self._sessions.get_report(session_id)
        return ResearchSessionDetail(
            **session.model_dump(),
            queries=self._sessions.get_queries(session_id),
            sources=[source.model_dump() for source in sources],
            findings=[finding.model_dump() for finding in findings],
            gaps=[gap.model_dump() for gap in gaps],
            summary=synthesis.model_dump() if synthesis else {},
            comparisons=[comparison.model_dump() for comparison in comparisons],
            report=report.model_dump() if report else None,
        )

    async def compare_sources(self, session_id: str, source_a_id: int, source_b_id: int) -> SourceComparison:
        """Run and persist a pairwise comparison of two session sources."""
        session = self._sessions.get_session(session_id)
        if session is None:
            raise ValueError("Research session not found")
        source_a = self._sources.get_source(session_id, source_a_id)
        source_b = self._sources.get_source(session_id, source_b_id)
        if source_a is None or source_b is None:
            raise ValueError("One or both sources do not belong to this session")

        settings = self._settings
        llm = build_llm_provider(
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            mock_mode=settings.mock_mode,
        )
        try:
            result: SourceComparisonResult = await SourceComparator(llm=llm).compare(session.objective, source_a, source_b)
        finally:
            await llm.close()

        comparison = SourceComparison(
            session_id=session_id,
            source_a_id=source_a_id,
            source_b_id=source_b_id,
            result=result,
        )
        comparison.id = self._comparisons.add_comparison(comparison)
        return comparison

    def get_comparisons(self, session_id: str) -> list[SourceComparison]:
        return self._comparisons.get_comparisons(session_id)

    def get_report(self, session_id: str) -> ResearchReport | None:
        return self._sessions.get_report(session_id)

    # --- workspace -----------------------------------------------------------

    def get_workspace_sources(
        self, session_id: str, starred: bool = False, saved: bool = False
    ) -> list[Source]:
        return self._sources.get_sources_workspace(session_id, starred=starred, saved=saved)

    def update_source_workspace(
        self,
        session_id: str,
        source_id: int,
        starred: bool | None = None,
        saved: bool | None = None,
        note: str | None = None,
        tags: list[str] | None = None,
    ) -> Source:
        """Mark, save, annotate, or tag a single session source."""
        source = self._sources.get_source(session_id, source_id)
        if source is None:
            raise ValueError("Source not found in this session")
        if starred is not None:
            source.starred = starred
        if saved is not None:
            source.saved = saved
        if note is not None:
            source.note = note
        if tags is not None:
            source.tags = tags
        self._sources.update_source(source)
        return source

    async def summarize_source(self, session_id: str, source_id: int) -> SourceAnalysis:
        """Produce a focused, self-contained summary of a single source."""
        source = self._sources.get_source(session_id, source_id)
        if source is None:
            raise ValueError("Source not found in this session")
        session = self._sessions.get_session(session_id)
        settings = self._settings
        llm = build_llm_provider(
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            mock_mode=settings.mock_mode,
        )
        try:
            return await SourceAnalyzer(llm=llm).analyze(source, session.objective)
        finally:
            await llm.close()

    # --- pipeline ------------------------------------------------------------

    async def _run(self, session_id: str) -> None:
        try:
            await self._pipeline(session_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("research run %s failed", session_id)
            message = getattr(exc, "message", "") or str(exc)
            await asyncio.to_thread(
                self._sessions.set_error,
                session_id,
                f"Research could not be completed: {message[:200]}" if message else "Research pipeline failed unexpectedly. Please retry.",
            )
        finally:
            self._runs.pop(session_id, None)

    async def _pipeline(self, session_id: str) -> None:
        settings = self._settings
        session = self._sessions.get_session(session_id)
        objective = session.objective

        llm = build_llm_provider(
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            mock_mode=settings.mock_mode,
        )
        search = build_search_provider(
            provider_name=settings.search_provider,
            api_key=settings.search_api_key,
            results_per_query=settings.search_results_per_query,
            mock_mode=settings.mock_mode,
        )
        transport = SourceFetcher.mock_transport() if settings.mock_mode == "mock" else None
        fetcher = SourceFetcher(
            max_bytes=settings.fetch_max_bytes,
            timeout_seconds=settings.fetch_timeout_seconds,
            transport=transport,
        )

        # PLANNING
        await self._set(session_id, SessionStatus.PLANNING)
        queries = await Planner(llm=llm, max_queries=settings.search_max_queries).plan(objective)
        await asyncio.to_thread(self._sessions.add_queries, session_id, [query.query for query in queries])

        # SEARCH + FILTER
        await self._set(session_id, SessionStatus.SEARCHING)
        researcher = Researcher(search=search, llm=llm, fetcher=fetcher)
        selected, stats = await researcher.discover(
            objective, queries, results_per_query=settings.search_results_per_query
        )
        await self._set(session_id, SessionStatus.FILTERING)
        await asyncio.to_thread(self._persist_selected, session_id, selected)

        # FETCH
        await self._set(session_id, SessionStatus.FETCHING)
        await researcher.fetch_sources(selected, objective)
        await asyncio.to_thread(self._persist_fetch_updates, selected)

        # ANALYZE
        await self._set(session_id, SessionStatus.ANALYZING)
        await researcher.analyze_sources(selected, objective)
        await asyncio.to_thread(self._persist_analyses, selected)

        # SYNTHESIZE
        await self._set(session_id, SessionStatus.SYNTHESIZING)
        sources_with_ids = self._sources.get_sources(session_id)
        findings, gaps, synthesis = await Synthesizer(llm=llm).synthesize(objective, sources_with_ids)
        await asyncio.to_thread(self._persist_synthesis, session_id, findings, gaps, synthesis)

        # REPORT
        report = await ReportWriter(llm=llm).write(objective, sources_with_ids, findings, gaps, synthesis)
        await asyncio.to_thread(self._sessions.save_report, session_id, report)

        await self._set(session_id, SessionStatus.COMPLETE)
        logger.info("research session %s complete (%d sources)", session_id, stats.selected)

    async def _set(self, session_id: str, status: SessionStatus, message: str | None = None) -> None:
        await asyncio.to_thread(
            self._sessions.update_status,
            session_id,
            status,
            _STAGE_PROGRESS.get(status, 0),
            message or _MESSAGES.get(status, ""),
        )

    def _persist_selected(self, session_id: str, selected: list[Source]) -> None:
        ids = self._sources.add_sources(session_id, selected)
        for source_id, source in zip(ids, selected, strict=False):
            source.id = source_id

    def _persist_fetch_updates(self, selected: list[Source]) -> None:
        for source in selected:
            if source.id is not None:
                self._sources.update_source(source)

    def _persist_analyses(self, selected: list[Source]) -> None:
        for source in selected:
            if source.id is not None and source.fetch_status in {SourceFetchStatus.FETCHED, SourceFetchStatus.PARTIAL}:
                self._sources.update_source(source)

    def _persist_synthesis(
        self,
        session_id: str,
        findings: list,
        gaps: list,
        synthesis: ResearchSynthesis,
    ) -> None:
        self._findings.add_findings(session_id, findings)
        self._findings.add_gaps(session_id, gaps)
        self._sessions.save_synthesis(session_id, synthesis)