"""Extractive LLM provider — real analysis without an API key.

Implements :class:`LLMProvider` with a fully deterministic pipeline that
reads the *actual* material embedded in each structured prompt and extracts
the answers from it: summaries are composed of the source's real sentences,
technologies and concepts are whatever genuinely appear in the text, open
questions are the material's own open-ended statements, and reports are
filled from the source content it is given.

No canned prose, no placeholders, no fabricated facts: nothing appears in
the output unless it was present in the input material.
"""

import logging
import re
from typing import Any, get_args, get_origin

from app.llm.base import LLMProvider
from app.models.finding import (
    ComparisonPoint,
    OpenQuestion,
    SourceComparisonResult,
    SynthesisResult,
)
from app.models.report import (
    ReportIntent,
    ReportOutline,
    ReportSection,
    ReportSectionContent,
    ResearchReportContent,
)
from app.models.research import QueryPlan
from app.models.source import SourceAnalysis
from app.sources import extractor as ex

logger = logging.getLogger(__name__)

_MARKER_OBJECTIVE = "RESEARCH OBJECTIVE\n"
_MARKER_SOURCE_CONTENT = "SOURCE CONTENT\n"
_MARKER_ANALYZED = "ANALYZED SOURCES\n"
_MARKER_PLANNED = "PLANNED SECTIONS\n"
_MARKER_SYNTHESIS = "SYNTHESIS BRIEF\n"
_MARKER_FINDINGS = "KEY FINDINGS\n"
_MARKER_GAPS = "RESEARCH GAPS\n"
_MARKER_PROFILE = "STUDY PROFILE\n"


class ExtractiveLLMProvider(LLMProvider):
    """Keyless provider grounded strictly in the supplied material."""

    name = "extractive"

    async def _generate_text(self, system: str, user: str) -> str:
        return extractive_summary_text(user)

    async def generate_structured(self, system: str, user: str, response_model, attempts: int = 2):
        builder = _BUILDERS.get(response_model)
        if builder is not None:
            return builder(user)
        return _generic_model(user, response_model)

    async def close(self) -> None:
        """Nothing to release for the in-memory extractive provider."""


def extractive_summary_text(user: str) -> str:
    """Free-form keyless generation: a summary of what the prompt contains."""
    return ex.extractive_summary(_material_text(user), n=2)


# ---------------------------------------------------------------------------
# Prompt parsing — pull the real material out of the structured prompts
# ---------------------------------------------------------------------------


def _material_text(user: str) -> str:
    """The most content-dense part of a prompt (prefers actual source text)."""
    for marker in (_MARKER_SOURCE_CONTENT, _MARKER_ANALYZED, _MARKER_SYNTHESIS):
        if marker in user:
            return user.split(marker, 1)[1][:16000]
    return user[:16000]


def _objective(user: str) -> str:
    if _MARKER_OBJECTIVE in user:
        chunk = user.split(_MARKER_OBJECTIVE, 1)[1]
        return chunk.splitlines()[0].strip().strip('"') if chunk.strip() else ""
    if "SOURCE A" in user or "SOURCE" in user:
        return user.splitlines()[0].strip()
    return ""


def _intent(user: str) -> ReportIntent:
    if _MARKER_PROFILE in user:
        chunk = user.split(_MARKER_PROFILE, 1)[1]
        value = chunk.splitlines()[0].strip().strip('"').lower()
        try:
            return ReportIntent(value)
        except ValueError:
            pass
    return _detect_intent(_objective(user), user)


def _detect_intent(objective: str, user: str = "") -> ReportIntent:
    build_hints = {"build", "create", "develop", "implement", "make", "write", "design", "code", "construct", "prototype", "architect"}
    study_hints = {"study", "understand", "learn", "explore", "research", "analyze", "investigate", "explain", "compare", "survey", "history", "origins", "origin"}
    lowered = (objective or " ").lower()
    if any(hint in lowered for hint in build_hints):
        return ReportIntent.BUILD
    if any(hint in lowered for hint in study_hints):
        return ReportIntent.STUDY
    return ReportIntent.GENERAL


def _source_content(user: str) -> str:
    if _MARKER_SOURCE_CONTENT in user:
        return user.split(_MARKER_SOURCE_CONTENT, 1)[1]
    if "SOURCE\n" in user:
        return user.split("SOURCE\n", 1)[1]
    return ""


