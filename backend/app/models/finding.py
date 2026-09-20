"""Domain models for findings, research gaps, and final synthesis."""

from pydantic import BaseModel, Field


class Finding(BaseModel):
    """A cross-source finding supported by one or more sources."""

    id: int | None = None
    session_id: str
    title: str
    summary: str = ""
    supporting_source_ids: list[int] = Field(default_factory=list)


class ResearchGap(BaseModel):
    """An important question left open by the collected material.

    Gaps are presented as open questions, never as failures of the
    research ecosystem or as established facts.
    """

    id: int | None = None
    session_id: str
    question: str
    rationale: str = ""


class ResearchSynthesis(BaseModel):
    """Concise research brief persisted with a completed session."""

    overview: str = ""
    existing_projects: list[str] = Field(default_factory=list)
    relevant_technologies: list[str] = Field(default_factory=list)


class KeyFinding(BaseModel):
    """A synthesized finding with the source titles that support it."""

    title: str
    summary: str = ""
    source_titles: list[str] = Field(default_factory=list)


class OpenQuestion(BaseModel):
    """An unresolved question identified during synthesis."""

    question: str
    rationale: str = ""


class SynthesisResult(BaseModel):
    """Structured output of the synthesizer (validated before persistence)."""

    overview: str = ""
    key_findings: list[KeyFinding] = Field(default_factory=list)
    existing_projects: list[str] = Field(default_factory=list)
    relevant_technologies: list[str] = Field(default_factory=list)
    important_sources: list[str] = Field(default_factory=list)
    open_questions: list[OpenQuestion] = Field(default_factory=list)