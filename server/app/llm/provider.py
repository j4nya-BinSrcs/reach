"""Concrete LLM provider implementations and factory.

The OpenAI-compatible provider works against any OpenAI-style chat
completions endpoint. The mock provider returns deterministic structured
results so the pipeline and tests run without any API keys.
"""

import logging
from typing import Any, get_args, get_origin

from pydantic import BaseModel

from app.agent.report_writer import detect_intent
from app.llm.base import LLMProvider, LLMError
from app.models.finding import SynthesisResult
from app.models.report import ReportIntent, ReportOutline, ReportSection, ReportSectionContent, ResearchReportContent

logger = logging.getLogger(__name__)


class OpenAICompatibleProvider(LLMProvider):
    """Chat-completions provider for OpenAI-compatible endpoints."""

    name = "openai-compatible"

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        temperature: float = 0.0,
        timeout: float = 60.0,
    ) -> None:
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:  # pragma: no cover - dependency check
            raise LLMError("openai package is not installed") from exc
        if not api_key:
            raise ValueError("OpenAI-compatible provider requires an API key")
        self._model = model
        self._temperature = temperature
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)

    async def _generate_text(self, system: str, user: str) -> str:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=self._temperature,
            )
        except Exception as exc:  # noqa: BLE001
            raise LLMError(f"chat completion failed: {exc}") from exc
        content = response.choices[0].message.content if response.choices else ""
        if not content:
            raise LLMError("empty completion returned")
        return content

    async def close(self) -> None:
        await self._client.close()


# --- mock provider ---------------------------------------------------------


class MockLLMProvider(LLMProvider):
    """Deterministic keyless provider.

    ``generate_structured`` is served by a per-schema handler. The default
    handler fills the research pipeline's known schemas with objective-aware
    prose, so demo runs read like real research instead of emitting literal
    placeholders; callers may inject a custom handler for targeted tests.
    """

    name = "mock"

    def __init__(self, handler: Any = None) -> None:
        self._handler = handler or _mock_structured

    async def _generate_text(self, system: str, user: str) -> str:
        return _mock_text(user)

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2) -> BaseModel:
        # Deliberately bypasses JSON: the mock builds validated models directly.
        result = self._handler(system, user, response_model)
        if isinstance(result, dict):
            return response_model.model_validate(result)
        return result

    async def close(self) -> None:
        """Nothing to release for the in-memory mock provider."""


# --- objective-aware mock content -----------------------------------------

_TOPIC_STRIP_PREFIXES = (
    "i want to build a ",
    "i want to build ",
    "i want to understand ",
    "i want to learn ",
    "i want to ",
    "i need to ",
    "help me build ",
    "help me ",
    "how do i build ",
    "how do i ",
    "how can i ",
    "how to build ",
    "how to ",
    "build a ",
    "build ",
    "create a ",
    "create ",
    "make a ",
    "make ",
    "develop a ",
    "develop ",
    "design a ",
    "design ",
    "implement a ",
    "implement ",
    "write a ",
    "write ",
    "study ",
    "understand ",
    "research ",
    "explore ",
    "investigate ",
    "analyze ",
    "learn ",
)

_SENTENCE_BOUNDARY = ".;:"


def _mock_objective(user: str) -> str:
    """Extract the raw research objective from a prompt (mock only)."""
    marker = "RESEARCH OBJECTIVE\n"
    if marker in user:
        chunk = user.split(marker, 1)[1]
    else:
        chunk = user
    objective = chunk.splitlines()[0].strip().strip('"').strip() if chunk.strip() else ""
    return objective


