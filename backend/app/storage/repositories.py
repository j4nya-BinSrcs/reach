"""Lightweight repository layer over SQLite.

Kept deliberately simple: focused classes, no generic repository
abstractions. Each call opens a short-lived connection, which is fine for
the prototype's workload.
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models.finding import Finding, ResearchGap, ResearchSynthesis, SourceComparison, SourceComparisonResult
from app.models.report import ResearchReport
from app.models.research import ResearchSession, SessionStatus
from app.models.source import Source, SourceAnalysis, SourceFetchStatus, SourceType
from app.storage.database import session_connection

MISSING = object()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_session(row: sqlite3.Row | None) -> ResearchSession | None:
    if row is None:
        return None
    return ResearchSession(
        id=row["id"],
        objective=row["objective"],
        status=SessionStatus(row["status"]),
        progress=row["progress"],
        message=row["message"],
        error=row["error"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


class SessionRepository:
    def __init__(self, db_path: Path) -> None:
        self._path = Path(db_path)

    def create_session(self, objective: str) -> ResearchSession:
        import uuid

        session_id = uuid.uuid4().hex
        now = _now()
        with session_connection(self._path) as connection:
            connection.execute(
                "INSERT INTO research_sessions (id, objective, status, progress, message, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?)",
                (session_id, objective, SessionStatus.PLANNING.value, 0, "", now, now),
            )
        return ResearchSession(
            id=session_id,
            objective=objective,
            status=SessionStatus.PLANNING,
            progress=0,
            created_at=datetime.fromisoformat(now),
            updated_at=datetime.fromisoformat(now),
        )

    def get_session(self, session_id: str) -> ResearchSession | None:
        with session_connection(self._path) as connection:
            row = connection.execute(
                "SELECT * FROM research_sessions WHERE id = ?", (session_id,)
            ).fetchone()
        return _row_to_session(row)

    def update_status(
        self,
        session_id: str,
        status: SessionStatus,
        progress: int | None = None,
        message: str = "",
    ) -> None:
        with session_connection(self._path) as connection:
            connection.execute(
                "UPDATE research_sessions SET status = ?, progress = COALESCE(?, progress), message = ?, updated_at = ?"
                " WHERE id = ?",
                (status.value, progress, message, _now(), session_id),
            )

    def set_error(self, session_id: str, error: str) -> None:
        with session_connection(self._path) as connection:
            connection.execute(
                "UPDATE research_sessions SET status = ?, error = ?, updated_at = ? WHERE id = ?",
                (SessionStatus.FAILED.value, error, _now(), session_id),
            )

    def save_synthesis(self, session_id: str, synthesis: ResearchSynthesis) -> None:
        with session_connection(self._path) as connection:
            connection.execute(
                "UPDATE research_sessions SET synthesis = ?, updated_at = ? WHERE id = ?",
                (synthesis.model_dump_json(), _now(), session_id),
            )

    def get_synthesis(self, session_id: str) -> ResearchSynthesis | None:
        with session_connection(self._path) as connection:
            row = connection.execute(
                "SELECT synthesis FROM research_sessions WHERE id = ?", (session_id,)
            ).fetchone()
        if row is None or not row["synthesis"]:
            return None
        return ResearchSynthesis.model_validate_json(row["synthesis"])

    def save_report(self, session_id: str, report: ResearchReport) -> None:
        with session_connection(self._path) as connection:
            connection.execute(
                "UPDATE research_sessions SET report = ?, updated_at = ? WHERE id = ?",
                (report.model_dump_json(), _now(), session_id),
            )

    def get_report(self, session_id: str) -> ResearchReport | None:
        with session_connection(self._path) as connection:
            row = connection.execute(
                "SELECT report FROM research_sessions WHERE id = ?", (session_id,)
            ).fetchone()
        if row is None or not row["report"]:
            return None
        return ResearchReport.model_validate_json(row["report"])

    def add_queries(self, session_id: str, queries: list[str]) -> None:
        now = _now()
        with session_connection(self._path) as connection:
            connection.executemany(
                "INSERT INTO queries (session_id, query, created_at) VALUES (?, ?, ?)",
                [(session_id, query, now) for query in queries],
            )

    def get_queries(self, session_id: str) -> list[str]:
        with session_connection(self._path) as connection:
            rows = connection.execute(
                "SELECT query FROM queries WHERE session_id = ? ORDER BY id", (session_id,)
            ).fetchall()
        return [row["query"] for row in rows]


class SourceRepository:
    def __init__(self, db_path: Path) -> None:
        self._path = Path(db_path)

    def add_sources(self, session_id: str, sources: list[Source]) -> list[int]:
        """Insert sources and assign their ids in the same order."""
        now = _now()
        ids: list[int] = []
        with session_connection(self._path) as connection:
            for source in sources:
                cursor = connection.execute(
                    "INSERT INTO sources (session_id, url, title, source_type, domain, description, snippet,"
                    " relevance, content, fetch_status, analysis, created_at)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        session_id,
                        source.url,
                        source.title,
                        source.source_type.value,
                        source.domain,
                        source.description,
                        source.snippet,
                        source.relevance,
                        source.content,
                        source.fetch_status.value,
                        source.analysis.model_dump_json(),
                        now,
                    ),
                )
                ids.append(int(cursor.lastrowid))
        return ids

    def get_sources(self, session_id: str) -> list[Source]:
        with session_connection(self._path) as connection:
            rows = connection.execute(
                "SELECT * FROM sources WHERE session_id = ? ORDER BY relevance DESC, id", (session_id,)
            ).fetchall()
        return [self._row_to_source(row) for row in rows]

    def get_source(self, session_id: str, source_id: int) -> Source | None:
        with session_connection(self._path) as connection:
            row = connection.execute(
                "SELECT * FROM sources WHERE session_id = ? AND id = ?", (session_id, source_id)
            ).fetchone()
        return self._row_to_source(row) if row else None

    def update_source(self, source: Source) -> None:
        if source.id is None:
            raise ValueError("Cannot persist a source without an id")
        with session_connection(self._path) as connection:
            connection.execute(
                "UPDATE sources SET title = ?, source_type = ?, description = ?, snippet = ?, relevance = ?,"
                " content = ?, fetch_status = ?, analysis = ? WHERE id = ?",
                (
                    source.title,
                    source.source_type.value,
                    source.description,
                    source.snippet,
                    source.relevance,
                    source.content,
                    source.fetch_status.value,
                    source.analysis.model_dump_json(),
                    source.id,
                ),
            )

    @staticmethod
    def _row_to_source(row: sqlite3.Row) -> Source:
        return Source(
            id=row["id"],
            session_id=row["session_id"],
            url=row["url"],
            title=row["title"],
            source_type=SourceType(row["source_type"]),
            domain=row["domain"],
            description=row["description"],
            snippet=row["snippet"],
            relevance=row["relevance"],
            content=row["content"],
            fetch_status=SourceFetchStatus(row["fetch_status"]),
            analysis=SourceAnalysis.model_validate_json(row["analysis"] or "{}"),
            created_at=datetime.fromisoformat(row["created_at"]),
        )


class FindingRepository:
    def __init__(self, db_path: Path) -> None:
        self._path = Path(db_path)

    def add_findings(self, session_id: str, findings: list[Finding]) -> list[int]:
        ids: list[int] = []
        with session_connection(self._path) as connection:
            for position, finding in enumerate(findings):
                cursor = connection.execute(
                    "INSERT INTO findings (session_id, title, summary, position) VALUES (?, ?, ?, ?)",
                    (session_id, finding.title, finding.summary, position),
                )
                finding_id = int(cursor.lastrowid)
                ids.append(finding_id)
                for source_id in finding.supporting_source_ids:
                    connection.execute(
                        "INSERT OR IGNORE INTO finding_sources (finding_id, source_id) VALUES (?, ?)",
                        (finding_id, source_id),
                    )
        return ids

    def get_findings(self, session_id: str) -> list[Finding]:
        with session_connection(self._path) as connection:
            rows = connection.execute(
                "SELECT * FROM findings WHERE session_id = ? ORDER BY position, id", (session_id,)
            ).fetchall()
            link_rows = connection.execute(
                "SELECT fs.finding_id, fs.source_id"
                " FROM finding_sources fs JOIN findings f ON fs.finding_id = f.id"
                " WHERE f.session_id = ?",
                (session_id,),
            ).fetchall()
        links: dict[int, list[int]] = {}
        for row in link_rows:
            links.setdefault(row["finding_id"], []).append(row["source_id"])
        return [
            Finding(
                id=row["id"],
                session_id=row["session_id"],
                title=row["title"],
                summary=row["summary"],
                supporting_source_ids=links.get(row["id"], []),
            )
            for row in rows
        ]

    def add_gaps(self, session_id: str, gaps: list[ResearchGap]) -> list[int]:
        ids: list[int] = []
        with session_connection(self._path) as connection:
            for position, gap in enumerate(gaps):
                cursor = connection.execute(
                    "INSERT INTO research_gaps (session_id, question, rationale, position) VALUES (?, ?, ?, ?)",
                    (session_id, gap.question, gap.rationale, position),
                )
                ids.append(int(cursor.lastrowid))
        return ids

    def get_gaps(self, session_id: str) -> list[ResearchGap]:
        with session_connection(self._path) as connection:
            rows = connection.execute(
                "SELECT * FROM research_gaps WHERE session_id = ? ORDER BY position, id", (session_id,)
            ).fetchall()
        return [
            ResearchGap(id=row["id"], session_id=row["session_id"], question=row["question"], rationale=row["rationale"])
            for row in rows
        ]


def json_parse(raw: Any, default: Any = MISSING) -> Any:
    """Safe JSON decode helper (used by tests and consumers)."""
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        if default is MISSING:
            raise
        return default


class ComparisonRepository:
    def __init__(self, db_path: Path) -> None:
        self._path = Path(db_path)

    def add_comparison(self, comparison: SourceComparison) -> int:
        with session_connection(self._path) as connection:
            cursor = connection.execute(
                "INSERT INTO source_comparisons (session_id, source_a_id, source_b_id, result, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (comparison.session_id, comparison.source_a_id, comparison.source_b_id, comparison.result.model_dump_json(), _now()),
            )
            return int(cursor.lastrowid)

    def get_comparisons(self, session_id: str) -> list[SourceComparison]:
        with session_connection(self._path) as connection:
            rows = connection.execute(
                "SELECT * FROM source_comparisons WHERE session_id = ? ORDER BY id", (session_id,)
            ).fetchall()
        return [
            SourceComparison(
                id=row["id"],
                session_id=row["session_id"],
                source_a_id=row["source_a_id"],
                source_b_id=row["source_b_id"],
                result=SourceComparisonResult.model_validate_json(row["result"] or "{}"),
            )
            for row in rows
        ]

    def get_comparison(self, session_id: str, comparison_id: int) -> SourceComparison | None:
        with session_connection(self._path) as connection:
            row = connection.execute(
                "SELECT * FROM source_comparisons WHERE session_id = ? AND id = ?", (session_id, comparison_id)
            ).fetchone()
        if row is None:
            return None
        return SourceComparison(
            id=row["id"],
            session_id=row["session_id"],
            source_a_id=row["source_a_id"],
            source_b_id=row["source_b_id"],
            result=SourceComparisonResult.model_validate_json(row["result"] or "{}"),
        )