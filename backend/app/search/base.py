"""Search provider abstraction.

The pipeline talks to a :class:`SearchProvider`; concrete implementations
normalize provider-native responses into :class:`SearchResult`.
"""

from abc import ABC, abstractmethod

from app.search.models import SearchResult


class SearchProvider(ABC):
    """Interface every search backend must implement."""

    name: str = "base"

    @abstractmethod
    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        """Run a single query and return normalized results."""
        raise NotImplementedError