def _mock_topic(user: str) -> str:
    """Extract a short noun-phrase topic from a prompt (mock only).

    Structured prompts embed the objective after ``RESEARCH OBJECTIVE``; the
    planner prompt is the objective itself. The objective is reduced to a
    concise topic (stripped of imperative prefixes and trailing detail) so
    mock prose reads cleanly instead of quoting the full request.
    """
    objective = _mock_objective(user)
    if not objective:
        return "the research focus"

    lowered = objective.lower()
    for prefix in _TOPIC_STRIP_PREFIXES:
        if lowered.startswith(prefix):
            objective = objective[len(prefix):]
            lowered = objective.lower()
            break

    # "origin of coffee" -> "coffee" so phrases like "historical origins and
    # development of coffee" do not repeat the subject.
    for phrase in (
        "the origins of ",
        "the origin of ",
        "origins of ",
        "origin of ",
        "the history of ",
        "history of ",
    ):
        if lowered.startswith(phrase):
            objective = objective[len(phrase):]
            break

    # Cut at the first sentence boundary (".", ";", ":").
    for boundary in _SENTENCE_BOUNDARY:
        pos = objective.find(boundary)
        if pos != -1:
            objective = objective[:pos]
            break
    objective = objective.strip(" ,-–")

    if len(objective) > 96:
        objective = objective[:96].rsplit(" ", 1)[0]
    return objective or "the research focus"


def _mock_intent(user: str) -> ReportIntent:
    """Deterministic research profile for the objective (mock only)."""
    objective = _mock_objective(user)
    return detect_intent(objective) if objective else ReportIntent.GENERAL


def _mock_text(user: str) -> str:
    return f"A brief research note on {_mock_topic(user)}, synthesized from the sources gathered during this run."


def _is_query_plan_model(response_model) -> bool:
    """True for any model whose only field is ``queries: list[str]``."""
    if list(response_model.model_fields) != ["queries"]:
        return False
    annotation = response_model.model_fields["queries"].annotation
    return get_origin(annotation) is list and get_args(annotation) == (str,)


def _mock_structured(system: str, user: str, response_model):
    """Build a default mock instance for any Pydantic model."""
    topic = _mock_topic(user)
    intent = _mock_intent(user)
    # Any "queries": list[str] model is a research plan (this includes the
    # planner's QueryPlan and ad-hoc equivalents used in tests).
    if _is_query_plan_model(response_model):
        return {"queries": _derive_queries(topic, intent)}
    if response_model is SynthesisResult:
        return _mock_synthesis(topic, intent)
    if response_model is ReportOutline:
        return _mock_report_outline(topic, intent)
    if response_model is ResearchReportContent:
        return _mock_report_content(topic, intent)
    return _mock_model(response_model, topic)


def _mock_model(response_model, topic: str, n: int = 0):
    """Fill every field of ``response_model`` with plausible, topic-aware content."""
    fields: dict[str, Any] = {}
    for name, field in response_model.model_fields.items():
        origin = get_origin(field.annotation)
        if origin is list:
            args = get_args(field.annotation)
            item_type = args[0] if args else None
            fields[name] = _mock_list(name, topic, item_type)
        elif origin is dict:
            fields[name] = {}
        elif field.annotation is int:
            fields[name] = 0
        elif field.annotation is float:
            fields[name] = 0.0
        elif field.annotation is bool:
            fields[name] = False
        else:
            fields[name] = _mock_scalar(name, topic, n)
    return response_model(**fields)


def _mock_list(name: str, topic: str, item_type) -> list:
    """Fill a list field: nested models recursively, strings as prose."""
    if isinstance(item_type, type) and issubclass(item_type, BaseModel):
        return [_mock_model(item_type, topic, index) for index in range(3)]
    return _mock_list_items(name, topic)


