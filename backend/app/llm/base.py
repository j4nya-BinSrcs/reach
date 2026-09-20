"""LLM provider abstraction and structured-output machinery.

All research intelligence flows through an :class:`LLMProvider`. Concrete
providers only implement raw text generation; the base class owns JSON
extraction, schema validation, and bounded retries so every structured
operation is validated.
"""

from abc import ABC, abstractmethod
import json
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    """Raised when the underlying model call fails."""


class StructuredOutputError(Exception):
    """Raised when a structured output cannot be parsed or validated."""


class LLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def _generate_text(self, system: str, user: str) -> str:
        """Return raw model text for a single exchange."""
        raise NotImplementedError

    async def generate(self, system: str, user: str) -> str:
        """Free-form generation."""
        try:
            return await self._generate_text(system, user)
        except LLMError:
            raise
        except Exception as exc:  # pragma: no cover - defensive
            raise LLMError(f"LLM call failed: {exc}") from exc

    async def generate_structured(
        self,
        system: str,
        user: str,
        response_model: type[T],
        attempts: int = 2,
    ) -> T:
        """Generate output validated against *response_model*.

        Parsing failures (malformed JSON, schema violations) trigger a
        single bounded retry. After that a :class:`StructuredOutputError`
        is raised so callers can degrade gracefully.
        """
        last_error: Exception | None = None
        schema_hint = json.dumps(response_model.model_json_schema())
        schema_system = f"{system}\n\nRespond with ONLY a single JSON object matching this schema:\n{schema_hint}"
        for attempt in range(max(1, attempts)):
            try:
                raw = await self._generate_text(schema_system, user)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                continue
            try:
                return parse_structured_output(raw, response_model)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
        raise StructuredOutputError(str(last_error or "unknown structured output failure"))


# --- parsing helpers --------------------------------------------------------


def strip_code_fences(text: str) -> str:
    """Remove markdown code fences and leading/trailing prose noise."""
    text = text.strip()
    if text.startswith("```"):
        first_line = text.find("\n")
        if first_line == -1:
            return ""
        text = text[first_line + 1 :]
        if text.endswith("```"):
            text = text[:-3].rstrip()
    return text.strip()


def parse_structured_output(text: str, response_model: type[T]) -> T:
    """Extract and validate a JSON object from raw model text."""
    import json

    from pydantic import ValidationError

    cleaned = strip_code_fences(text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise StructuredOutputError("no JSON object found in model output")
    try:
        payload = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as exc:
        raise StructuredOutputError(f"invalid JSON in model output: {exc}") from exc
    try:
        return response_model.model_validate(payload)
    except ValidationError as exc:
        raise StructuredOutputError(f"model output failed schema validation: {exc}") from exc