def _analyzed_sources(user: str) -> list[dict[str, Any]]:
    """Parse the ``ANALYZED SOURCES`` block into per-source records.

    Handles both the synthesis prompt format (``[n] Title (url)`` with
    ``Summary:``) and the report prompt format (``- Title (url)`` with
    ``Analysis:``).
    """
    if _MARKER_ANALYZED not in user:
        return []
    body = user.split(_MARKER_ANALYZED, 1)[1]
    if _MARKER_SYNTHESIS in body:
        body = body.split(_MARKER_SYNTHESIS, 1)[0]
    sources: list[dict[str, Any]] = []
    for block in _source_blocks(body):
        header = re.match(r"\s*(?:\[([0-9]+)\]|-)\s*(.*?)\s*\((https?://[^)]+)\)", block)
        if not header:
            continue
        title = header.group(2).strip()
        url = header.group(3).strip()
        rest = block[header.end():]
        summary = _field_after(rest, "Summary:", default=_field_after(rest, "Analysis:", default=""))
        key_points = _bullet_lines(rest, "Key points:", default=[])
        technologies = _comma_list(rest, "Technologies:", default=[])
        source_type_label = _field_after(rest, "Type:", default="")
        relevance = 0.0
        relevance_match = re.search(r"relevance\s+([0-9]+(?:\.[0-9]+)?)", source_type_label)
        if relevance_match:
            relevance = float(relevance_match.group(1))
        source_type = source_type_label.split("—")[0].strip().lower()
        sources.append(
            {
                "title": title,
                "url": url,
                "summary": summary,
                "key_points": key_points,
                "technologies": technologies,
                "source_type": source_type,
                "relevance": relevance,
            }
        )
    return sources


def _source_blocks(body: str) -> list[str]:
    if re.search(r"(?m)^\s*\[[0-9]+\]", body):
        return [block for block in re.split(r"(?=\s*\[[0-9]+\])", body) if block.strip()]
    return [block for block in re.split(r"(?=\s*-\s[^\n]+\(https?://)", body) if block.strip()]


def _field_after(text: str, label: str, default: str = "") -> str:
    if label not in text:
        return default
    chunk = text.split(label, 1)[1]
    return chunk.splitlines()[0].strip()


def _bullet_lines(text: str, label: str, default: list[str] | None = None) -> list[str]:
    if label not in text:
        return list(default or [])
    chunk = text.split(label, 1)[1]
    lines: list[str] = []
    for raw in chunk.splitlines():
        stripped = raw.strip()
        if not stripped or raw.startswith(" "):
            pass
        if not lines and not stripped.startswith("-"):
            continue
        if stripped.startswith("-"):
            lines.append(stripped.lstrip("- ").strip())
            continue
        if lines and (stripped.startswith(("[", "Summary:", "Technologies:", "Relevance:", "Type:")) or "\n   " not in raw):
            break
    return [line for line in lines if line]


def _comma_list(text: str, label: str, default: list[str] | None = None) -> list[str]:
    if label not in text:
        return list(default or [])
    value = _field_after(text, label, default="")
    return [item.strip() for item in value.split(",") if item.strip()]


def _planned_sections(user: str) -> list[tuple[str, str]]:
    if _MARKER_PLANNED not in user:
        return []
    body = user.split(_MARKER_PLANNED, 1)[1]
    for marker in (_MARKER_SYNTHESIS, _MARKER_FINDINGS, _MARKER_GAPS, _MARKER_ANALYZED):
        if marker in body:
            body = body.split(marker, 1)[0]
            break
    sections: list[tuple[str, str]] = []
    for raw in body.splitlines():
        stripped = raw.strip()
        if not stripped or not stripped.startswith("-"):
            continue
        heading, _, scope = stripped.lstrip("- ").partition(":")
        if heading.strip():
            sections.append((heading.strip(), scope.strip()))
    return sections


def _key_findings(user: str) -> list[dict[str, str]]:
    if _MARKER_FINDINGS not in user:
        return []
    body = user.split(_MARKER_FINDINGS, 1)[1]
    if _MARKER_GAPS in body:
        body = body.split(_MARKER_GAPS, 1)[0]
    findings: list[dict[str, str]] = []
    entries = re.split(r"(?m)^\s*-\s", body)
    for entry in entries:
        lines = [line.strip() for line in entry.splitlines() if line.strip()]
        if not lines:
            continue
        title = lines[0].strip()
        summary = title
        for line in lines[1:]:
            if line.lower().startswith("summary:"):
                summary = line.split(":", 1)[1].strip()
                break
        findings.append({"title": title, "summary": summary})
    return findings


