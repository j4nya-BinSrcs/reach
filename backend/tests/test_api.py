"""API integration tests for the research workflow.

Runs against a FastAPI app built with mock settings: mock LLM, mock search,
and a mock fetch transport, so the whole pipeline executes hermetically.
"""

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    settings = Settings(
        mock_mode="mock",
        database_path=str(tmp_path / "reach-api.db"),
        search_max_queries=5,
        search_results_per_query=4,
    )
    with TestClient(create_app(settings=settings)) as test_client:
        yield test_client


class TestHealth:
    def test_health(self, client: TestClient) -> None:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestStartResearch:
    def test_start_returns_session_id(self, client: TestClient) -> None:
        response = client.post("/api/research", json={"objective": "Build a privacy-focused search engine using Rust"})
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        assert len(session_id) == 32

    def test_rejects_invalid_objective(self, client: TestClient) -> None:
        response = client.post("/api/research", json={"objective": "short"})
        assert response.status_code == 422

    def test_rejects_missing_body(self, client: TestClient) -> None:
        response = client.post("/api/research", json={})
        assert response.status_code == 422


class TestResearchLifecycle:
    def _session_id(self, client: TestClient) -> str:
        response = client.post("/api/research", json={"objective": "Build a privacy-focused search engine using Rust"})
        assert response.status_code == 201
        return response.json()["session_id"]

    def test_status_not_found(self, client: TestClient) -> None:
        assert client.get("/api/research/nope/status").status_code == 404

    def test_session_not_found(self, client: TestClient) -> None:
        assert client.get("/api/research/nope").status_code == 404

    def _wait_for_completion(self, client: TestClient, session_id: str) -> str:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            update = client.get(f"/api/research/{session_id}/status").json()
            if update["status"] in {"complete", "failed"}:
                return update["status"]
            time.sleep(0.05)
        return "timeout"

    def test_full_workflow(self, client: TestClient) -> None:
        session_id = self._session_id(client)
        final_status = self._wait_for_completion(client, session_id)
        assert final_status == "complete", f"session ended with {final_status}"

        detail = client.get(f"/api/research/{session_id}").json()
        assert detail["id"] == session_id
        assert detail["objective"] == "Build a privacy-focused search engine using Rust"
        assert detail["status"] == "complete"
        assert len(detail["queries"]) == 5
        assert 1 <= len(detail["sources"]) <= 15
        assert all("url" in source for source in detail["sources"])
        assert all(isinstance(source["relevance"], float) for source in detail["sources"])
        assert detail["summary"]["overview"]
        assert len(detail["findings"]) >= 1
        assert len(detail["gaps"]) >= 1

    def test_workflow_records_partial_failures_generously(self, client: TestClient) -> None:
        """Mock transport always succeeds; verify fetch_status bookkeeping."""
        session_id = self._session_id(client)
        final_status = self._wait_for_completion(client, session_id)
        assert final_status == "complete"

        detail = client.get(f"/api/research/{session_id}").json()
        fetch_statuses = {source["fetch_status"] for source in detail["sources"]}
        assert fetch_statuses  # sources exist
        assert fetch_statuses <= {"fetched", "partial", "failed", "pending"}