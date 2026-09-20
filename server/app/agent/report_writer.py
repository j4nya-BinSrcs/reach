"""Report writer: builds a detailed markdown research document.

The writer first plans the report's *section structure* for the specific
objective (the LLM reasons about what the report should contain, rather than
filling a fixed template), then fills each planned section with content
grounded in the collected material, and finally renders the whole thing
deterministically into markdown. Deterministic fallbacks keep the report
available even without the model.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import report_content_prompts, report_outline_prompts
from app.llm.retry import call_with_retry
from app.models.finding import Finding, ResearchGap, ResearchSynthesis
from app.models.report import ReportIntent, ReportOutline, ReportSection, ReportSectionContent, ResearchReport, ResearchReportContent
from app.models.source import Source

logger = logging.getLogger(__name__)

_BUILD_HINTS = {"build", "create", "develop", "implement", "make", "write", "design", "code", "construct", "prototype", "architect"}
_STUDY_HINTS = {"study", "understand", "learn", "explore", "research", "analyze", "investigate", "explain", "compare", "survey", "history", "origins", "origin", "how does", "what is"}


def detect_intent(objective: str) -> ReportIntent:
    """Pick a research profile from deterministic objective signals."""
    lowered = objective.lower()
    if any(hint in lowered for hint in _BUILD_HINTS):
        return ReportIntent.BUILD
    if any(hint in lowered for hint in _STUDY_HINTS):
        return ReportIntent.STUDY
    return ReportIntent.GENERAL


class ReportWriter:
    """Generate a structured, rendered markdown research document."""

    def __init__(self, llm: LLMProvider, retry_attempts: int = 5, retry_base_delay: float = 2.0) -> None:
        self._llm = llm
        self._retry_attempts = retry_attempts
        self._retry_base_delay = retry_base_delay

    async def write(
        self,
        objective: str,
        sources: list[Source],
        findings: list[Finding],
        gaps: list[ResearchGap],
        synthesis: ResearchSynthesis | None,
    ) -> ResearchReport:
        """Return the rendered markdown report for a completed session."""
        intent = detect_intent(objective)
        outline, content = await self._plan_and_fill(objective, intent, sources, findings, gaps, synthesis)
        return ResearchReport(
            intent=intent,
            markdown=_render_markdown(objective, intent, outline, content, sources, findings, gaps, synthesis),
        )

    async def _plan_and_fill(
        self,
        objective: str,
        intent: ReportIntent,
        sources: list[Source],
        findings: list[Finding],
        gaps: list[ResearchGap],
        synthesis: ResearchSynthesis | None,
    ) -> tuple[ReportOutline, ResearchReportContent]:
        """Chose section headings, then fill them with typed content.

        LLM calls are retried with backoff so transient failures self-heal;
        only a genuinely persistent failure falls back to a deterministic
        report built from the real findings, gaps, and synthesis.
        """
        try:
            outline: ReportOutline = await call_with_retry(
                lambda: self._llm.generate_structured(
                    *report_outline_prompts(objective, intent, synthesis, findings),
                    response_model=ReportOutline,
                ),
                attempts=self._retry_attempts,
                base_delay=self._retry_base_delay,
                max_delay=30.0,
                label="report outline",
            )
            content: ResearchReportContent = await call_with_retry(
                lambda: self._llm.generate_structured(
                    *report_content_prompts(objective, outline, intent, sources, findings, gaps, synthesis),
                    response_model=ResearchReportContent,
                ),
                attempts=self._retry_attempts,
                base_delay=self._retry_base_delay,
                max_delay=30.0,
                label="report content",
            )
            _validate_content(outline, content)
        except Exception as exc:  # noqa: BLE001
            logger.warning("report generation failed (%s); using fallback report", exc)
            outline, content = _fallback_outline_and_content(findings, gaps, synthesis)
        return outline, content


def _validate_content(outline: ReportOutline, content: ResearchReportContent) -> None:
    """Demote content whose heading does not belong to the outline."""
    headings = {section.heading.strip().lower() for section in outline.sections}
    content.sections = [section for section in content.sections if section.heading.strip().lower() in headings]


def _heading(section: str) -> str:
    return "\n## " + section + "\n"


def _render_markdown(
    objective: str,
    intent: ReportIntent,
    outline: ReportOutline,
    content: ResearchReportContent,
    sources: list[Source],
    findings: list[Finding],
    gaps: list[ResearchGap],
    synthesis: ResearchSynthesis | None,
) -> str:
    """Render the planned, content-filled sections into a detailed markdown document.

    The report is the deep, non-redundant product: it carries the full planned
    narrative with every section filled from the analyzed website material. The
    source list, findings, open questions, comparisons, and workspace get their
    own dedicated surfaces in the UI, so none of them are duplicated here as a
    trailing appendix.
    """
    lines: list[str] = ["# Research Report\n", f"**Objective:** {objective}\n"]
    lines.append(f"**Research profile:** {intent.value}\n")

    by_heading = {section.heading.strip().lower(): section for section in content.sections}
    for section in outline.sections:
        filled = by_heading.get(section.heading.strip().lower())
        items = _items_of(filled.items) if filled else []
        if items:
            lines.extend([_heading(section.heading), *[f"- {item}" for item in items]])

    return "\n".join(lines).strip() + "\n"


def _items_of(items: list[str]) -> list[str]:
    """Drop empty entries so only meaningful bullets render."""
    return [item.strip() for item in items if item and item.strip()]


def _fallback_outline_and_content(
    findings: list[Finding],
    gaps: list[ResearchGap],
    synthesis: ResearchSynthesis | None,
) -> tuple[ReportOutline, ResearchReportContent]:
    """Deterministic plan+content used when the model calls fail."""
    outline = ReportOutline(
        sections=[
            ReportSection(heading="Executive Summary", scope="Overview of what the research established."),
            ReportSection(heading="Key Findings", scope="The most important supported conclusions."),
            ReportSection(heading="Open Questions", scope="Questions the material could not answer."),
        ]
    )
    sections = [
        ReportSectionContent(heading="Executive Summary", items=[synthesis.overview] if synthesis and synthesis.overview else []),
        ReportSectionContent(heading="Key Findings", items=[f"{finding.title}: {finding.summary}" for finding in findings[:8]]),
        ReportSectionContent(heading="Open Questions", items=[gap.question for gap in gaps]),
    ]
    return outline, ResearchReportContent(sections=sections)