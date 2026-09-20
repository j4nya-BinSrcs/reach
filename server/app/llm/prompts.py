"""All LLM prompts live here, centralized in one module.

Each ``*_prompts`` function returns an ``(system, user)`` pair ready to be
passed to a provider. Structured prompts rely on the provider appending a
JSON-schema hint, so this file stays free of inline schema dumps.
"""

from app.models.finding import Finding, ResearchGap, ResearchSynthesis
from app.models.report import ReportIntent, ReportOutline
from app.models.source import Source, SourceAnalysis

# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------

PLANNER_SYSTEM = """You are the research planner of REACH, a research-intelligence engine.
Your job is to decompose a user's research objective into a focused set of search queries.

Think hard about what the objective actually is and what kind of knowledge it needs — then
pick the dimensions that genuinely matter for THAT objective. Do not default to software or
engineering framing. Some examples of how to adapt:

- A historical or cultural question (e.g. "origin of coffee") wants history, primary sources,
  scholarship, key figures, archives, cultural and economic context — NOT "implementations",
  "libraries", or "benchmarks".
- A scientific question wants methods, data, results, and disagreements from the literature.
- A policy or market question wants evidence, actors, institutions, and case studies.
- An engineering/build objective ("build a search engine in Rust") wants existing
  implementations, architectures, libraries, benchmarks, and limitations.

Rules:
- Choose 4 to 6 distinct dimensions; make each query a precise, search-engine-friendly string
  that reuses the objective's own subject wording.
- ALWAYS include at least one query targeting peer-reviewed and primary sources: research
  papers, arXiv, scholarly indexes (semanticscholar.org, IEEE/ACM/Springer/Nature), or
  official archives, phrased naturally for the subject.
- Use site: filters or trusted domain hints only where they genuinely help the subject.
- Never lean on software terms ("repo", "library", "crate", "runtime", "API") for a subject
  that is not about software.
- Stay grounded in the objective; do not invent an unrelated agenda.

Return ONLY a JSON object with a single key "queries" holding 4 to 6 search query strings."""


def planner_prompts(objective: str) -> tuple[str, str]:
    """Build prompts that turn an objective into a set of search queries."""
    return PLANNER_SYSTEM, objective


# ---------------------------------------------------------------------------
# Relevance
# ---------------------------------------------------------------------------

RELEVANCE_SYSTEM = """You are a research relevance assessor for REACH.
Given a research objective and a list of candidate sources, decide for each
candidate whether it is worth fetching for this objective.

Rules:
- Prefer primary material: papers, official documentation, original repositories.
- Reject SEO pages, aggregators, and content that merely mentions the topic.
- Use deterministic signal when available; only assess what is provided.

Return ONLY a JSON object with a key "scores": an object mapping each input
item id to a relevance value between 0.0 and 1.0, and a key "notes": an
object mapping item id to a short justification."""


# ---------------------------------------------------------------------------
# Source analysis
# ---------------------------------------------------------------------------

SOURCE_ANALYSIS_SYSTEM = """You are a source analyst for REACH. You receive the content
of ONE source discovered while researching an objective.

Produce a structured analysis grounded ONLY in the supplied material:
- summary: a concise 1-3 sentence overview of what this source is about.
- key_points: 3-6 concrete points the source actually makes.
- technologies: specific technologies/languages/libraries named by the source.
- concepts: search- or topic-related concepts the source discusses.
- why_relevant: how this source advances the stated research objective.
- limitations: what the source does not cover or is unclear about.

Never invent facts that are not in the material. If the material is thin,
say so in the limitations. Return ONLY a JSON object."""


def source_analysis_prompts(
    title: str,
    url: str,
    domain: str,
    source_type: str,
    content: str,
    objective: str,
) -> tuple[str, str]:
    """Build prompts for analyzing a single source."""
    user = (
        f"RESEARCH OBJECTIVE\n{objective}\n\n"
        f"SOURCE\nTitle: {title}\nURL: {url}\nDomain: {domain}\nType: {source_type}\n\n"
        f"SOURCE CONTENT\n{content[:12000]}"
    )
    return SOURCE_ANALYSIS_SYSTEM, user


# ---------------------------------------------------------------------------
# Synthesis
# ---------------------------------------------------------------------------

