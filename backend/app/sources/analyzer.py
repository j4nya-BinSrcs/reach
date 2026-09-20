"""Source analyzer: produces structured, grounded analysis per source.

Content is truncated before it reaches the model, and the model is told to
ground everything in the supplied material. Analyzer failures never abort
the session — affected sources degrade to a "no analysis" state.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import source_analysis_prompts
from app.models.source import Source, SourceAnalysis

logger = logging.getLogger(__name__)


class SourceAnalyzer:
    """Generate a :class:`SourceAnalysis` for one source."""

    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    async def analyze(self, source: Source, objective: str) -> SourceAnalysis:
        material = self._material_for(source)
        if not material.strip():
            return SourceAnalysis(
                summary="No readable content was available for this source.",
                limitations=["Could not retrieve or extract content for analysis."],
            )

        try:
            return await self._llm.generate_structured(
                *source_analysis_prompts(
                    title=source.title or source.url,
                    url=source.url,
                    domain=source.domain,
                    source_type=source.source_type.value,
                    content=material,
                    objective=objective,
                ),
                response_model=SourceAnalysis,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("analysis failed for %s (%s)", source.url, exc)
            return SourceAnalysis(
                summary="Analysis could not be completed for this source.",
                limitations=[f"Analysis failed: {type(exc).__name__}"],
            )

    @staticmethod
    def _material_for(source: Source) -> str:
        """Prefer full content, fall back to snippet/description, never invent."""
        if source.content and source.content.strip():
            return source.content
        parts = [part for part in (source.snippet, source.description, source.title) if part]
        return "\n".join(parts)