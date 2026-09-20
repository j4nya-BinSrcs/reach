"""Tests for the detailed markdown research report writer."""

import pytest

from app.agent.report_writer import ReportWriter, detect_intent
from app.llm.provider import MockLLMProvider
from app.models.finding import Finding, ResearchSynthesis
from app.models.report import ReportIntent, ResearchReport


class TestDetectIntent:
    def test_detects_build(self) -> None:
        assert detect_intent("Build a privacy-focused search engine using Rust") is ReportIntent.BUILD

    def test_detects_study(self) -> None:
        assert detect_intent("Study the history of search engine indexing") is ReportIntent.STUDY

    def test_detects_explore(self) -> None:
        assert detect_intent("Explore how LSM trees work") is ReportIntent.STUDY

    def test_defaults_to_general(self) -> None:
        assert detect_intent("The quick brown fox") is ReportIntent.GENERAL


class TestReportWriter:
    @pytest.mark.asyncio
    async def test_mock_write_renders_markdown(self) -> None:
        writer = ReportWriter(MockLLMProvider())
        report: ResearchReport = await writer.write(
            "Build a privacy-focused search engine using Rust",
            sources=[],
            findings=[
                Finding(session_id="s", title="Rust inverted indexes", summary="RISE is fast."),
            ],
            gaps=[],
            synthesis=ResearchSynthesis(overview="Overview text.", relevant_technologies=["Tantivy"]),
        )
        assert report.intent is ReportIntent.BUILD
        assert "# Research Report" in report.markdown
        assert "Build a privacy-focused search engine using Rust" in report.markdown
        assert "Rust inverted indexes" in report.markdown

    @pytest.mark.asyncio
    async def test_falls_back_on_llm_failure(self) -> None:
        class FailingLLM(MockLLMProvider):
            async def generate_structured(self, system, user, response_model, attempts=2):
                raise RuntimeError("model down")

        writer = ReportWriter(FailingLLM())
        report = await writer.write(
            "Study the history of search indexing",
            sources=[],
            findings=[Finding(session_id="s", title="T", summary="S")],
            gaps=[],
            synthesis=ResearchSynthesis(overview="OV"),
        )
        assert "# Research Report" in report.markdown
        assert "OV" in report.markdown


class TestReportPersistence:
    def test_report_renders_sources(self) -> None:
        from app.agent.report_writer import _render_markdown
        from app.models.report import ResearchReportContent
        from app.models.source import Source

        content = ResearchReportContent(executive_summary="Summary.", technologies=["Rust", "Tantivy"])
        markdown = _render_markdown(
            "Objective",
            ReportIntent.BUILD,
            content,
            sources=[Source(session_id="s", url="https://arxiv.org/abs/1", title="Paper One")],
            findings=[],
            gaps=[],
            synthesis=None,
        )
        assert "[Paper One](https://arxiv.org/abs/1)" in markdown
        assert "## Technologies" in markdown