def _mock_list_items(name: str, topic: str) -> list[str]:
    """Plausible, objective-grounded bullet phrasing for a string list field."""
    label = name.replace("_", " ")
    if label == "timeline":
        return [
            f"Early work established the foundational open problems for {topic}.",
            f"Reference implementations demonstrated what is feasible for {topic} today.",
            f"Ongoing work targets production readiness, scale, and integration for {topic}.",
        ]
    if label == "citations":
        return [
            f"Primary papers and official documentation that ground the discussion of {topic}.",
            f"Authoritative reference material cited most often in the {topic} community.",
        ]
    if label in ("open questions", "open question"):
        return [
            f"Which trade-off has the scholarly community not yet resolved conclusively for {topic}?",
            f"What is the evidence gap that still limits confident conclusions about {topic}?",
        ]
    if label in ("key findings", "findings", "key finding"):
        return [
            f"The collected material on {topic} converges on a small set of endorsed approaches.",
            f"Sources agree broadly on the fundamentals of {topic} while differing on trade-offs.",
        ]
    if label in ("key concepts", "concepts", "concept"):
        return [
            f"Core idea in {topic}, as the sources frame it: a few recurring themes hold the subject together.",
            f"The material on {topic} repeatedly ground definitions in specific historical and social context.",
        ]
    if label == "history and background":
        return [
            f"How the subject of {topic} developed from its earliest traces to the present day.",
            f"Key turning points, archives, and events that shaped {topic}.",
        ]
    if label == "important people":
        return [
            f"Historians, scholars, and practitioners whose work is central to the study of {topic}.",
            f"Individuals and institutions cited most often in writing on {topic}.",
        ]
    if label == "technologies":
        return [
            f"Languages and runtimes commonly used to build {topic}.",
            f"Tooling and infrastructure that support {topic}.",
        ]
    if label in ("libraries and frameworks", "libraries and framework"):
        return [
            f"Reusable libraries that accelerate building a system for {topic}.",
            f"Frameworks adopted for {topic} in real projects.",
        ]
    if label == "architecture and structure":
        return [
            f"High-level layout of a system for {topic}: boundaries, data flow, and lifecycle.",
            f"Module breakdown that keeps a {topic} system maintainable and testable.",
        ]
    if label == "build plan":
        return [
            f"Phase 1 — core scaffold for {topic}: define interfaces and a minimal vertical slice.",
            f"Phase 2 — feature depth for {topic}: add indexing, ranking, and storage.",
            f"Phase 3 — hardening for {topic}: performance, observability, and distribution.",
        ]
    if label == "optimizations":
        return [
            f"Performance levers for {topic}: incremental indexing and cache locality.",
            f"Scalability levers for {topic}: sharding, replication, and bounded memory.",
        ]
    if label in ("existing projects", "existing project", "important sources", "important source"):
        return [
            f"An open source project that already addresses part of {topic}.",
            f"A maintained implementation cited as a starting point for {topic}.",
        ]
    if label in ("relevant technologies", "relevant technology"):
        return [
            f"Technologies worth evaluating for {topic} based on the collected sources.",
            f"Libraries and runtimes that appear consistently across analysis of {topic}.",
        ]
    if label in ("key points", "key point"):
        return [
            f"The source treats {topic} concretely, with specific claims grounded in its material.",
            f"The source's position on {topic} is clearly stated and testable.",
        ]
    if label in ("limitations", "limitation"):
        return [
            f"The material gathered on {topic} is partial; some claims remain unverified.",
            f"Coverage of {topic} here may not reflect the full ecosystem.",
        ]
    if label == "snippets":
        return [
            f"An excerpt from the source most directly about {topic}.",
            f"Supporting quote from a secondary source on {topic}.",
        ]
    return [
        f"Relevant observation on {topic} for {label}.",
        f"Second observation on {topic} for {label}.",
    ]


def _mock_scalar(name: str, topic: str, n: int = 0) -> str:
    """Plausible, objective-grounded prose for a single string field."""
    t = topic
    if name in ("summary", "executive_summary"):
        summaries = [
            f"Overview of the material gathered for {t}: the sources cover the landscape, "
            "the strongest approaches, and the trade-offs that remain open.",
            f"The collected material on {t} spans the core approaches, the tooling that "
            "supports them, and the open problems that still need attention.",
            f"A grounded look at {t}: what the sources establish with confidence and what "
            "they leave as open design decisions.",
        ]
        return summaries[n % len(summaries)]
    if name == "overview":
        return (
            f"Combined view of {t}. The sources converge on the essentials, diverge on "
            "implementation detail, and leave several trade-offs unresolved."
        )
    if name == "why_relevant":
        return f"Directly advances the objective by clarifying the current landscape and practical options for {t}."
    if name == "title":
        titles = [
            f"Consolidated insight on {t}",
            f"Cross-source conclusion on {t}",
            f"Primary finding on {t}",
        ]
        return titles[n % len(titles)]
    if name == "question":
        questions = [
            f"Which trade-off should guide {t} in production?",
            f"Which trade-off does the ecosystem not yet resolve conclusively for {t}?",
            f"What is the evidence gap that still limits confident decisions on {t}?",
        ]
        return questions[n % len(questions)]
    if name in ("rationale", "context", "description"):
        return "The collected sources describe the available options but do not settle on a single recommendation."
    if name == "statement":
        statements = [
            f"Both sources approach {t} with shared framing but different emphasis.",
            "The two sources complement each other: one explains the model, the other the practice.",
            f"The sources largely agree on the shape of {t} but weigh the trade-offs differently.",
        ]
        return statements[n % len(statements)]
    if name == "source_a_evidence":
        return f"Source A treats {t} analytically, focusing on structure and performance."
    if name == "source_b_evidence":
        return f"Source B treats {t} as a practice, focusing on workflows and outcomes."
    if name == "complementarity_notes":
        return f"Together the sources unite the theoretical and applied views of {t}."
    if name in ("source_titles", "source_title"):
        return "collected research sources"
    return f"Material relevant to {t}."


def _derive_queries(topic: str, intent: ReportIntent) -> list[str]:
    """Derive plausible research queries that fit the objective's domain."""
    t = topic.lower()
    if intent is ReportIntent.BUILD:
        would_be = [
            f"overview, definition, and core concepts of {t}",
            f"existing implementations and open-source projects for {t}",
            f"architecture and system design of {t}",
            f"core libraries and frameworks used for {t}",
            f"benchmarks and performance comparisons of {t}",
            f"limitations, challenges, and open problems in {t}",
        ]
    elif intent is ReportIntent.STUDY:
        would_be = [
            f"historical origins and development of {t}",
            f"primary academic literature and scholarship on {t}",
            f"key figures, pioneers, and institutions connected to {t}",
            f"definitive texts, archives, and primary sources on {t}",
            f"case studies and documented examples of {t}",
            f"contemporary scholarly debates and open questions about {t}",
        ]
    else:
        would_be = [
            f"overview and definition of {t}",
            f"academic literature and evidence on {t}",
            f"key actors and institutions involved with {t}",
            f"case studies and real-world examples of {t}",
            f"contemporary debates and open questions about {t}",
        ]
    return would_be


# --- intent-aware mock synthesis and report planning -----------------------


def _mock_synthesis(topic: str, intent: ReportIntent) -> SynthesisResult:
    """Mock synthesis: engineering summaries keep tech fields, others drop them."""
    overview = _mock_scalar("overview", topic)
    if intent is ReportIntent.BUILD:
        existing_projects = _mock_list_items("existing projects", topic)
        relevant_technologies = _mock_list_items("relevant technologies", topic)
    else:
        existing_projects = []
        relevant_technologies = []
    return SynthesisResult(
        overview=overview,
        key_findings=[
            {
                "title": title,
                "summary": _mock_scalar("summary", topic, n),
                "source_titles": [_mock_scalar("title", topic, n)],
            }
            for n, title in enumerate(_mock_list_items("key findings", topic))
        ],
        existing_projects=existing_projects,
        relevant_technologies=relevant_technologies,
        important_sources=_mock_list_items("important sources", topic),
        open_questions=[
            {"question": question, "rationale": _mock_scalar("rationale", topic)}
            for question in _mock_list_items("open questions", topic)
        ],
    )


