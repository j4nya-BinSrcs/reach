"""Shared fixtures for the backend test suite."""

from pathlib import Path

import pytest

from app.models.finding import Finding, ResearchGap, ResearchSynthesis
from app.models.research import SessionStatus, StartResearchRequest
from app.models.source import Source, SourceAnalysis, SourceType
from app.storage.database import init_db


@pytest.fixture()
def db_path(tmp_path: Path) -> Path:
    """An initialized, isolated SQLite database per test."""
    path = tmp_path / "reach-test.db"
    init_db(path)
    return path


@pytest.fixture()
def session_id(db_path: Path) -> str:
    """A persisted session id usable across repository tests."""
    from app.storage.repositories import SessionRepository

    repo = SessionRepository(db_path)
    return repo.create_session("Build a privacy-focused search engine in Rust").id