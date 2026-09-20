"""Research planner: turns an objective into a focused set of search queries.

The planner is deliberately simple — one LLM structured call plus
deterministic sanitization. It satisfies both Stage 1 (objective
understanding) and Stage 2 (query generation) of the research pipeline.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.prompts import planner_prompts
from app.models.research import QueryPlan
from app.search.models import SearchQuery

logger = logging.getLogger(__name__)

DIMENSIONS = [
    "core concept",
    "existing implementations",
    "academic research",
    "technical implementation",
    "tools and libraries",
    "benchmarks and performance",
    "limitations and challenges",
]


class Planner:
    """Generate a bounded, dimension-covering query set for an objective."""

    MIN_QUERIES = 3
    DEFAULT_MAX_QUERIES = 7

    def __init__(self, llm: LLMProvider, max_queries: int = DEFAULT_MAX_QUERIES) -> None:
        self._llm = llm
        self._max_queries = max_queries

    async def plan(self, objective: str) -> list[SearchQuery]:
        """Return the validated queries for the objective."""
        try:
            plan: QueryPlan = await self._llm.generate_structured(
                *planner_prompts(objective),
                response_model=QueryPlan,
            )
            queries = self._clean(plan.queries)
        except Exception as exc:  # noqa: BLE001
            logger.warning("planner failed (%s); using fallback queries", exc)
            queries = self._fallback_queries(objective)

        return [SearchQuery(query=query, dimension=DIMENSIONS[i % len(DIMENSIONS)]) for i, query in enumerate(queries)]

    def _clean(self, queries: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in queries:
            query = " ".join(raw.strip().split())
            key = query.lower()
            if not query or key in seen:
                continue
            seen.add(key)
            cleaned.append(query)
            if len(cleaned) >= self._max_queries:
                break
        return cleaned

    @staticmethod
    def _fallback_queries(objective: str) -> list[str]:
        """Deterministic queries used when the LLM planner is unavailable."""
        base = objective.strip().rstrip(".!? ")
        return [
            base,
            f"{base} research papers",
            f"{base} existing implementations",
            f"{base} documentation",
        ]