def _mock_report_outline(topic: str, intent: ReportIntent) -> ReportOutline:
    """Plan a report section set that fits the objective's domain."""
    if intent is ReportIntent.BUILD:
        planned = [
            ("Executive Summary", "One-paragraph summary of the whole report."),
            ("Key Findings", "The most important conclusions supported by the sources."),
            ("Existing Approaches", "Prior systems and existing work relevant to the objective."),
            ("Architecture and System Design", "How the recommended system is organized and why."),
            ("Core Libraries and Frameworks", "The main reusable components and frameworks."),
            ("Build Plan", "A phased roadmap from prototype to production."),
            ("Performance and Scalability", "Optimizations that matter under real load."),
            ("Open Questions", "Genuinely unresolved issues the sources could not answer."),
        ]
    elif intent is ReportIntent.STUDY:
        planned = [
            ("Executive Summary", "One-paragraph summary of the whole report."),
            ("Key Findings", "The most important conclusions supported by the sources."),
            ("Historical Origins and Development", "How the subject developed from its beginnings to today."),
            ("Primary Sources and Scholarship", "Seminal texts, archives, papers, and the academic record on the subject."),
            ("Key Figures and Institutions", "The people and organizations central to the subject."),
            ("Cultural and Economic Context", "The wider context in which the subject developed and matters."),
            ("Contemporary Debates", "Current disagreements and interpretations in the scholarship."),
            ("Open Questions", "Genuinely unresolved issues the sources could not answer."),
        ]
    else:
        planned = [
            ("Executive Summary", "One-paragraph summary of the whole report."),
            ("Key Findings", "The most important conclusions supported by the sources."),
            ("Overview and Background", "Basic facts, definitions, and framing of the subject."),
            ("Key Actors and Institutions", "Who is involved and where the subject is centered."),
            ("Evidence and Scholarship", "The academic record and the supporting data."),
            ("Case Studies", "Concrete documented examples."),
            ("Contemporary Debates", "Open questions and disagreements in the field."),
            ("Open Questions", "Genuinely unresolved issues the sources could not answer."),
        ]
    return ReportOutline(
        sections=[ReportSection(heading=heading, scope=scope) for heading, scope in planned]
    )


def _mock_report_content(topic: str, intent: ReportIntent) -> ResearchReportContent:
    """Fill the planned report headings with plausible, on-topic bullets."""
    outline = _mock_report_outline(topic, intent)
    return ResearchReportContent(
        sections=[
            ReportSectionContent(heading=section.heading, items=_section_items(section.heading, topic))
            for section in outline.sections
        ]
    )


def _section_items(heading: str, topic: str) -> list[str]:
    """Prose bullets for a dynamic report heading (mock only)."""
    key = heading.lower()
    if "summary" in key:
        return [_mock_scalar("executive_summary", topic)]
    if "finding" in key:
        return _mock_list_items("key findings", topic)
    if "history" in key or "origin" in key or "development" in key:
        return _mock_list_items("history and background", topic)
    if "figure" in key or "people" in key or "person" in key or "actor" in key or "institution" in key:
        return _mock_list_items("important people", topic)
    if "source" in key or "literature" in key or "scholar" in key or "archive" in key or "evidence" in key or "citation" in key:
        return _mock_list_items("citations", topic)
    if "concept" in key or "definition" in key or "overview" in key or "background" in key or "context" in key:
        return _mock_list_items("key concepts", topic)
    if "debate" in key or "question" in key:
        return _mock_list_items("open questions", topic)
    if "architecture" in key or "system design" in key or "structure" in key:
        return _mock_list_items("architecture and structure", topic)
    if "librar" in key or "framework" in key:
        return _mock_list_items("libraries and frameworks", topic)
    if "build" in key or "plan" in key or "roadmap" in key or "phase" in key:
        return _mock_list_items("build plan", topic)
    if "performance" in key or "scalab" in key or "optimiz" in key:
        return _mock_list_items("optimizations", topic)
    if "approach" in key or "project" in key or "implementation" in key or "case" in key or "example" in key:
        return _mock_list_items("existing projects", topic)
    return [
        f"Relevant observation on {topic} for this section.",
        f"A second observation on {topic} for this section.",
    ]


def build_llm_provider(
    api_key: str,
    model: str,
    base_url: str | None = None,
    mock_mode: str = "off",
) -> LLMProvider:
    """Construct the configured LLM provider.

    ``mock`` mode keeps the deterministic :class:`MockLLMProvider` (used by
    the hermetic test suite and explicit demo runs). With a real API key the
    OpenAI-compatible provider is used. With no key at all the keyless
    :class:`ExtractiveLLMProvider` takes over and grounds analysis in the
    actual fetched source material, so the product works without any keys.
    """
    from app.llm.extractive import build_extractive_provider

    if mock_mode == "mock":
        return MockLLMProvider()
    if api_key:
        return OpenAICompatibleProvider(api_key=api_key, model=model, base_url=base_url)
    return build_extractive_provider()