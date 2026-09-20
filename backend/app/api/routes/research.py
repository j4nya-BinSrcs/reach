"""Research API endpoints: start, status, full-session retrieval, comparisons, workspace."""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.models.finding import SourceComparison
from app.models.research import ProgressUpdate, ResearchSessionDetail, StartResearchRequest
from app.models.source import Source, SourceAnalysis
from app.services.research_service import ResearchService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/research", tags=["research"])


class CompareSourcesRequest(BaseModel):
    """Request body for comparing two sources of a session."""

    source_a_id: int = Field(..., ge=1)
    source_b_id: int = Field(..., ge=1)


class UpdateSourceRequest(BaseModel):
    """Partial update of a source's workspace properties."""

    starred: bool | None = None
    saved: bool | None = None
    note: str | None = None
    tags: list[str] | None = None


def _service(request: Request) -> ResearchService:
    return request.app.state.research_service


@router.post("", status_code=status.HTTP_201_CREATED)
async def start_research(payload: StartResearchRequest, request: Request) -> dict:
    """Start a research session for the given objective."""
    try:
        session = await _service(request).start(payload.objective)
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    return {"session_id": session.id}


@router.get("/{session_id}/status", response_model=ProgressUpdate)
async def research_status(session_id: str, request: Request) -> ProgressUpdate:
    """Poll the live progress of a research session."""
    update = _service(request).get_status(session_id)
    if update is None:
        raise HTTPException(status_code=404, detail="Research session not found")
    return update


@router.get("/{session_id}", response_model=ResearchSessionDetail)
async def get_research_session(session_id: str, request: Request) -> ResearchSessionDetail:
    """Retrieve the complete research workspace payload."""
    detail = _service(request).get_detail(session_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Research session not found")
    return detail


@router.post("/{session_id}/compare", response_model=SourceComparison)
async def compare_sources(session_id: str, payload: CompareSourcesRequest, request: Request) -> SourceComparison:
    """Compare two sources of a session: similarities, differences, contradictions."""
    try:
        return await _service(request).compare_sources(session_id, payload.source_a_id, payload.source_b_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{session_id}/comparisons", response_model=list[SourceComparison])
async def list_comparisons(session_id: str, request: Request) -> list[SourceComparison]:
    """List all persisted comparisons for a session."""
    return _service(request).get_comparisons(session_id)


@router.get("/{session_id}/report", response_class=PlainTextResponse)
async def get_report(session_id: str, request: Request) -> str:
    """Return the detailed markdown research report for a session."""
    report = _service(request).get_report(session_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not ready or session not found")
    return report.markdown


@router.get("/{session_id}/workspace", response_model=list[Source])
async def list_workspace_sources(
    session_id: str, request: Request, starred: bool = False, saved: bool = False
) -> list[Source]:
    """List session sources, optionally filtered to starred/saved workspace items."""
    service = _service(request)
    if service.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Research session not found")
    return service.get_workspace_sources(session_id, starred=starred, saved=saved)


@router.patch("/{session_id}/sources/{source_id}", response_model=Source)
async def update_source(
    session_id: str, source_id: int, payload: UpdateSourceRequest, request: Request
) -> Source:
    """Mark, save, annotate, or tag a single session source."""
    try:
        return _service(request).update_source_workspace(
            session_id,
            source_id,
            starred=payload.starred,
            saved=payload.saved,
            note=payload.note,
            tags=payload.tags,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{session_id}/sources/{source_id}/summarize", response_model=SourceAnalysis)
async def summarize_source(session_id: str, source_id: int, request: Request) -> SourceAnalysis:
    """Produce a focused, self-contained summary of a single source."""
    try:
        return await _service(request).summarize_source(session_id, source_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc