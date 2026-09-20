"""Research synthesizer: aggregates source analyses into a research brief.

Combines findings, projects, technologies, important sources, and open
questions into typed structures that map cleanly onto findings/gaps/summary
rows. Synthesis LLM calls are retried with backoff so transient provider
failures self-heal instead of decaying into placeholder content.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import synthesis_prompts
from app.llm.retry import call_with_retry
from app.models.finding import Finding, ResearchGap, ResearchSynthesis, SynthesisResult
from app.models.source import Source

logger = logging.getLogger(__name__)


class Synthesizer:
    """Turn analyzed sources into findings, gaps, and a research brief."""

    def __init__(self, llm: LLMProvider, retry_attempts: int = 5, retry_base_delay: float = 2.0) -> None:
        self._llm = llm
        self._retry_attempts = retry_attempts
        self._retry_base_delay = retry_base_delay

    async def synthesize(
        self,
        objective: str,
        sources: list[Source],
    ) -> tuple[list[Finding], list[ResearchGap], ResearchSynthesis]:
        """Return (findings, gaps, synthesis) for the analyzed sources.

        Raises if the synthesis model call keeps failing: the session is left in
        a clearly failed state rather than being served a fake completion.
        """
        analyzed = [source for source in sources if source.analysis and source.analysis.summary]
        result: SynthesisResult = await call_with_retry(
            lambda: self._llm.generate_structured(
                *synthesis_prompts(objective, [source.analysis for source in analyzed], analyzed),
                response_model=SynthesisResult,
            ),
            attempts=self._retry_attempts,
            base_delay=self._retry_base_delay,
            max_delay=30.0,
            label="synthesis",
        )
        return self._to_records(result, sources)

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