SYNTHESIS_SYSTEM = """You are the research synthesizer for REACH. You receive the findings
from several independently analyzed sources for a single research objective.

Produce:
- overview: a concise 2-4 sentence research brief grounded in the supplied findings.
- key_findings: the most important cross-source conclusions. Each finding MUST include:
    title: the conclusion headline,
    summary: a 1-2 sentence summary,
    detail: a thorough 2-4 sentence explanation of WHY this finding matters,
      what it implies, and how it connects to the objective,
    source_titles: the supporting source titles in [brackets].
- existing_projects: named projects/repositories that already address part of the objective.
- relevant_technologies: technologies, libraries, and tools worth investigating.
- important_sources: the 3-6 most valuable sources, by title.
- open_questions: 2-4 genuinely unresolved questions the collected material could not answer.

Distinguish established findings from open questions. Do not speculate as fact.
Keep every item concise and skimmable. Return ONLY a JSON object."""


def synthesis_prompts(objective: str, analyses: list[SourceAnalysis], sources: list[Source]) -> tuple[str, str]:
    """Build prompts that combine analyzed sources into a research brief."""
    blocks = []
    for index, source in enumerate(sources, start=1):
        analysis = analyses[index - 1] if index - 1 < len(analyses) else SourceAnalysis()
        points = "\n".join(f"- {point}" for point in analysis.key_points)
        blocks.append(
            f"[{index}] {source.title} ({source.url})\n"
            f"   Summary: {analysis.summary}\n"
            f"   Key points:\n{points}\n"
            f"   Technologies: {', '.join(analysis.technologies)}"
        )
    user = f"RESEARCH OBJECTIVE\n{objective}\n\nANALYZED SOURCES\n" + "\n\n".join(blocks)
    return SYNTHESIS_SYSTEM, user


# ---------------------------------------------------------------------------
# Source comparison
# ---------------------------------------------------------------------------

COMPARISON_SYSTEM = """You are the source comparator for REACH. You receive the analyzed
content of TWO research sources relevant to one research objective.

Produce a careful comparison with ONLY the fields described:
- overview: 2-4 sentences summarizing how the two sources relate overall.
- similarities: points where both sources agree or say the same thing.
  Each includes statement, and evidence from source A and/or source B.
- differences: points where the sources diverge, deprioritize, or emphasize
  different angles (not necessarily contradictory).
- contradictions: points where the sources actively disagree or are
  irreconcilable. If there are none, return an empty list.
- complementarity_notes: how the two sources together cover more ground than
  either alone.

Ground every point in the supplied material; never invent facts or quotes.
Return ONLY a JSON object."""


def comparison_prompts(objective: str, source_a: Source, source_b: Source) -> tuple[str, str]:
    """Build prompts comparing two sources by their fetched content/analysis."""
    user = (
        f"RESEARCH OBJECTIVE\n{objective}\n\n"
        f"SOURCE A — {source_a.title} ({source_a.url})\n"
        f"Type: {source_a.source_type.value}\n"
        f"Summary: {(source_a.analysis.summary or '')}\n"
        f"Key points:\n"
        + "\n".join(f"- {point}" for point in source_a.analysis.key_points)
        + "\n"
        f"Content excerpt:\n{source_a.content[:5000]}\n\n"
        f"SOURCE B — {source_b.title} ({source_b.url})\n"
        f"Type: {source_b.source_type.value}\n"
        f"Summary: {(source_b.analysis.summary or '')}\n"
        f"Key points:\n"
        + "\n".join(f"- {point}" for point in source_b.analysis.key_points)
        + "\n"
        f"Content excerpt:\n{source_b.content[:5000]}"
    )
    return COMPARISON_SYSTEM, user


# ---------------------------------------------------------------------------
# Research report — the report plans its own structure for each objective
# ---------------------------------------------------------------------------

REPORT_OUTLINE_SYSTEM = """You are the report editor for REACH. Your ONLY job is to decide the
section structure of a research report for ONE specific objective. You do not write content.

Decide what the report should contain by reasoning about the objective's subject matter —
NOT by applying a generic template. For each section give:
- heading: a short, meaningful Title Case heading (2-6 words);
- scope: one sentence on what that section must cover for this objective.

Guidance:
- Base the structure on the objective's domain. A historical/cultural question wants sections
  about origins, primary sources and archives, key figures, cultural/economic context, and the
  scholarly record. A scientific question wants methods, evidence, and open disagreement. An
  engineering objective wants architecture, components, roadmap, and performance.
- Always start with "Executive Summary" and "Key Findings". Always end with "Open Questions".
- Aim for 8 to 11 sections. Do not include a section merely because it exists in some template:
  omit anything the objective does not call for (e.g. leave out architecture/build-plan sections
  unless the objective is genuinely about building something).
- Keep headings self-explanatory; do not repeat the objective verbatim in a heading.

Return ONLY a JSON object with a key "sections": a list of {"heading", "scope"}."""


