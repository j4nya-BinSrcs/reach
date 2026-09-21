"""Domain model validation tests."""

import pytest
from pydantic import ValidationError

from app.models.research import ProgressUpdate, SessionStatus, StartResearchRequest
from app.models.source import Source, SourceAnalysis, SourceFetchStatus, SourceType


class TestStartResearchRequest:
    def test_accepts_valid_objective(self) -> None:
        request = StartResearchRequest(objective="Build a privacy-focused search engine in Rust")
        assert request.objective == "Build a privacy-focused search engine in Rust"

    @pytest.mark.parametrize(
        "objective",
        ["short", "", " " * 12],
        ids=["too-short", "empty", "whitespace-only"],
    )
    def test_rejects_invalid_objective(self, objective: str) -> None:
        with pytest.raises(ValidationError):
            StartResearchRequest(objective=objective)

    def test_rejects_overlong_objective(self) -> None:
        with pytest.raises(ValidationError):
            StartResearchRequest(objective="a" * 1001)


class TestProgressUpdate:
    def test_valid(self) -> None:
        update = ProgressUpdate(status=SessionStatus.ANALYZING, progress=64, message="Analyzing sources")
        assert update.progress == 64

    def test_progress_bounds(self) -> None:
        with pytest.raises(ValidationError):
            ProgressUpdate(status=SessionStatus.ANALYZING, progress=107)


class TestQueryPlanSchema:
    """The query plan schema used by the planner."""

    from pydantic import BaseModel

    class QueryPlan(BaseModel):
        queries: list[str]

    def test_valid(self) -> None:
        plan = self.QueryPlan(queries=["a", "b", "c"])
        assert len(plan.queries) == 3

    def test_rejects_malformed(self) -> None:
        with pytest.raises(ValidationError):
            self.QueryPlan(queries=["ok", 42])


class TestSource:
    def test_defaults(self) -> None:
        source = Source(session_id="abc", url="https://example.com/x")
        assert source.source_type is SourceType.OTHER
        assert source.fetch_status is SourceFetchStatus.PENDING
        assert source.relevance == 0.0
        assert source.analysis.summary == ""

    def test_analysis_validation(self) -> None:
        analysis = SourceAnalysis(
            summary="sum",
            key_points=["one"],
            technologies=["rust"],
            concepts=["index"],
            why_relevant="reason",
            limitations=["n/a"],
        )
        source = Source(session_id="abc", url="https://example.com", analysis=analysis)
        assert source.analysis.key_points == ["one"]

    def test_relevance_bounds(self) -> None:
        with pytest.raises(ValidationError):
            Source(session_id="abc", url="https://example.com", relevance=1.5)

    def test_source_type_enum_values(self) -> None:
        assert {item.value for item in SourceType} == {
            "paper",
            "github",
            "documentation",
            "tool",
            "project",
            "article",
            "discussion",
            "other",
        }