"""Research API endpoints: start, status, and full-session retrieval."""

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.models.research import (
    ProgressUpdate,
    ResearchSession,
    ResearchSessionDetail,
    StartResearchRequest,
)
from app.services.research_service import ResearchService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/research", tags=["research"])


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