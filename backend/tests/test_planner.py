"""Planner tests: query generation, sanitization, and fallback behavior."""

import pytest

from app.agent.planner import Planner
from app.llm.base import LLMProvider


class ScriptedPlannerLLM(LLMProvider):
    """Serves a canned QueryPlan; toggles failure modes for tests."""

    name = "scripted"

    def __init__(self, queries: list[str] | None = None, fail: bool = False) -> None:
        self._queries = queries or []
        self._fail = fail

    async def _generate_text(self, system: str, user: str) -> str:
        if self._fail:
            raise RuntimeError("boom")
        return ""

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2):
        if self._fail:
            raise RuntimeError("boom")
        from app.models.research import QueryPlan

        return QueryPlan(queries=list(self._queries))


class FailingStructuredLLM(LLMProvider):
    name = "failing"

    async def _generate_text(self, system: str, user: str) -> str:
        return "not json"


@pytest.fixture()
def objective() -> str:
    return "Build a privacy-focused search engine using Rust"


class TestPlanner:
    @pytest.mark.asyncio
    async def test_uses_mock_provider(self, objective: str) -> None:
        from app.llm.provider import MockLLMProvider

        planner = Planner(llm=MockLLMProvider())
        queries = await planner.plan(objective)
        assert 5 <= len(queries) <= planner.DEFAULT_MAX_QUERIES
        assert all(query.query.strip() for query in queries)
        assert len({query.query.lower() for query in queries}) == len(queries)

    @pytest.mark.asyncio
    async def test_sanitizes_and_bounds_queries(self, objective: str) -> None:
        provider = ScriptedPlannerLLM(queries=["   ", "", "A", "a", "B", "C", "D", "E", "F", "G", "H"])
        planner = Planner(llm=provider, max_queries=5)
        queries = await planner.plan(objective)
        assert [query.query for query in queries] == ["A", "B", "C", "D", "E"]
        assert all(query.dimension for query in queries)

    @pytest.mark.asyncio
    async def test_falls_back_on_llm_failure(self, objective: str) -> None:
        planner = Planner(llm=ScriptedPlannerLLM(fail=True))
        queries = await planner.plan(objective)
        assert len(queries) >= planner.MIN_QUERIES
        assert queries[0].query == objective

    @pytest.mark.asyncio
    async def test_falls_back_on_malformed_output(self, objective: str) -> None:
        planner = Planner(llm=FailingStructuredLLM())
        queries = await planner.plan(objective)
        assert len(queries) >= planner.MIN_QUERIES

    @pytest.mark.asyncio
    async def test_dimension_labels_are_assigned(self, objective: str) -> None:
        from app.llm.provider import MockLLMProvider

        queries = await Planner(llm=MockLLMProvider()).plan(objective)
        labels = {query.dimension for query in queries}
        assert "core concept" in labels
        assert "benchmarks and performance" in labels