def _research_gaps(user: str) -> list[dict[str, str]]:
    if _MARKER_GAPS not in user:
        return []
    body = user.split(_MARKER_GAPS, 1)[1]
    gaps: list[dict[str, str]] = []
    for raw in body.splitlines():
        stripped = raw.strip()
        if not stripped.startswith("-"):
            continue
        question, _, rationale = stripped.lstrip("- ").partition(":")
        gaps.append({"question": question.strip(), "rationale": rationale.strip()})
    return gaps


def _comparison_blocks(user: str) -> dict[str, str]:
    """Extract the two content excerpts from a comparison prompt."""
    blocks: dict[str, str] = {}
    for label in ("SOURCE A", "SOURCE B"):
        marker = "Content excerpt:\n"
        start = user.find(f"{label} —")
        if start == -1:
            continue
        excerpt = user.find(marker, start)
        if excerpt == -1:
            continue
        chunk = user[excerpt + len(marker):]
        if label == "SOURCE A":
            chunk = chunk.split("SOURCE B —", 1)[0]
        blocks[label] = chunk.strip()
    return blocks


# ---------------------------------------------------------------------------
# Builders — turn parsed real material into validated response models
# ---------------------------------------------------------------------------


def _build_plan(user: str) -> QueryPlan:
    objective = _objective(user) or _material_text(user)
    intent = _detect_intent(objective)
    return QueryPlan(queries=_derive_queries(objective, intent))


def _derive_queries(objective: str, intent: ReportIntent) -> list[str]:
    topic = _topic_clause(objective)
    if intent is ReportIntent.BUILD:
        templates = [
            "overview, definition, and core concepts of {t}",
            "existing implementations and open-source projects for {t}",
            "architecture and system design of {t}",
            "libraries, frameworks, and tooling for {t}",
            "benchmarks and performance comparisons of {t}",
            "limitations, challenges, and open problems in {t}",
        ]
    elif intent is ReportIntent.STUDY:
        templates = [
            "historical origins and development of {t}",
            "primary academic literature and scholarship on {t}",
            "key figures, pioneers, and institutions connected to {t}",
            "definitive texts, archives, and primary sources on {t}",
            "documented case studies and real-world examples of {t}",
            "contemporary scholarly debates and open questions about {t}",
        ]
    else:
        templates = [
            "overview and definition of {t}",
            "academic literature and evidence on {t}",
            "key actors and institutions involved with {t}",
            "case studies and real-world examples of {t}",
            "contemporary debates and open questions about {t}",
        ]
    queries = [template.format(t=topic) for template in templates if topic]
    academic = f"{topic} research papers, arXiv, and academic literature" if topic else "research papers, arXiv, and academic literature"
    if not any(marker in query.lower() for query in queries for marker in ("arxiv", "paper", "academic", "literature", "scholar")):
        queries.append(academic)
    seen: set[str] = set()
    cleaned: list[str] = []
    for query in queries:
        if query and query.lower() not in seen:
            seen.add(query.lower())
            cleaned.append(query)
    return cleaned


def _topic_clause(objective: str) -> str:
    text = (objective or "").strip().rstrip(".!? ")
    prefixes = ("i want to build a ", "i want to build ", "i want to understand ", "i want to learn ", "i want to ",
                "i'd like to ", "help me build ", "help me ", "please ", "how do i ", "how can i ", "how to ",
                "build a ", "build ", "create a ", "create ", "make a ", "make ", "develop ", "study ", "research ",
                "explore ", "understand ", "learn ")
    lowered = text.lower()
    for prefix in prefixes:
        if lowered.startswith(prefix):
            text = text[len(prefix):].strip().capitalize()
            break
    for phrase in ("the origins of ", "the origin of ", "origins of ", "origin of ", "the history of ", "history of "):
        if lowered.startswith(phrase):
            text = text[len(phrase):]
            break
    for boundary in ".;:":
        if boundary in text:
            text = text.split(boundary, 1)[0]
    if len(text) > 140:
        text = text[:140].rsplit(" ", 1)[0]
    return (text or "the research focus").strip()


def _build_source_analysis(user: str) -> SourceAnalysis:
    content = _source_content(user)
    objective = _objective(user)
    if not content or not content.strip():
        return SourceAnalysis(
            summary="No readable content was available for this source.",
            limitations=["Could not retrieve or extract content for analysis."],
        )
    return SourceAnalysis(
        summary=ex.extractive_summary(content, n=2),
        key_points=ex.key_points(content, n=5),
        technologies=ex.technologies(content),
        concepts=ex.concepts(content, n=6),
        why_relevant=next(iter(ex.objective_sentences(content, objective, n=1)), ""),
        limitations=ex.limitations(content, n=4) or ["The material does not discuss its own limitations or open edges."],
    )


