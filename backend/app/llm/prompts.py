"""All LLM prompts live here, centralized in one module.

Each ``*_prompts`` function returns an ``(system, user)`` pair ready to be
passed to a provider. Structured prompts rely on the provider appending a
JSON-schema hint, so this file stays free of inline schema dumps.
"""

from app.models.source import Source, SourceAnalysis

# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------

PLANNER_SYSTEM = """You are the research planner of REACH, a research-intelligence engine.
Your job is to decompose a user's research objective into a focused set of search queries.

A good research plan:
- Covers multiple dimensions (core concept, existing implementations, academic
  literature, technical material, tools/libraries, benchmarks, limitations/privacy).
- ALWAYS includes at least one query targeting peer-reviewed and primary sources:
  research papers, arXiv, IEEE/ACM/Springer/Nature, semanticscholar.org, and similar.
- Uses precise, search-engine-friendly wording, including site: filters or trusted
  domain hints where they help surface authoritative material.
- Avoids seven near-identical queries.
- Stays grounded in the objective; do not invent an unrelated agenda.

Return ONLY a JSON object with a single key "queries" holding 5 to 7 search query strings."""


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
- key_findings: the most important cross-source conclusions (each 1-2 sentences),
  referencing source titles in [brackets] where useful.
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