"""Domain models for research sessions."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class SessionStatus(str, Enum):
    """Lifecycle states of a research session."""

    PLANNING = "planning"
    SEARCHING = "searching"
    FILTERING = "filtering"
    FETCHING = "fetching"
    ANALYZING = "analyzing"
    SYNTHESIZING = "synthesizing"
    COMPLETE = "complete"
    FAILED = "failed"


class StartResearchRequest(BaseModel):
    """Request body for starting a research session."""

    objective: str = Field(..., min_length=8, max_length=1000)

    @field_validator("objective")
    @classmethod
    def _objective_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 8:
            raise ValueError("objective must be at least 8 characters")
        return stripped


class QueryPlan(BaseModel):
    """Structured output of the planner: a set of search queries."""

    queries: list[str] = Field(default_factory=list)


class ProgressUpdate(BaseModel):
    """A status snapshot surfaced to the frontend while research runs."""

    status: SessionStatus
    progress: int = Field(ge=0, le=100)
    message: str = ""


class ResearchSession(BaseModel):
    """A persisted research session."""

    id: str
    objective: str
    status: SessionStatus
    progress: int = 0
    message: str = ""
    error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ResearchSessionDetail(ResearchSession):
    """A full session payload used to render the research workspace."""

    queries: list[str] = Field(default_factory=list)
    sources: list = Field(default_factory=list)
    findings: list = Field(default_factory=list)
    gaps: list = Field(default_factory=list)
    summary: dict = Field(default_factory=dict)
    comparisons: list = Field(default_factory=list)
    report: dict | None = None