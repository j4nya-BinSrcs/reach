"""Research synthesizer: aggregates source analyses into a research brief.

Combines findings, projects, technologies, important sources, and open
questions into typed structures that map cleanly onto findings/gaps/summary
rows. A deterministic fallback keeps sessions complete when the model call
fails.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import synthesis_prompts
from app.models.finding import (
    Finding,
    KeyFinding,
    OpenQuestion,
    ResearchGap,
    ResearchSynthesis,
    SynthesisResult,
)
from app.models.source import Source

logger = logging.getLogger(__name__)


class Synthesizer:
    """Turn analyzed sources into findings, gaps, and a research brief."""

    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    async def synthesize(
        self,
        objective: str,
        sources: list[Source],
    ) -> tuple[list[Finding], list[ResearchGap], ResearchSynthesis]:
        """Return (findings, gaps, synthesis) for the analyzed sources."""
        analyzed = [source for source in sources if source.analysis and source.analysis.summary]
        try:
            result: SynthesisResult = await self._llm.generate_structured(
                *synthesis_prompts(objective, [source.analysis for source in analyzed], analyzed),
                response_model=SynthesisResult,
            )
            return self._to_records(result, sources)
        except Exception as exc:  # noqa: BLE001
            logger.warning("synthesis failed (%s); using fallback view", exc)
            return self._fallback(sources)

    @staticmethod
    def _to_records(result: SynthesisResult, sources: list[Source]) -> tuple[list[Finding], list[ResearchGap], ResearchSynthesis]:
        by_title = {source.title.strip().lower(): source.id for source in sources if source.id}

        findings: list[Finding] = []
        for raw in result.key_findings:
            source_ids = []
            for raw_title in raw.source_titles:
                key = raw_title.strip().lower()
                match = None
                for title, source_id in by_title.items():
                    if key and (key == title or key in title or title in key):
                        match = source_id
                        break
                if match is not None and match not in source_ids:
                    source_ids.append(match)
            findings.append(
                Finding(session_id="", title=raw.title, summary=raw.summary, supporting_source_ids=source_ids)
            )

        gaps = [
            ResearchGap(session_id="", question=gap.question, rationale=gap.rationale)
            for gap in result.open_questions
        ]
        synthesis = ResearchSynthesis(
            overview=result.overview,
            existing_projects=result.existing_projects,
            relevant_technologies=result.relevant_technologies,
        )
        return findings, gaps, synthesis

    @staticmethod
    def _fallback(sources: list[Source]) -> tuple[list[Finding], list[ResearchGap], ResearchSynthesis]:
        findings = [
            Finding(
                session_id="",
                title=source.title,
                summary=source.analysis.summary if source.analysis else "",
                supporting_source_ids=[source.id] if source.id else [],
            )
            for source in sources
            if source.id and source.analysis and source.analysis.summary
        ]
        gaps = [
            ResearchGap(
                session_id="",
                question="The collected sources could not be fully synthesized at this time.",
                rationale="Run the research again to produce deeper cross-source findings.",
            )
        ]
        synthesis = ResearchSynthesis(overview="Synthesis was not completed, but the sources above are available for review.")
        return findings, gaps, synthesis