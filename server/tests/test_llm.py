"""LLM layer tests: parsing, validation, retry behavior, and keyless extractive generation."""

import pytest
from pydantic import BaseModel, Field

from app.llm.base import LLMProvider, StructuredOutputError, parse_structured_output, strip_code_fences
from app.llm.extractive import ExtractiveLLMProvider
from app.llm.provider import build_llm_provider


class QueryPlan(BaseModel):
    queries: list[str] = Field(..., min_length=1)


class FakeProvider(LLMProvider):
    """Injects scripted raw text to exercise base-class behavior."""

    name = "fake"

    def __init__(self, responses: list[str]) -> None:
        self._responses = list(responses)
        self.calls = 0

    async def _generate_text(self, system: str, user: str) -> str:
        self.calls += 1
        if not self._responses:
            raise AssertionError("no scripted responses left")
        return self._responses.pop(0)


class TestParsing:
    def test_strips_fences(self) -> None:
        assert strip_code_fences("```json\n{\"a\": 1}\n```") == '{"a": 1}'
        assert strip_code_fences('{"a": 1}') == '{"a": 1}'
        assert strip_code_fences("```\nnot json\n```") == "not json"

    def test_parses_json_object(self) -> None:
        plan = parse_structured_output('{"queries": ["a", "b"]}', QueryPlan)
        assert plan.queries == ["a", "b"]

    def test_parses_with_prose_wrapping(self) -> None:
        raw = 'Here is the plan:\n{"queries": ["x"], "extra": true}\nThat is all.'
        plan = parse_structured_output(raw, QueryPlan)
        assert plan.queries == ["x"]

    def test_rejects_malformed_schema(self) -> None:
        with pytest.raises(StructuredOutputError):
            parse_structured_output('{"queries": 42}', QueryPlan)


class TestGenerateStructured:
    @pytest.mark.asyncio
    async def test_validates_on_first_attempt(self) -> None:
        provider = FakeProvider(['{"queries": ["rust search engine"]}'])
        plan = await provider.generate_structured("sys", "objective", QueryPlan)
        assert plan.queries == ["rust search engine"]
        assert provider.calls == 1

    @pytest.mark.asyncio
    async def test_retries_once_then_raises(self) -> None:
        provider = FakeProvider(["not json at all", "still not json"])
        with pytest.raises(StructuredOutputError):
            await provider.generate_structured("sys", "obj", QueryPlan, attempts=2)
        assert provider.calls == 2

    @pytest.mark.asyncio
    async def test_recovers_on_second_attempt(self) -> None:
        provider = FakeProvider(["garbage", '{"queries": ["recovered"]}'])
        plan = await provider.generate_structured("sys", "obj", QueryPlan, attempts=2)
        assert plan.queries == ["recovered"]

    @pytest.mark.asyncio
    async def test_bounds_attempts(self) -> None:
        provider = FakeProvider(["bad", "bad", "bad"])
        with pytest.raises(StructuredOutputError):
            await provider.generate_structured("sys", "obj", QueryPlan, attempts=2)
        assert provider.calls == 2


class TestKeylessProvider:
    @pytest.mark.asyncio
    async def test_structured_builds_query_plan(self) -> None:
        provider = ExtractiveLLMProvider()
        plan = await provider.generate_structured("", "RESEARCH OBJECTIVE\nBuild a privacy-focused search engine in Rust", QueryPlan)
        assert 3 <= len(plan.queries) <= 7
        assert all(isinstance(q, str) for q in plan.queries)

    @pytest.mark.asyncio
    async def test_structured_builds_source_analysis(self) -> None:
        from app.models.source import SourceAnalysis

        provider = ExtractiveLLMProvider()
        user = (
            "RESEARCH OBJECTIVE\nobj\n"
            "SOURCE CONTENT\n"
            "Inverted indexes allow fast full-text lookup. Tantivy and quickwit-oss "
            "implement them in Rust, offering high throughput."
        )
        analysis = await provider.generate_structured("", user, SourceAnalysis)
        assert isinstance(analysis, SourceAnalysis)
        assert analysis.summary
        assert analysis.key_points

    @pytest.mark.asyncio
    async def test_keyless_run_uses_extractive_provider(self) -> None:
        provider = build_llm_provider(api_key="", model="gpt-4o-mini")
        assert isinstance(provider, ExtractiveLLMProvider)
        plan = await provider.generate_structured("", "RESEARCH OBJECTIVE\nBuild a search engine in Rust", QueryPlan)
        assert 3 <= len(plan.queries) <= 7
        assert all(isinstance(q, str) for q in plan.queries)

    def test_openai_provider_requires_key(self) -> None:
        from app.llm.provider import OpenAICompatibleProvider

        with pytest.raises(ValueError):
            OpenAICompatibleProvider(api_key="", model="gpt-4o-mini")

    @pytest.mark.asyncio
    async def test_resilient_falls_back_to_extractive_when_live_llm_fails(self) -> None:
        from app.llm.base import LLMError
        from app.llm.resilient import ResilientLLMProvider

        class BrokenProvider(LLMProvider):
            name = "broken"

            async def _generate_text(self, system: str, user: str) -> str:
                raise LLMError("down")

        provider = ResilientLLMProvider(BrokenProvider())
        plan = await provider.generate_structured("", "RESEARCH OBJECTIVE\nBuild a search engine in Rust", QueryPlan)
        assert 3 <= len(plan.queries) <= 7
        assert all(isinstance(q, str) for q in plan.queries)

    @pytest.mark.asyncio
    async def test_resilient_uses_primary_when_it_works(self) -> None:
        from app.llm.resilient import ResilientLLMProvider

        plan = await ResilientLLMProvider(FakeProvider(['{"queries": ["from primary"]}'])).generate_structured(
            "sys", "obj", QueryPlan
        )
        assert plan.queries == ["from primary"]
