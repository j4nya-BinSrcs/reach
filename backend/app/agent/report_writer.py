"""Report writer: builds a detailed markdown research document.

The writer first detects the *intent* of the objective (build vs study) and
selects an appropriate template, then has the LLM fill in typed sections and
renders them deterministically into a complete markdown document. A
deterministic fallback keeps the report available even without the model.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import report_prompts
from app.models.finding import Finding, ResearchGap, ResearchSynthesis
from app.models.report import ReportIntent, ResearchReport, ResearchReportContent
from app.models.source import Source

logger = logging.getLogger(__name__)

_BUILD_HINTS = {"build", "create", "develop", "implement", "make", "write", "design", "code", "construct", "prototype", "architect"}
_STUDY_HINTS = {"study", "understand", "learn", "explore", "research", "analyze", "investigate", "explain", "compare", "survey", "history", "how does", "what is"}


def detect_intent(objective: str) -> ReportIntent:
    """Pick a report template from deterministic objective signals."""
    lowered = objective.lower()
    if any(hint in lowered for hint in _BUILD_HINTS):
        return ReportIntent.BUILD
    if any(hint in lowered for hint in _STUDY_HINTS):
        return ReportIntent.STUDY
    return ReportIntent.GENERAL


class ReportWriter:
    """Generate a structured, rendered markdown research document."""

    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

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
        try:
            content: ResearchReportContent = await self._llm.generate_structured(
                *report_prompts(objective, intent, sources, findings, gaps, synthesis),
                response_model=ResearchReportContent,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("report generation failed (%s); using fallback report", exc)
            content = _fallback_content(findings, gaps, synthesis)

        return ResearchReport(intent=intent, markdown=_render_markdown(objective, intent, content, sources, findings, gaps, synthesis))


def _heading(section: str) -> str:
    return "\n## " + section + "\n"


def _render_markdown(
    objective: str,
    intent: ReportIntent,
    content: ResearchReportContent,
    sources: list[Source],
    findings: list[Finding],
    gaps: list[ResearchGap],
    synthesis: ResearchSynthesis | None,
) -> str:
    """Render typed sections into a complete, well-structured markdown doc."""
    lines: list[str] = ["# Research Report\n", f"**Objective:** {objective}\n"]
    lines.append(f"**Intent template:** {intent.value}\n")

    sections: list[tuple[str, list[str] | str]] = [
        ("Executive Summary", content.executive_summary),
        ("Key Findings", _items_of(content.key_findings)),
        ("History and Background", _items_of(content.history_and_background)),
        ("Important People", _items_of(content.important_people)),
        ("Key Concepts", _items_of(content.key_concepts)),
        ("Technologies", _items_of(content.technologies)),
        ("Libraries and Frameworks", _items_of(content.libraries_and_frameworks)),
        ("Architecture and Structure", _items_of(content.architecture_and_structure)),
        ("Build Plan", _items_of(content.build_plan)),
        ("Optimizations", _items_of(content.optimizations)),
        ("Timeline", _items_of(content.timeline)),
        ("Citations", _items_of(content.citations)),
        ("Open Questions", _items_of(content.open_questions)),
    ]
    for heading, body in sections:
        if isinstance(body, str):
            if not body.strip():
                continue
            lines.extend([_heading(heading), body])
        elif body:
            lines.extend([_heading(heading), *[f"- {item}" for item in body]])

    if findings:
        lines.extend([_heading("Source Findings"), *[f"- **{finding.title}** — {finding.summary}" for finding in findings]])
    if gaps:
        lines.extend([_heading("Research Gaps"), *[f"- {gap.question}" for gap in gaps]])
    if synthesis and synthesis.existing_projects:
        lines.extend([_heading("Existing Projects"), *[f"- {project}" for project in synthesis.existing_projects]])
    if synthesis and synthesis.relevant_technologies:
        lines.extend([_heading("Relevant Technologies"), *[f"- {technology}" for technology in synthesis.relevant_technologies]])
    if sources:
        lines.extend([_heading("Sources"), *[f"- [{source.title or source.url}]({source.url})" for source in sources]])

    return "\n".join(lines).strip() + "\n"


def _items_of(items: list[str]) -> list[str]:
    """Drop empty entries so only meaningful bullets render."""
    return [item.strip() for item in items if item and item.strip()]


def _fallback_content(findings: list[Finding], gaps: list[ResearchGap], synthesis: ResearchSynthesis | None) -> ResearchReportContent:
    """Deterministic report content used when the model call fails."""
    return ResearchReportContent(
        executive_summary=synthesis.overview if synthesis else "A summary was not generated for this research run.",
        key_findings=[f"{finding.title}: {finding.summary}" for finding in findings[:8]],
        relevant_technologies=list(synthesis.relevant_technologies if synthesis else []),
        open_questions=[gap.question for gap in gaps],
    )