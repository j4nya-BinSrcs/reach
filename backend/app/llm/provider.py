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
    handler builds plausible mock data for the research pipeline's known
    schemas; callers may inject a custom handler for targeted tests.
    """

    name = "mock"

    def __init__(self, handler: Any = None) -> None:
        self._handler = handler or _mock_structured

    async def _generate_text(self, system: str, user: str) -> str:
        return "Mock model output for the REACH demo pipeline."

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2) -> BaseModel:
        # Deliberately bypasses JSON: the mock builds validated models directly.
        result = self._handler(system, user, response_model)
        if isinstance(result, dict):
            return response_model.model_validate(result)
        return result


def _mock_structured(system: str, user: str, response_model):
    """Build a default mock instance for any Pydantic model."""
    from typing import get_args, get_origin

    fields = {}
    for name, field in response_model.model_fields.items():
        origin = get_origin(field.annotation)
        if origin is list:
            args = get_args(field.annotation)
            item_type = args[0] if args else None
            fields[name] = _build_list_items(name, item_type)
        elif origin is dict:
            fields[name] = {}
        else:
            fields[name] = f"Mock {name.replace('_', ' ')}."
    # The planner's query list is most useful when it resembles real queries.
    if "queries" in response_model.model_fields:
        fields["queries"] = _derive_queries(user)
    return response_model(**fields)


def _build_list_items(name: str, item_type) -> list:
    """Fill a list field: nested models recursively, strings as items."""
    if isinstance(item_type, type) and issubclass(item_type, BaseModel):
        return [_mock_structured("", "", item_type) for _ in range(2)]
    label = name.replace("_", " ")
    return [f"Mock {label} item 1", f"Mock {label} item 2"]


def _derive_queries(user: str) -> list[str]:
    """Derive plausible research queries from the objective text (mock only)."""
    topic = user.strip().replace("\n", " ").strip()
    if len(topic) > 140:
        topic = topic[:140].rsplit(" ", 1)[0]
    dimensions = [
        "research papers and academic literature",
        "existing implementations and open source projects",
        "technical documentation and guides",
        "libraries and tools",
        "benchmarks and performance comparisons",
        "limitations, challenges, and open problems",
    ]
    prefix = topic if topic else "the research objective"
    return [f"{prefix} {dimension}" for dimension in dimensions]


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