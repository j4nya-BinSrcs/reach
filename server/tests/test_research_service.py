"""Research service unit tests (pipeline behavior beyond the HTTP layer)."""

import asyncio
from pathlib import Path

import pytest

from app.config import Settings
from app.models.research import ProgressUpdate, SessionStatus
from app.services.research_service import ResearchService


def _service(db_path: Path, **overrides) -> ResearchService:
    defaults = dict(mock_mode="mock", search_max_queries=4)
    defaults.update(overrides)
    settings = Settings(database_path=str(db_path), **defaults)
    return ResearchService(settings)


async def _wait_for_terminal(service: ResearchService, session_id: str, timeout: float = 15.0) -> SessionStatus:
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        session = service.get_session(session_id)
        if session is None:
            return SessionStatus.FAILED  # pragma: no cover
        if session.status in {SessionStatus.COMPLETE, SessionStatus.FAILED}:
            return session.status
        await asyncio.sleep(0.05)
    return SessionStatus.FAILED  # pragma: no cover


OBJECTIVE = "Build a privacy-focused search engine using Rust"


class TestResearchService:
    @pytest.mark.asyncio
    async def test_start_returns_planning_session(self, tmp_path: Path) -> None:
        service = _service(tmp_path / "a.db")
        session = await service.start(OBJECTIVE)
        assert session.status is SessionStatus.PLANNING
        assert session.progress == 0
        assert service.get_status(session.id) is not None
        await service._runs[session.id]

    def test_status_missing_session(self, tmp_path: Path) -> None:
        service = _service(tmp_path / "b.db")
        assert service.get_status("missing") is None

    def test_detail_missing_session(self, tmp_path: Path) -> None:
        service = _service(tmp_path / "c.db")
        assert service.get_detail("missing") is None

    @pytest.mark.asyncio
    async def test_mock_run_completes_and_persists(self, tmp_path: Path) -> None:
        service = _service(tmp_path / "d.db")
        session = await service.start(OBJECTIVE)
        status = await _wait_for_terminal(service, session.id)
        assert status is SessionStatus.COMPLETE

        detail = service.get_detail(session.id)
        assert detail is not None
        assert detail.status is SessionStatus.COMPLETE
        assert detail.progress == 100
        assert len(detail.queries) == 4
        assert 1 <= len(detail.sources) <= 15
        assert len(detail.findings) >= 1
        assert len(detail.gaps) >= 1
        assert detail.summary["overview"]
        assert detail.queries == service._sessions.get_queries(session.id)

    @pytest.mark.asyncio
    async def test_background_runs_are_tracked_and_released(self, tmp_path: Path) -> None:
        service = _service(tmp_path / "e.db")
        session = await service.start(OBJECTIVE)
        assert session.id in service._runs
        await _wait_for_terminal(service, session.id)
        assert session.id not in service._runs

    @pytest.mark.asyncio
    async def test_config_error_marks_session_failed(self, tmp_path: Path) -> None:
        """No keys and no mock mode means provider construction fails."""
        service = _service(tmp_path / "f.db", mock_mode="off", llm_api_key="", search_api_key="")
        session = await service.start(OBJECTIVE)
        status = await _wait_for_terminal(service, session.id, timeout=5.0)
        assert status is SessionStatus.FAILED
        failed = service.get_session(session.id)
        assert failed is not None
        assert failed.error

    @pytest.mark.asyncio
    async def test_concurrency_limit(self, tmp_path: Path, monkeypatch) -> None:
        import app.services.research_service as module

        monkeypatch.setattr(module, "MAX_CONCURRENT_RUNS", 1)
        service = _service(tmp_path / "g.db")
        fake = asyncio.create_task(asyncio.sleep(5))
        service._runs["fake"] = fake
        try:
            with pytest.raises(RuntimeError):
                await service.start(OBJECTIVE)
        finally:
            fake.cancel()
            service._runs.pop("fake", None)

    def test_progress_update_schema(self, tmp_path: Path) -> None:
        update = ProgressUpdate(status=SessionStatus.FETCHING, progress=60, message="Fetching")
        assert update.progress == 60