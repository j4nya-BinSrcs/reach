"""Resilient LLM wrapper: live provider with a content-grounded fallback.

Wraps a primary :class:`LLMProvider` (OpenAI-compatible, Tavily-backed runs)
so that if the live model repeatedly fails (rate limits, outages, bad
responses) the pipeline still produces **real** output: the extractive
provider re-analyzes the actual fetched material embedded in the same
prompt. Nothing is ever replaced with canned/mock prose — only with
deterministic extraction of the real content the system already fetched.
"""

import logging

from app.llm.base import LLMProvider
from app.llm.extractive import ExtractiveLLMProvider

logger = logging.getLogger(__name__)


class ResilientLLMProvider(LLMProvider):
    """Delegate to a primary LLM, falling back to the extractive provider."""

    name = "resilient"

    def __init__(self, primary: LLMProvider) -> None:
        self._primary = primary
        self._extractive = ExtractiveLLMProvider()

    async def _generate_text(self, system: str, user: str) -> str:
        try:
            return await self._primary._generate_text(system, user)
        except Exception as exc:  # noqa: BLE001
            logger.warning("live LLM text generation failed (%s); using extractive fallback", exc)
            return await self._extractive._generate_text(system, user)

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2):
        try:
            return await self._primary.generate_structured(system, user, response_model, attempts=attempts)
        except Exception as exc:  # noqa: BLE001 - degrade gracefully, never fabricate
            logger.warning(
                "live LLM structured generation for %s failed (%s); using extractive fallback",
                getattr(response_model, "__name__", response_model),
                exc,
            )
            return await self._extractive.generate_structured(system, user, response_model)

    async def close(self) -> None:
        await self._primary.close()
        await self._extractive.close()