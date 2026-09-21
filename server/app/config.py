"""Application configuration loaded from environment variables.

All secrets come from the environment (or a local ``.env`` file). No real
values are ever committed to the repository; see ``.env.example``.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the REACH backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="REACH_",
        extra="ignore",
    )

    # LLM provider
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"

    # Search provider
    search_api_key: str = ""
    search_provider: str = "tavily"
    search_results_per_query: int = 10
    search_max_queries: int = 7

    # Database
    database_path: str = "../data/reach.db"

    # Fetch limits
    fetch_max_bytes: int = 300_000
    fetch_timeout_seconds: float = 15.0

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # JWT
    jwt_secret: str = "reach-dev-secret-change-me"
    jwt_expiry_minutes: int = 60 * 24  # 24 hours

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_absolute_path(self) -> Path:
        """Resolve the database path relative to the backend directory."""
        path = Path(self.database_path)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent.parent / path
        return path.resolve()


settings = Settings()