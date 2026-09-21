"""Synthesizer tests: structured synthesis, provenance mapping, and retries."""

import pytest

from app.agent.synthesizer import Synthesizer
from app.llm.base import LLMProvider
from app.llm.extractive import ExtractiveLLMProvider
from app.models.finding import SynthesisResult
from app.models.source import Source, SourceAnalysis


class ScriptedSynthesis(LLMProvider):
    name = "scripted"

    def __init__(self, result: SynthesisResult | None = None, fail: bool = False) -> None:
        self._result = result
        self._fail = fail

    async def _generate_text(self, system: str, user: str) -> str:
        return ""

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2):
        if self._fail:
            raise RuntimeError("synthesis down")
        return self._result or SynthesisResult()


class FlakySynthesis(LLMProvider):
    name = "flaky"

    def __init__(self, result: SynthesisResult, failures: int = 2) -> None:
        self._result = result
        self._calls = 0
        self._failures = failures

    async def _generate_text(self, system: str, user: str) -> str:
        return ""

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2):
        self._calls += 1
        if self._calls <= self._failures:
            raise RuntimeError("transient outage")
        return self._result


def _source(source_id: int, title: str, summary: str = "Analysis summary") -> Source:
    return Source(
        id=source_id,
        session_id="s",
        url=f"https://example.com/{source_id}",
        title=title,
        analysis=SourceAnalysis(summary=summary, key_points=["point"], why_relevant="relevant"),
    )


class TestSynthesizer:
    @pytest.mark.asyncio
    async def test_keyless_provider_produces_records(self) -> None:
        sources = [_source(1, "Tantivy"), _source(2, "Arxiv Paper")]
        synthesizer = Synthesizer(llm=ExtractiveLLMProvider())
        findings, gaps, synthesis = await synthesizer.synthesize("privacy rust search engine", sources)
        assert isinstance(synthesis, object)
        assert len(findings) > 0 or synthesis.overview
        assert all(isinstance(finding.title, str) for finding in findings)

    @pytest.mark.asyncio
    async def test_maps_source_titles_to_ids(self) -> None:
        result = SynthesisResult(
            overview="brief",
            key_findings=[
                {
                    "title": "Inverted indexes are common",
                    "summary": "summary text",
                    "source_titles": ["Tantivy", "Missing Title"],
                }
            ],
        )
        sources = [_source(1, "Tantivy"), _source(2, "Other")]
        synthesizer = Synthesizer(llm=ScriptedSynthesis(result=result))
        findings, _, _ = await synthesizer.synthesize("objective", sources)
        assert findings[0].supporting_source_ids == [1]

    @pytest.mark.asyncio
    async def test_builds_gaps_and_synthesis(self) -> None:
        result = SynthesisResult(
            overview="overview here",
            existing_projects=["Tantivy"],
            relevant_technologies=["Rust"],
            open_questions=[{"question": "How does distributed indexing scale?"}],
        )
        synthesizer = Synthesizer(llm=ScriptedSynthesis(result=result))
        findings, gaps, synthesis = await synthesizer.synthesize("objective", [_source(1, "Tantivy")])
        assert gaps[0].question == "How does distributed indexing scale?"
        assert synthesis.overview == "overview here"
        assert synthesis.existing_projects == ["Tantivy"]

    @pytest.mark.asyncio
    async def test_raises_after_retries_on_persistent_failure(self) -> None:
        sources = [_source(1, "Tantivy", summary="Library summary")]
        synthesizer = Synthesizer(llm=ScriptedSynthesis(fail=True), retry_attempts=2, retry_base_delay=0.0)
        with pytest.raises(RuntimeError, match="synthesis down"):
            await synthesizer.synthesize("objective", sources)

    @pytest.mark.asyncio
    async def test_retries_then_recovers_from_transient_failure(self) -> None:
        result = SynthesisResult(overview="overview here", key_findings=[])
        flaky = FlakySynthesis(result=result, failures=2)
        synthesizer = Synthesizer(llm=flaky, retry_base_delay=0.0)
        _, _, synthesis = await synthesizer.synthesize("objective", [_source(1, "Tantivy")])
        assert flaky._calls == 3
        assert synthesis.overview == "overview here"