def report_outline_prompts(
    objective: str,
    intent: ReportIntent,
    synthesis: ResearchSynthesis | None,
    findings: list[Finding],
) -> tuple[str, str]:
    """Build prompts that choose the report's section headings for this objective."""
    hint = {
        ReportIntent.BUILD: (
            "an engineering/build objective — this report should lead with existing approaches, "
            "architecture and design, core components/libraries, a phased build plan, and performance."
        ),
        ReportIntent.STUDY: (
            "a historical or scholarly objective — this report should lead with origins and development, "
            "primary sources and the academic record, key figures, and historical or cultural context."
        ),
        ReportIntent.GENERAL: (
            "a general objective — choose a balanced structure that fits the subject's own domain."
        ),
    }[intent]
    collected = [
        f"- {finding.title}: {finding.summary}" for finding in findings[:10]
    ]
    synthesis_block = (
        f"\nSynthesis: {synthesis.overview}" if synthesis and synthesis.overview else ""
    )
    user = (
        f"RESEARCH OBJECTIVE\n{objective}\n\n"
        f"STUDY PROFILE\n{hint}\n\n"
        f"AVAILABLE MATERIAL\n"
        f"{''.join(('' if not collected else 'Key findings:\n' + '\n'.join(collected)))}"
        f"{synthesis_block}"
    )
    return REPORT_OUTLINE_SYSTEM, user


REPORT_CONTENT_SYSTEM = """You are the report writer for REACH. You fill in the sections of a
research report that an editor already planned for a specific objective.

Each section of the outline tells you its heading and the scope it must cover. Produce a
``sections`` list where each entry has:
- heading: the outline heading, unchanged;
- items: 2-5 detailed, substantive paragraphs (not just bullets) that thoroughly cover
  that section's scope for the objective, grounded in the supplied findings, gaps,
  synthesis, and source analyses. Each paragraph should weave together evidence from
  multiple sources and explain WHY it matters, not just list facts.

Rules:
- Ground every claim in the supplied material; never invent citations, dates, people, or facts.
- Be concrete and specific; name the actual papers, sources, people, places, or figures
  where the material supports it.
- Write in full prose — each item should be a complete sentence or a short paragraph.
- Return the empty items list for a section when the material genuinely does not cover it.
- Do not pad: only include a section you can fill with meaningful, on-topic content.
- For each source, reference its analysis: key points, technologies, limitations, and
  why-relevant notes when they enrich the section.

Return ONLY a JSON object with key "sections": a list of {"heading", "items"}."""


def report_content_prompts(
    objective: str,
    outline: ReportOutline,
    intent: ReportIntent,
    sources: list[Source],
    findings: list[Finding],
    gaps: list[ResearchGap],
    synthesis: ResearchSynthesis | None,
) -> tuple[str, str]:
    """Build prompts that fill the planned report sections with typed content."""
    outline_lines = "\n".join(
        f"- {section.heading}: {section.scope}" for section in outline.sections
    )
    source_lines = "\n".join(
        f"- {source.title or source.url} ({source.url})\n"
        f"    Analysis: {source.analysis.summary or ''}\n"
        f"    Key points: {', '.join(source.analysis.key_points) if source.analysis.key_points else 'none'}\n"
        f"    Technologies: {', '.join(source.analysis.technologies) if source.analysis.technologies else 'none'}\n"
        f"    Why relevant: {source.analysis.why_relevant or ''}"
        for source in sources
        if source.analysis
    )
    finding_lines = "\n".join(
        f"- {finding.title}\n  Summary: {finding.summary}\n  Detail: {finding.detail or ''}"
        for finding in findings
    )
    gap_lines = "\n".join(
        f"- {gap.question}\n  Rationale: {gap.rationale or gap.description or ''}"
        for gap in gaps
    )
    synthesis_block = (
        (synthesis.overview if synthesis and synthesis.overview else "")
        + "\nExisting projects referenced: "
        + (", ".join(synthesis.existing_projects) if synthesis and synthesis.existing_projects else "none")
        + "\nTechnologies referenced: "
        + (", ".join(synthesis.relevant_technologies) if synthesis and synthesis.relevant_technologies else "none")
    )
    user = (
        f"RESEARCH OBJECTIVE\n{objective}\n\n"
        f"STUDY PROFILE\n{intent.value}\n\n"
        f"PLANNED SECTIONS\n{outline_lines}\n\n"
        f"SYNTHESIS BRIEF\n{synthesis_block}\n\n"
        f"KEY FINDINGS\n{finding_lines or '(none)'}\n\n"
        f"RESEARCH GAPS\n{gap_lines or '(none)'}\n\n"
        f"ANALYZED SOURCES\n{source_lines or '(none)'}"
    )
    return REPORT_CONTENT_SYSTEM, user
