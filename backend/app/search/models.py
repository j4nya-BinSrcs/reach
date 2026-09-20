"""Normalized search result model and provider contracts."""

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    """A normalized, provider-agnostic search result.

    Every provider implementation converts its native response into this
    shape so the rest of the pipeline never depends on provider specifics.
    """

    title: str
    url: str
    snippet: str = ""
    source_domain: str = ""
    score: float | None = Field(default=None, ge=0.0, le=1.0)
    query: str = ""


class SearchQuery(BaseModel):
    """A single generated search query with a research dimension label."""

    query: str
    dimension: str = "general"