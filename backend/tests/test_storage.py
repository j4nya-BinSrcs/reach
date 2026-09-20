"""Storage layer tests: schema creation and repository round-trips."""

from pathlib import Path

from app.models.finding import ComparisonPoint, Finding, ResearchGap, ResearchSynthesis, SourceComparison, SourceComparisonResult
from app.models.research import SessionStatus
from app.models.source import Source, SourceAnalysis, SourceFetchStatus, SourceType
from app.storage.database import init_db
from app.storage.repositories import ComparisonRepository, FindingRepository, SessionRepository, SourceRepository


class TestDatabase:
    def test_init_db_is_idempotent(self, db_path: Path) -> None:
        init_db(db_path)
        init_db(db_path)

        from sqlite3 import connect

        with connect(db_path) as connection:
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
            }
        assert {
            "research_sessions",
            "queries",
            "sources",
            "findings",
            "finding_sources",
            "research_gaps",
            "source_comparisons",
        } <= tables

    def test_init_db_migrates_preexisting_schema(self, tmp_path: Path) -> None:
        from app.storage.database import SCHEMA, connect

        legacy = tmp_path / "legacy.db"
        legacy_schema = SCHEMA.replace("    report      TEXT,\n", "")
        with connect(legacy) as connection:
            connection.executescript(legacy_schema)

        init_db(legacy)

        with connect(legacy) as connection:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(research_sessions)")}
        assert "report" in columns


class TestSessionRepository:
    def test_create_and_read(self, db_path: Path) -> None:
        repo = SessionRepository(db_path)
        session = repo.create_session("objective here")
        fetched = repo.get_session(session.id)
        assert fetched is not None
        assert fetched.objective == "objective here"
        assert fetched.status is SessionStatus.PLANNING

    def test_get_missing(self, db_path: Path) -> None:
        assert SessionRepository(db_path).get_session("does-not-exist") is None

    def test_update_status(self, db_path: Path, session_id: str) -> None:
        repo = SessionRepository(db_path)
        repo.update_status(session_id, SessionStatus.FETCHING, progress=40, message="Fetching")
        fetched = repo.get_session(session_id)
        assert fetched.status is SessionStatus.FETCHING
        assert fetched.progress == 40
        assert fetched.message == "Fetching"

    def test_set_error(self, db_path: Path, session_id: str) -> None:
        repo = SessionRepository(db_path)
        repo.set_error(session_id, "boom")
        fetched = repo.get_session(session_id)
        assert fetched.status is SessionStatus.FAILED
        assert fetched.error == "boom"

    def test_queries_roundtrip(self, db_path: Path, session_id: str) -> None:
        repo = SessionRepository(db_path)
        repo.add_queries(session_id, ["q1", "q2"])
        assert repo.get_queries(session_id) == ["q1", "q2"]

    def test_synthesis_roundtrip(self, db_path: Path, session_id: str) -> None:
        repo = SessionRepository(db_path)
        synthesis = ResearchSynthesis(
            overview="overview text",
            existing_projects=["Tantivy"],
            relevant_technologies=["Rust"],
        )
        repo.save_synthesis(session_id, synthesis)
        fetched = repo.get_synthesis(session_id)
        assert fetched == synthesis