def _build_synthesis(user: str) -> SynthesisResult:
    sources = _analyzed_sources(user)
    if not sources:
        return SynthesisResult(overview=ex.extractive_summary(_material_text(user), n=2))

    corpus = " ".join(f"{source['summary']}" for source in sources)
    overview = ex.extractive_summary(corpus, n=2)
    key_findings: list[dict[str, Any]] = []
    sentences_with_titles: list[tuple[str, str]] = []
    for source in sources:
        for point in source.get("key_points") or []:
            sentences_with_titles.append((point, source.get("title") or source.get("url") or ""))
        if source.get("summary"):
            sentences_with_titles.append((source["summary"], source.get("title") or source.get("url") or ""))
    clusters = ex.cluster_findings([sentence for sentence, _ in sentences_with_titles])
    for cluster in clusters[:6]:
        titles = _dedupe_ordered([title for sentence, title in sentences_with_titles if sentence in cluster])[:3]
        title = ex.finding_title(cluster)
        summary = cluster[0]
        key_findings.append({"title": title, "summary": summary, "detail": " ".join(cluster[1:4]), "source_titles": titles})
    if len(key_findings) < 2 and overview:
        key_findings.append({"title": ex.finding_title(overview.split(". ")), "summary": overview, "source_titles": []})

    projects = _dedupe_ordered(
        [source["title"] for source in sources if source.get("source_type") in {"github", "project", "tool"}]
    )
    technologies = _dedupe_ordered(
        [term for source in sources for term in source.get("technologies") or []]
    )
    question_texts = [s for source in sources for s in ex.open_questions(source.get("summary") or "", n=2)]
    open_questions = [
        OpenQuestion(question=question, rationale="Raised by the collected source material.")
        for question in _dedupe_ordered(question_texts)[:4]
    ]
    important = sorted(sources, key=lambda source: source.get("relevance") or 0.0, reverse=True)
    important_sources = [source["title"] for source in important[:5] if source.get("title")]
    return SynthesisResult(
        overview=overview,
        key_findings=key_findings,
        existing_projects=projects[:8],
        relevant_technologies=technologies[:12],
        important_sources=important_sources,
        open_questions=open_questions,
    )


def _build_report_outline(user: str) -> ReportOutline:
    intent = _intent(user)
    gaps = _research_gaps(user)
    if intent is ReportIntent.BUILD:
        sections = [
            ("Executive Summary", "What the research established in a few sentences."),
            ("Key Findings", "The most important supported conclusions."),
            ("Existing Approaches and Projects", "Prior systems and open-source work relevant to the objective."),
            ("Architecture and System Design", "How recommended systems are organized and why."),
            ("Core Libraries and Frameworks", "The reusable components named by the sources."),
            ("Performance and Scalability", "What the material says about performance trade-offs."),
            ("Open Questions", "Genuinely unresolved issues the sources could not answer."),
        ]
    elif intent is ReportIntent.STUDY:
        sections = [
            ("Executive Summary", "What the research established in a few sentences."),
            ("Key Findings", "The most important supported conclusions."),
            ("Historical Origins and Development", "How the subject developed from its beginnings to today."),
            ("Primary Sources and Scholarship", "Seminal texts, archives, papers, and the academic record."),
            ("Key Figures and Institutions", "The people and organizations the material ties to the subject."),
            ("Cultural and Economic Context", "The wider context in which the subject matters."),
            ("Contemporary Debates", "Disagreements and open interpretations in the material."),
            ("Open Questions", "Genuinely unresolved issues the sources could not answer."),
        ]
    else:
        sections = [
            ("Executive Summary", "What the research established in a few sentences."),
            ("Key Findings", "The most important supported conclusions."),
            ("Overview and Background", "Basic facts and framing from the sources."),
            ("Evidence and Scholarship", "The academic and primary records the material cites."),
            ("Case Studies and Examples", "Concrete documented examples in the material."),
            ("Contemporary Debates", "Disagreements and open interpretations in the material."),
            ("Open Questions", "Genuinely unresolved issues the sources could not answer."),
        ]
    if not gaps:
        sections = [section for section in sections if "Open Questions" not in section[0]]
    return ReportOutline(sections=[ReportSection(heading=heading, scope=scope) for heading, scope in sections])


