"""Models for the detailed markdown research report."""

from enum import Enum

from pydantic import BaseModel, Field


class ReportIntent(str, Enum):
    """Guiding template for the generated research document.

    ``BUILD`` emphasizes architecture, project structure, optimizations, and
    tooling; ``STUDY`` emphasizes history, concepts, math, and citations.
    """

    BUILD = "build"
    STUDY = "study"
    GENERAL = "general"


class ResearchReportContent(BaseModel):
    """Structured output of the report writer (validated before rendering).

    Each section maps to a heading in the final markdown document. Sections
    the model is unsure about may be left empty and are dropped on render.
    """

    executive_summary: str = ""
    key_findings: list[str] = Field(default_factory=list)
    history_and_background: list[str] = Field(default_factory=list)
    important_people: list[str] = Field(default_factory=list)
    key_concepts: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    libraries_and_frameworks: list[str] = Field(default_factory=list)
    architecture_and_structure: list[str] = Field(default_factory=list)
    build_plan: list[str] = Field(default_factory=list)
    optimizations: list[str] = Field(default_factory=list)
    timeline: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class ResearchReport(BaseModel):
    """The rendered markdown research document for a session."""

    intent: ReportIntent = ReportIntent.GENERAL
    markdown: str = ""