class TestSourceRepository:
    def test_add_and_update(self, db_path: Path, session_id: str) -> None:
        repo = SourceRepository(db_path)
        source = Source(
            session_id=session_id,
            url="https://github.com/quickwit-oss/tantivy",
            title="Tantivy",
            source_type=SourceType.GITHUB,
            domain="github.com",
            relevance=0.9,
        )
        (source_id,) = repo.add_sources(session_id, [source])

        persisted = repo.get_source(session_id, source_id)
        assert persisted is not None
        assert persisted.title == "Tantivy"
        assert persisted.source_type is SourceType.GITHUB

        persisted.analysis = SourceAnalysis(
            summary="Full-text search engine library",
            key_points=["Fast"],
            why_relevant="Rust search engine building block",
        )
        persisted.fetch_status = SourceFetchStatus.FETCHED
        repo.update_source(persisted)

        updated = repo.get_source(session_id, source_id)
        assert updated.fetch_status is SourceFetchStatus.FETCHED
        assert updated.analysis.summary == "Full-text search engine library"

    def test_get_missing_source(self, db_path: Path, session_id: str) -> None:
        assert SourceRepository(db_path).get_source(session_id, 999) is None

    def test_order_by_relevance(self, db_path: Path, session_id: str) -> None:
        repo = SourceRepository(db_path)
        low = Source(session_id=session_id, url="https://a.example.com", relevance=0.2)
        high = Source(session_id=session_id, url="https://b.example.com", relevance=0.9)
        repo.add_sources(session_id, [low, high])
        sources = repo.get_sources(session_id)
        assert sources[0].url == "https://b.example.com"


class TestFindingRepository:
    def test_findings_with_links(self, db_path: Path, session_id: str) -> None:
        source_repo = SourceRepository(db_path)
        ids = source_repo.add_sources(
            session_id,
            [
                Source(session_id=session_id, url="https://a.example.com"),
                Source(session_id=session_id, url="https://b.example.com"),
            ],
        )

        finding_repo = FindingRepository(db_path)
        finding = Finding(
            session_id=session_id,
            title="Inverted indexes are common",
            summary="Summary text",
            supporting_source_ids=ids,
        )
        (finding_id,) = finding_repo.add_findings(session_id, [finding])
        assert finding_id > 0

        fetched = finding_repo.get_findings(session_id)
        assert len(fetched) == 1
        assert fetched[0].title == "Inverted indexes are common"
        assert set(fetched[0].supporting_source_ids) == set(ids)

    def test_gaps_roundtrip(self, db_path: Path, session_id: str) -> None:
        finding_repo = FindingRepository(db_path)
        finding_repo.add_gaps(
            session_id,
            [ResearchGap(session_id=session_id, question="How does distributed indexing scale?")],
        )
        fetched = finding_repo.get_gaps(session_id)
        assert len(fetched) == 1
        assert "distributed indexing" in fetched[0].question


class TestComparisonRepository:
    def test_comparison_roundtrip(self, db_path: Path, session_id: str) -> None:
        source_repo = SourceRepository(db_path)
        (a_id,) = source_repo.add_sources(
            session_id,
            [Source(session_id=session_id, url="https://arxiv.org/abs/1", title="Paper A", source_type=SourceType.PAPER)],
        )
        (b_id,) = source_repo.add_sources(
            session_id,
            [Source(session_id=session_id, url="https://arxiv.org/abs/2", title="Paper B", source_type=SourceType.PAPER)],
        )

        repo = ComparisonRepository(db_path)
        comparison_id = repo.add_comparison(
            SourceComparison(
                session_id=session_id,
                source_a_id=a_id,
                source_b_id=b_id,
                result=SourceComparisonResult(
                    overview="Two surveys.",
                    similarities=[ComparisonPoint(statement="Both survey indexing.")],
                    differences=[],
                    contradictions=[],
                    complementarity_notes="One covers inverted indexes, one covers LSM trees.",
                ),
            )
        )

        fetched = repo.get_comparisons(session_id)
        assert len(fetched) == 1
        assert fetched[0].id == comparison_id
        assert fetched[0].source_a_id == a_id
        assert fetched[0].source_b_id == b_id
        assert fetched[0].result.similarities[0].statement == "Both survey indexing."

        direct = repo.get_comparison(session_id, comparison_id)
        assert direct is not None
        assert "LSM trees" in direct.result.complementarity_notes

    def test_empty_when_none(self, db_path: Path, session_id: str) -> None:
        repo = ComparisonRepository(db_path)
        assert repo.get_comparisons(session_id) == []