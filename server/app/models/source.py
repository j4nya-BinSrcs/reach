"""Domain models for research sources and their analysis."""

import json
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    """Semantic categories used to help users recognize source kinds instantly."""

    PAPER = "paper"
    GITHUB = "github"
    DOCUMENTATION = "documentation"
    TOOL = "tool"
    PROJECT = "project"
    ARTICLE = "article"
    DISCUSSION = "discussion"
    OTHER = "other"


class SourceFetchStatus(str, Enum):
    """How far fetching succeeded for a given source."""

    PENDING = "pending"
    FETCHED = "fetched"
    PARTIAL = "partial"
    FAILED = "failed"
    SKIPPED = "skipped"


class SourceAnalysis(BaseModel):
    """Structured analysis produced for a single source.

    Everything here is grounded in the fetched source content; the analyzer
    is not allowed to invent facts beyond the material it receives.
    """

    summary: str = ""
    key_points: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    concepts: list[str] = Field(default_factory=list)
    why_relevant: str = ""
    limitations: list[str] = Field(default_factory=list)


class Source(BaseModel):
    """A discovered and persisted research source."""

    id: int | None = None
    session_id: str
    url: str
    title: str = ""
    source_type: SourceType = SourceType.OTHER
    domain: str = ""
    description: str = ""
    snippet: str = ""
    relevance: float = Field(default=0.0, ge=0.0, le=1.0)
    content: str = ""
    fetch_status: SourceFetchStatus = SourceFetchStatus.PENDING
    analysis: SourceAnalysis = Field(default_factory=SourceAnalysis)
    starred: bool = False
    saved: bool = False
    note: str = ""
    tags: list[str] = Field(default_factory=list)
    created_at: datetime | None = None

    def model_dump_stored(self) -> dict:
        """Shape for persistence (analysis stored as JSON)."""
        return {
            "session_id": self.session_id,
            "url": self.url,
            "title": self.title,
            "source_type": self.source_type.value,
            "domain": self.domain,
            "description": self.description,
            "snippet": self.snippet,
            "relevance": self.relevance,
            "content": self.content,
            "fetch_status": self.fetch_status.value,
            "analysis": self.analysis.model_dump_json(),
            "starred": self.starred,
            "saved": self.saved,
            "note": self.note,
            "tags": json.dumps(self.tags),
        }