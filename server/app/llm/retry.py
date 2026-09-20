"""Bounded retries with exponential backoff for transient LLM failures."""

import asyncio
import logging

logger = logging.getLogger(__name__)


async def call_with_retry(
    coro_factory,
    *,
    attempts: int = 5,
    base_delay: float = 2.0,
    max_delay: float = 30.0,
    label: str = "llm call",
):
    """Run ``coro_factory()`` until it succeeds or ``attempts`` have elapsed.

    ``coro_factory`` returns a fresh awaitable for each attempt so a failed
    coroutine is never reused. Transient provider errors (rate limits, timeouts,
    5xx) self-heal with exponential backoff between attempts; when attempts are
    exhausted the last error is re-raised so the caller can respond loudly
    instead of serving placeholder content.
    """
    delay = base_delay
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return await coro_factory()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt >= attempts:
                break
            logger.warning(
                "%s attempt %d/%d failed (%s); retrying in %.1fs",
                label,
                attempt,
                attempts,
                exc,
                delay,
            )
            await asyncio.sleep(delay)
            delay = min(delay * 2, max_delay)
    assert last_exc is not None
    raise last_exc