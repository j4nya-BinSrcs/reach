"""SQLite persistence layer for the REACH backend.

The prototype persists only the compact session data needed to render a
research workspace: sessions, queries, sources, findings, and gaps.
"""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_sessions (
    id          TEXT PRIMARY KEY,
    objective   TEXT NOT NULL,
    status      TEXT NOT NULL,
    progress    INTEGER NOT NULL DEFAULT 0,
    message     TEXT NOT NULL DEFAULT '',
    error       TEXT,
    synthesis   TEXT,
    report      TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS queries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT 'other',
    domain      TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    snippet     TEXT NOT NULL DEFAULT '',
    relevance   REAL NOT NULL DEFAULT 0.0,
    content     TEXT NOT NULL DEFAULT '',
    fetch_status TEXT NOT NULL DEFAULT 'pending',
    analysis    TEXT NOT NULL DEFAULT '{}',
    starred     INTEGER NOT NULL DEFAULT 0,
    saved       INTEGER NOT NULL DEFAULT 0,
    note        TEXT NOT NULL DEFAULT '',
    tags        TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    summary     TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS finding_sources (
    finding_id  INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (finding_id, source_id)
);

CREATE TABLE IF NOT EXISTS research_gaps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    rationale   TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS source_comparisons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
    source_a_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    source_b_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    result      TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_queries_session   ON queries(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_session   ON sources(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_url       ON sources(session_id, url);
CREATE INDEX IF NOT EXISTS idx_findings_session  ON findings(session_id);
CREATE INDEX IF NOT EXISTS idx_gaps_session      ON research_gaps(session_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_session ON source_comparisons(session_id);
CREATE INDEX IF NOT EXISTS idx_users_created     ON users(created_at);
"""


_MIGRATIONS: dict[str, list[str]] = {
    "research_sessions": [
        "ALTER TABLE research_sessions ADD COLUMN report TEXT",
    ],
    "sources": [
        "ALTER TABLE sources ADD COLUMN starred INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE sources ADD COLUMN saved INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE sources ADD COLUMN note TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE sources ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
    ],
}


def connect(path: Path) -> sqlite3.Connection:
    """Open a SQLite connection with sane defaults for the prototype."""
    connection = sqlite3.connect(str(path))
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


@contextmanager
def session_connection(path: Path) -> Iterator[sqlite3.Connection]:
    """Context manager yielding a connection that commits on success."""
    connection = connect(path)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _column_name(statement: str) -> str:
    """Return the column being added by an ALTER TABLE statement."""
    return statement.replace("ADD COLUMN", "ADD COLUMN").split("ADD COLUMN", 1)[-1].split()[0]


def _migrate(connection: sqlite3.Connection) -> None:
    """Idempotently add columns introduced after the original schema."""
    for table, statements in _MIGRATIONS.items():
        existing = {
            row["name"]
            for row in connection.execute(f"PRAGMA table_info({table})")
        }
        for statement in statements:
            column = _column_name(statement)
            if column not in existing:
                connection.execute(statement)


def init_db(path: Path) -> None:
    """Create the schema (idempotent) and apply column migrations."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with session_connection(path) as connection:
        connection.executescript(SCHEMA)
        _migrate(connection)