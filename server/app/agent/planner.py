"""Research planner: turns an objective into a focused set of search queries.

The planner is deliberately simple — one LLM structured call plus
deterministic sanitization. It satisfies both Stage 1 (objective
understanding) and Stage 2 (query generation) of the research pipeline.
"""

import logging
import re

from app.agent.report_writer import detect_intent
from app.llm.base import LLMProvider
from app.llm.prompts import planner_prompts
from app.models.report import ReportIntent
from app.models.research import QueryPlan
from app.search.models import SearchQuery

logger = logging.getLogger(__name__)

DIMENSIONS = [
    "core concept",
    "existing implementations",
    "academic research",
    "technical reference",
    "tools and libraries",
    "benchmarks and performance",
    "limitations and challenges",
]

_DIMENSION_PATTERNS = [
    (
        "academic research",
        r"paper|arxiv|literature|scholar|journal|academic|bibliograph|thesis|citation|primary source|seminal|archive",
    ),
    (
        "existing implementations",
        r"implementation|open.?source|repository|github|project|codebase|existing|precedent|prototype",
    ),
    (
        "benchmarks and performance",
        r"benchmark|performance|comparison|measure|scalab|evaluat|load|throughput|latency",
    ),
    (
        "tools and libraries",
        r"librar|framework|toolkit|sdk|crate|package|api\b|runtime\b",
    ),
    (
        "technical reference",
        r"doc\b|documentation|guide|tutorial|reference|manual|how.?to|architecture|technical|design",
    ),
    (
        "limitations and challenges",
        r"limitation|challenge|problem|debate|controvers|open question|risk|drawback|gap",
    ),
    (
        "core concept",
        r"concept|overview|definition|intro|fundamental|basic|what is|history|origin|figures|people|actor|institution|evidence",
    ),
]


class Planner:
    """Generate a bounded, dimension-covering query set for an objective."""

    MIN_QUERIES = 3
    DEFAULT_MAX_QUERIES = 7
    ACADEMIC_MARKERS = ("arxiv", "paper", "research paper", "scholar", "academic", "literature")

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

        queries = self._ensure_academic_query(queries, objective)

        return [SearchQuery(query=query, dimension=_dimension_of(query)) for query in queries]

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

    def _ensure_academic_query(self, queries: list[str], objective: str) -> list[str]:
        """Guarantee at least one query targets academic/primary literature."""
        if any(marker in query.lower() for query in queries for marker in self.ACADEMIC_MARKERS):
            return queries
        topic = self._topic_clause(objective)
        academic = f"{topic} research papers, arXiv, and academic literature"
        if len(queries) >= self._max_queries:
            queries = queries[:-1]
        return [*queries, academic]

    @staticmethod
    def _topic_clause(objective: str) -> str:
        """A compact topical clause reused across fallback queries."""
        text = objective.strip().rstrip(".!? ")
        prefixes = ("i want to ", "i'd like to ", "please ", "help me ")
        lowered = text.lower()
        for prefix in prefixes:
            if lowered.startswith(prefix):
                text = text[len(prefix):].strip().capitalize()
                break
        if len(text) > 140:
            text = text[:140].rsplit(" ", 1)[0]
        return text

    @staticmethod
    def _fallback_queries(objective: str) -> list[str]:
        """Deterministic queries used when the LLM planner is unavailable."""
        base = Planner._topic_clause(objective)
        intent = detect_intent(objective)
        if intent is ReportIntent.BUILD:
            return [
                f"{base} overview, definition, and core concepts",
                f"{base} existing implementations and open-source projects",
                f"{base} architecture, key libraries, and technical design",
                f"{base} benchmarks and performance comparisons",
                f"{base} limitations, challenges, and open problems",
            ]
        if intent is ReportIntent.STUDY:
            return [
                f"historical origins and development of {base}",
                f"academic literature, papers, and scholarship on {base}",
                f"key figures, institutions, and primary sources on {base}",
                f"contemporary debates and open questions about {base}",
            ]
        return [
            f"{base} overview and definition",
            f"academic literature and evidence on {base}",
            f"key actors and institutions involved with {base}",
            f"case studies and real-world examples of {base}",
            f"contemporary debates and open questions about {base}",
        ]


def _dimension_of(query: str) -> str:
    """Infer which research dimension a query targets from its wording."""
    lowered = query.lower()
    for dimension, pattern in _DIMENSION_PATTERNS:
        if re.search(pattern, lowered):
            return dimension
    return "core concept"