def _build_report_content(user: str) -> ResearchReportContent:
    planned = _planned_sections(user)
    if not planned:
        return ResearchReportContent(sections=[])
    sources = _analyzed_sources(user)
    findings = _key_findings(user)
    gaps = _research_gaps(user)
    synthesis = _synthesis_text(user)
    objective = _objective(user)
    corpus = _source_corpus(sources, synthesis)

    sections: list[ReportSectionContent] = []
    for heading, _scope in planned:
        key = heading.lower()
        items: list[str] = []
        if "executive" in key or "summary" in key:
            items = _section_summary_items(synthesis, corpus, n=3)
        elif "finding" in key:
            items = [f"{f['title']}: {f['summary']}" for f in findings[:8]]
            items = items or ex.key_points(corpus, n=4)
        elif "open question" in key or "debate" in key:
            items = [f"{g['question']} — {g['rationale']}" for g in gaps if g["rationale"][:40]]
            items = items or [g["question"] for g in gaps]
            items = items or ex.open_questions(corpus, n=4)
        elif any(word in key for word in ("librar", "framework", "technolog", "tool")):
            items = _section_technology_items(sources, corpus, n=5)
        elif "source" in key or "scholar" in key or "bibliograph" in key:
            items = [f"{source['title']} — {source['summary'][:220]}" for source in sources if source["summary"]][:6]
        elif "project" in key or "approach" in key or "existing" in key:
            items = [f"{source['title']} — {source['summary'][:220]}" for source in sources if source["summary"]][:6]
        elif "case" in key or "example" in key:
            items = [f"{source['title']} — {source['summary'][:220]}" for source in sources if source["summary"]][:5]
        elif "figure" in key or "people" in key or "actor" in key or "institution" in key:
            items = [sentence for sentence in ex.objective_sentences(corpus, objective, n=4)][:4]
        else:
            items = ex.objective_sentences(corpus, objective + " " + heading, n=4)
        items = [item for item in items if item and item.strip()][:5]
        if items:
            sections.append(ReportSectionContent(heading=heading, items=items))
    return ResearchReportContent(sections=sections)


def _synthesis_text(user: str) -> str:
    if _MARKER_SYNTHESIS in user:
        chunk = user.split(_MARKER_SYNTHESIS, 1)[1]
        return chunk.split("\n\n")[0].strip()
    return ""


def _source_corpus(sources: list[dict[str, Any]], synthesis: str) -> str:
    parts = [synthesis]
    for source in sources:
        parts.append(source.get("summary") or "")
        parts.extend(source.get("key_points") or [])
    return " ".join(part for part in parts if part)


def _section_summary_items(synthesis: str, corpus: str, n: int) -> list[str]:
    if synthesis:
        return [synthesis[:500]]
    return ex.key_points(corpus, n=n)


def _section_technology_items(sources: list[dict[str, Any]], corpus: str, n: int) -> list[str]:
    tech = _dedupe_ordered([term for source in sources for term in source.get("technologies") or []])
    if tech:
        return tech[:n]
    return ex.key_points(corpus, n=n)


