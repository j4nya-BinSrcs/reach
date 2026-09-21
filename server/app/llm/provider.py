"""Concrete LLM provider implementations and factory.

The OpenAI-compatible provider works against any OpenAI-style chat
completions endpoint. The factory wires real providers only: a live model
(optionally wrapped in the resilient fallback layer) or the keyless
content-grounded extractive provider.
"""

import logging

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


def build_llm_provider(
    api_key: str,
    model: str,
    base_url: str | None = None,
) -> LLMProvider:
    """Construct the configured LLM provider from real sources only.

    With a real API key the OpenAI-compatible provider is used, wrapped in
    the resilient layer so a flaky/rate-limited live model falls back to real
    content-grounded extraction instead of empty or canned output. With no
    key at all the keyless :class:`ExtractiveLLMProvider` handles the run
    directly.
    """
    from app.llm.extractive import build_extractive_provider
    from app.llm.resilient import ResilientLLMProvider

    if api_key:
        logger.info("LLM provider: openai-compatible live model %r with resilient content-grounded fallback", model)
        return ResilientLLMProvider(OpenAICompatibleProvider(api_key=api_key, model=model, base_url=base_url))
    logger.info("LLM provider: extractive (keyless, grounded in fetched material)")
    return build_extractive_provider()