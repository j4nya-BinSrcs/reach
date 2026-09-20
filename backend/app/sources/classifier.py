"""Deterministic source-type classification.

Classification uses cheap, reliable URL/domain/title heuristics before any
LLM involvement, so most sources never consume model tokens.
"""

from app.models.source import SourceType
from app.search.utils import extract_domain


def classify_source(url: str, title: str = "") -> SourceType:
    """Return a :class:`SourceType` based on deterministic signals."""
    domain = extract_domain(url)
    path = url.split("?", 1)[0].split("#", 1)[0].rstrip("/").lower()
    lowered_title = title.strip().lower()

    # --- academic papers -----------------------------------------------------
    if domain.endswith("arxiv.org") or "arxiv" in domain:
        return SourceType.PAPER
    if any(marker in domain for marker in (".acm.org", "ieee.org", "sciencedirect.com", "springer.com", ".semanticscholar.org")):
        return SourceType.PAPER

    # --- code hosting ---------------------------------------------------------
    if domain == "github.com":
        return SourceType.GITHUB
    if domain in {"gitlab.com", "bitbucket.org", "codeberg.org"}:
        return SourceType.PROJECT

    # --- documentation ---------------------------------------------------------
    if any(
        marker in path or marker in domain
        for marker in (
            "readthedocs",
            "docs.rs",
            "docs.python.org",
            "developer.mozilla.org",
            "learn.microsoft.com",
            "kubernetes.io/docs",
        )
    ) or domain.startswith("docs."):
        return SourceType.DOCUMENTATION

    # --- package/tool registries -----------------------------------------------
    if domain in {"crates.io", "npmjs.com", "pypi.org", "registry.npmjs.org"}:
        return SourceType.TOOL
    if any(marker in path for marker in ("/crates/", "/packages/", "/npm/", "/pip/", "/tool/")):
        return SourceType.TOOL

    # --- articles / blogs -------------------------------------------------------
    if domain in {"medium.com", "dev.to", "hackernoon.com", "towardsdatascience.com"}:
        return SourceType.ARTICLE
    if path.startswith("/blog") or "/blog/" in path or path.startswith("/news") or "en.wikipedia.org" == domain:
        return SourceType.ARTICLE

    # --- title heuristics -------------------------------------------------------
    if "documentation" in lowered_title or lowered_title.endswith("docs"):
        return SourceType.DOCUMENTATION
    if "paper" in lowered_title or "preprint" in lowered_title:
        return SourceType.PAPER

    return SourceType.OTHER