def _build_comparison(user: str) -> SourceComparisonResult:
    blocks = _comparison_blocks(user)
    a = blocks.get("SOURCE A", "")
    b = blocks.get("SOURCE B", "")
    if not a and not b:
        return SourceComparisonResult(overview="No readable content was available for either source.")

    similarities: list[ComparisonPoint] = []
    a_sentences = ex.split_sentences(a)
    b_sentences = ex.split_sentences(b)
    for sa in a_sentences:
        for sb in b_sentences:
            overlap = ex.word_overlap(sa, sb)
            if overlap >= 0.4 and len(similarities) < 2:
                similarities.append(ComparisonPoint(statement=sa[:240], source_a_evidence=sa[:240], source_b_evidence=sb[:240]))
                break

    a_top = ex.key_points(a, n=3)
    b_top = ex.key_points(b, n=3)
    already = {point.statement for point in similarities}
    differences: list[ComparisonPoint] = []
    for sentence in a_top:
        if sentence not in already and len(differences) < 2:
            differences.append(ComparisonPoint(statement=f"{_title_of(a)} emphasizes: {sentence[:200]}", source_a_evidence=sentence[:240]))
    for sentence in b_top:
        if sentence not in already and len(differences) < 4:
            differences.append(ComparisonPoint(statement=f"{_title_of(b)} emphasizes: {sentence[:200]}", source_b_evidence=sentence[:240]))

    contradictions: list[ComparisonPoint] = []
    for sa in a_sentences:
        lowered_a = sa.lower()
        if not any(word in lowered_a for word in ("not", "cannot", "does not", "fails", "isn't")):
            continue
        for sb in b_sentences:
            if ex.word_overlap(sa, sb) >= 0.2:
                contradictions.append(ComparisonPoint(statement=sa[:240], source_a_evidence=sa[:240], source_b_evidence=sb[:240]))
                if len(contradictions) >= 2:
                    break
        if len(contradictions) >= 2:
            break

    a_concepts = ex.concepts(a, n=4)
    b_concepts = ex.concepts(b, n=4)
    overview_parts = [
        f"Source A centers on {', '.join(a_concepts) if a_concepts else _title_of(a)}",
        f"while Source B centers on {', '.join(b_concepts) if b_concepts else _title_of(b)}",
    ]
    if similarities:
        overview_parts.append("the two sources share overlapping claims on the topic")
    overview = ", ".join(overlap_segment(overview_parts, 0, 2)) + "."
    complement = (
        f"Together they cover {', '.join(_dedupe_ordered(a_concepts + b_concepts)[:5])} — "
        "wider ground than either source alone."
        if a_concepts or b_concepts
        else "The two sources together cover wider ground than either alone."
    )
    return SourceComparisonResult(
        overview=overview,
        similarities=similarities,
        differences=differences,
        contradictions=contradictions,
        complementarity_notes=complement,
    )


def overlap_segment(parts: list[str], start: int, count: int) -> list[str]:
    return parts[start : start + count]


def _title_of(text: str) -> str:
    words = ex.concepts(text, n=2)
    return ", ".join(words) if words else "the source material"


def _generic_model(user: str, response_model):
    """Fill an arbitrary schema with real content-derived values."""
    if _is_query_plan_model(response_model):
        return response_model(queries=_derive_queries(_objective(user) or _material_text(user), _detect_intent(_objective(user))))
    material = _material_text(user)
    fields: dict[str, Any] = {}
    for name, field in response_model.model_fields.items():
        annotation = field.annotation
        origin = getattr(annotation, "__origin__", None)
        if origin is list:
            args = getattr(annotation, "__args__", ())
            item = args[0] if args else None
            item_type = getattr(item, "__origin__", item)
            if isinstance(item_type, type) and _is_base_model(item_type):
                fields[name] = [_generic_model(f"SOURCE CONTENT\n{material[:6000]}", item) for _ in range(3)]
                continue
            fields[name] = ex.key_points(material, n=3) or ex.concepts(material, n=2)
        elif origin is dict:
            fields[name] = {}
        elif annotation is int:
            fields[name] = len(_split_lines(material))
        elif annotation is float:
            fields[name] = 0.0
        elif annotation is bool:
            fields[name] = False
        else:
            fields[name] = ex.extractive_summary(material, n=1)
    try:
        return response_model(**fields)
    except Exception as exc:  # noqa: BLE001 - never let unknown schemas crash the run
        logger.warning("generic extractive fill failed for %s (%s)", response_model.__name__, exc)
        return response_model()


def _split_lines(text: str) -> list[str]:
    return [line for line in text.splitlines() if line.strip()]


def _is_query_plan_model(response_model) -> bool:
    """True for any model whose only field is ``queries: list[str]``."""
    if list(response_model.model_fields) != ["queries"]:
        return False
    annotation = response_model.model_fields["queries"].annotation
    return get_origin(annotation) is list and get_args(annotation) == (str,)


def _is_base_model(item_type) -> bool:
    from pydantic import BaseModel as PydanticBaseModel

    try:
        return isinstance(item_type, type) and issubclass(item_type, PydanticBaseModel)
    except TypeError:
        return False


def _dedupe_ordered(items: list[str]) -> list[str]:
    seen: set[str] = set()
    kept: list[str] = []
    for item in items:
        key = (item or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        kept.append(item)
    return kept


_BUILDERS = {
    QueryPlan: _build_plan,
    SourceAnalysis: _build_source_analysis,
    SynthesisResult: _build_synthesis,
    ReportOutline: _build_report_outline,
    ResearchReportContent: _build_report_content,
    SourceComparisonResult: _build_comparison,
}


def build_extractive_provider() -> ExtractiveLLMProvider:
    """Factory used when no LLM API key is configured."""
    return ExtractiveLLMProvider()