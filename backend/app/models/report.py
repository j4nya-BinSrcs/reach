"""Models for the detailed markdown research report."""

from enum import Enum

from pydantic import BaseModel, Field


class ReportIntent(str, Enum):
    """Research profile guiding how the report is planned.

    ``BUILD`` emphasizes engineering structure, tooling, and a roadmap;
    ``STUDY`` emphasizes historical and scholarly treatment; ``GENERAL``
    covers an objective with no strong engineering or humanities lean.
    """

    BUILD = "build"
    STUDY = "study"
    GENERAL = "general"


class ReportSection(BaseModel):
    """One heading of the research report and what it should cover.

    Sections are chosen for the specific objective, never from a fixed
    template. ``scope`` tells the writer what this section must cover so
    content is grounded in the objective's domain.
    """

    heading: str = Field(..., description="Short heading, Title Case, 2-6 words.")
    scope: str = Field("", description="One sentence on what this section must cover for this objective.")


class ReportOutline(BaseModel):
    """Section headings the report editor chose for a specific objective."""

    sections: list[ReportSection] = Field(default_factory=list)


class ReportSectionContent(BaseModel):
    """Filled content for one report heading."""

    heading: str = Field(..., description="Must match a heading from the outline.")
    items: list[str] = Field(default_factory=list)


class ResearchReportContent(BaseModel):
    """Structured output of the report writer (validated before rendering).

    The section set is dynamic: the writer first plans an outline for the
    objective, then fills each heading. Sections without content are dropped
    on render.
    """

    sections: list[ReportSectionContent] = Field(default_factory=list)


class ResearchReport(BaseModel):
    """The rendered markdown research document for a session."""

    intent: ReportIntent = ReportIntent.GENERAL
    markdown: str = ""