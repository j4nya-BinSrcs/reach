"""Concrete LLM provider implementations and factory.

The OpenAI-compatible provider works against any OpenAI-style chat
completions endpoint. The mock provider returns deterministic structured
results so the pipeline and tests run without any API keys.
"""

import logging
from typing import Any

from pydantic import BaseModel

from app.llm.base import LLMProvider, LLMError

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


def _mock_topic(user: str) -> str:
    """Extract a short noun-phrase topic from a prompt (mock only).

    Structured prompts embed the objective after ``RESEARCH OBJECTIVE``; the
    planner prompt is the objective itself. The objective is reduced to a
    concise topic (stripped of imperative prefixes and trailing detail) so
    mock prose reads cleanly instead of quoting the full request.
    """
    chunk = user
    marker = "RESEARCH OBJECTIVE\n"
    if marker in chunk:
        chunk = chunk.split(marker, 1)[1]
    objective = chunk.splitlines()[0].strip().strip('"').strip() if chunk.strip() else ""
    if not objective:
        return "the research focus"

    lowered = objective.lower()
    for prefix in _TOPIC_STRIP_PREFIXES:
        if lowered.startswith(prefix):
            objective = objective[len(prefix):]
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


def _mock_text(user: str) -> str:
    return f"A brief research note on {_mock_topic(user)}, synthesized from the sources gathered during this run."


def _mock_structured(system: str, user: str, response_model):
    """Build a default mock instance for any Pydantic model."""
    return _mock_model(response_model, _mock_topic(user))


def _mock_model(response_model, topic: str, n: int = 0):
    """Fill every field of ``response_model`` with plausible, topic-aware content."""
    from typing import get_args, get_origin

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
    # The planner's query list is most useful when it resembles real queries.
    if "queries" in response_model.model_fields:
        fields["queries"] = _derive_queries(topic)
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
            f"Which trade-off does the ecosystem have not yet resolved conclusively for {topic}?",
            f"How should best practice for {topic} evolve as the ecosystem matures?",
        ]
    if label in ("key findings", "findings", "key finding"):
        return [
            f"The collected material on {topic} converges on a small set of endorsed approaches.",
            f"Sources agree broadly on the fundamentals of {topic} while differing on trade-offs.",
        ]
    if label in ("key concepts", "concepts", "concept"):
        return [
            f"Core idea in {topic}: retrieval begins with indexing and ranking, not search.",
            f"Core idea in {topic}: filter for relevance before going deep on any source.",
        ]
    if label == "history and background":
        return [
            f"How thinking on {topic} developed from first principles to current practice.",
            f"Key turning points and archives that shaped {topic}.",
        ]
    if label == "important people":
        return [
            f"Researchers and maintainers whose work defines {topic}.",
            f"Community leads who publish consistently on {topic}.",
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


def _derive_queries(topic: str) -> list[str]:
    """Derive plausible research queries from the objective text (mock only)."""
    dimensions = [
        "research papers and academic literature",
        "existing implementations and open source projects",
        "technical documentation and guides",
        "libraries and tools",
        "benchmarks and performance comparisons",
        "limitations, challenges, and open problems",
    ]
    return [f"{topic} {dimension}".strip() for dimension in dimensions]


def build_llm_provider(
    api_key: str,
    model: str,
    base_url: str | None = None,
    mock_mode: str = "off",
) -> LLMProvider:
    """Construct the configured LLM provider."""
    if mock_mode == "mock":
        return MockLLMProvider()
    return OpenAICompatibleProvider(api_key=api_key, model=model, base_url=base_url)