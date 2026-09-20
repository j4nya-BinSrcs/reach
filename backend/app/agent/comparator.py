"""Source comparator: highlights similarities, differences, and conflicts.

Compares two analyzed sources for one objective and returns a structured
result. Failures degrade to an empty-but-valid result so single-source
comparisons never abort the session.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import comparison_prompts
from app.models.finding import SourceComparisonResult
from app.models.source import Source

logger = logging.getLogger(__name__)


class SourceComparator:
    """Compare two sources of the same research session."""

    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    async def compare(self, objective: str, source_a: Source, source_b: Source) -> SourceComparisonResult:
        """Return the structured comparison of two sources."""
        try:
            return await self._llm.generate_structured(
                *comparison_prompts(objective, source_a, source_b),
                response_model=SourceComparisonResult,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("comparison failed for %s vs %s (%s)", source_a.url, source_b.url, exc)
            return SourceComparisonResult(
                overview="Comparison could not be completed for these two sources.",
                complementarity_notes="Review both sources individually, then retry the comparison.",
            )