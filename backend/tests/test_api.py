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


class TestCompareSources:
    def _completed_session(self, client: TestClient) -> tuple[str, list[dict]]:
        response = client.post("/api/research", json={"objective": "Build a privacy-focused search engine using Rust"})
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            update = client.get(f"/api/research/{session_id}/status").json()
            if update["status"] in {"complete", "failed"}:
                break
            time.sleep(0.05)
        detail = client.get(f"/api/research/{session_id}").json()
        return session_id, detail["sources"]

    def test_compare_two_sources(self, client: TestClient) -> None:
        session_id, sources = self._completed_session(client)
        if len(sources) < 2:
            pytest.skip("mock run surfaced fewer than two sources")
        a, b = sources[0]["id"], sources[1]["id"]
        response = client.post(f"/api/research/{session_id}/compare", json={"source_a_id": a, "source_b_id": b})
        assert response.status_code == 200
        payload = response.json()
        assert payload["source_a_id"] == a
        assert payload["source_b_id"] == b
        assert isinstance(payload["result"]["overview"], str)

    def test_compare_rejects_sources_not_in_session(self, client: TestClient) -> None:
        session_id, sources = self._completed_session(client)
        a = sources[0]["id"] if sources else 1
        response = client.post(f"/api/research/{session_id}/compare", json={"source_a_id": a, "source_b_id": 999999})
        assert response.status_code == 404

    def test_list_comparisons(self, client: TestClient) -> None:
        session_id, sources = self._completed_session(client)
        assert client.get(f"/api/research/{session_id}/comparisons").json() == []


class TestReport:
    def _completed_session_id(self, client: TestClient) -> str:
        response = client.post("/api/research", json={"objective": "Build a privacy-focused search engine using Rust"})
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            update = client.get(f"/api/research/{session_id}/status").json()
            if update["status"] in {"complete", "failed"}:
                break
            time.sleep(0.05)
        return session_id

    def test_report_endpoint_returns_markdown(self, client: TestClient) -> None:
        session_id = self._completed_session_id(client)
        response = client.get(f"/api/research/{session_id}/report")
        assert response.status_code == 200
        assert "# Research Report" in response.text

    def test_report_in_detail_payload(self, client: TestClient) -> None:
        session_id = self._completed_session_id(client)
        detail = client.get(f"/api/research/{session_id}").json()
        assert detail["report"] is not None
        assert "# Research Report" in detail["report"]["markdown"]

    def test_report_not_found_for_missing_session(self, client: TestClient) -> None:
        assert client.get("/api/research/nope/report").status_code == 404


class TestWorkspace:
    def _completed_session(self, client: TestClient) -> tuple[str, list[dict]]:
        response = client.post("/api/research", json={"objective": "Build a privacy-focused search engine using Rust"})
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            update = client.get(f"/api/research/{session_id}/status").json()
            if update["status"] in {"complete", "failed"}:
                break
            time.sleep(0.05)
        detail = client.get(f"/api/research/{session_id}").json()
        return session_id, detail["sources"]

    def test_workspace_lists_all_by_default(self, client: TestClient) -> None:
        session_id, sources = self._completed_session(client)
        response = client.get(f"/api/research/{session_id}/workspace")
        assert response.status_code == 200
        assert len(response.json()) == len(sources)

    def test_star_save_tag_note_then_filters(self, client: TestClient) -> None:
        session_id, sources = self._completed_session(client)
        if not sources:
            pytest.skip("mock run surfaced no sources")
        source_id = sources[0]["id"]
        response = client.patch(
            f"/api/research/{session_id}/sources/{source_id}",
            json={"starred": True, "saved": True, "note": "must revisit", "tags": ["core", "archive"]},
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["starred"] is True
        assert updated["saved"] is True
        assert updated["note"] == "must revisit"
        assert updated["tags"] == ["core", "archive"]

        all_workspace = client.get(f"/api/research/{session_id}/workspace").json()
        assert any(source["id"] == source_id for source in all_workspace)
        starred = client.get(f"/api/research/{session_id}/workspace", params={"starred": True}).json()
        assert [source["id"] for source in starred] == [source_id]
        saved = client.get(f"/api/research/{session_id}/workspace", params={"saved": True}).json()
        assert [source["id"] for source in saved] == [source_id]

        detail = client.get(f"/api/research/{session_id}").json()
        matching = [s for s in detail["sources"] if s["id"] == source_id][0]
        assert matching["starred"] is True
        assert matching["note"] == "must revisit"

    def test_workspace_patch_unknown_source_404(self, client: TestClient) -> None:
        session_id, _ = self._completed_session(client)
        response = client.patch(
            f"/api/research/{session_id}/sources/999999",
            json={"starred": True},
        )
        assert response.status_code == 404

    def test_workspace_missing_session_404(self, client: TestClient) -> None:
        assert client.get("/api/research/nope/workspace").status_code == 404

    def test_summarize_single_source(self, client: TestClient) -> None:
        session_id, sources = self._completed_session(client)
        if not sources:
            pytest.skip("mock run surfaced no sources")
        source_id = sources[0]["id"]
        response = client.post(f"/api/research/{session_id}/sources/{source_id}/summarize")
        assert response.status_code == 200
        payload = response.json()
        assert "summary" in payload
        assert "limitations" in payload

    def test_summarize_unknown_source_404(self, client: TestClient) -> None:
        session_id, _ = self._completed_session(client)
        response = client.post(f"/api/research/{session_id}/sources/999999/summarize")
        assert response.status_code == 404