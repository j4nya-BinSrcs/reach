"""Tests for the source comparison feature."""

import pytest

from app.agent.comparator import SourceComparator
from app.llm.provider import MockLLMProvider
from app.models.finding import SourceComparisonResult
from app.models.source import Source, SourceAnalysis


class TestSourceComparator:
    @pytest.mark.asyncio
    async def test_mock_compare_returns_valid_result(self) -> None:
        comparator = SourceComparator(MockLLMProvider())
        source_a = Source(
            session_id="s",
            url="https://arxiv.org/abs/1",
            title="Paper A",
            content="Inverted index paper.",
            analysis=SourceAnalysis(summary="A survey of inverted indexes.", key_points=["B describes a"], technologies=["Rust"]),
        )
        source_b = Source(
            session_id="s",
            url="https://arxiv.org/abs/2",
            title="Paper B",
            content="LSM tree paper.",
            analysis=SourceAnalysis(summary="A survey of LSM trees.", key_points=["A"], technologies=["Go"]),
        )
        result: SourceComparisonResult = await comparator.compare("search engines", source_a, source_b)
        assert result is not None
        assert isinstance(result, SourceComparisonResult)

    @pytest.mark.asyncio
    async def test_compare_survives_llm_failure(self) -> None:
        class FailingLLM(MockLLMProvider):
            async def generate_structured(self, system, user, response_model, attempts=2):
                raise RuntimeError("model down")

        comparator = SourceComparator(FailingLLM())
        source_a = Source(session_id="s", url="https://a.example.com", title="A")
        source_b = Source(session_id="s", url="https://b.example.com", title="B")
        result = await comparator.compare("topic", source_a, source_b)
        assert result.overview
        assert "could not be completed" in result.overview.lower()