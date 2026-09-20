"""URL normalization and result deduplication helpers."""

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "mtm_source",
    "mtm_medium",
    "mtm_campaign",
    "gclid",
    "fbclid",
    "ref",
    "ref_src",
    "spm",
    "mc_cid",
    "mc_eid",
    "_hsenc",
    "_hsmi",
}


def extract_domain(url: str) -> str:
    """Return the registrable-looking host for display, lowercased."""
    try:
        host = urlsplit(url).hostname or ""
    except ValueError:
        return ""
    return host.lower().lstrip("www.")


def normalize_url(url: str) -> str:
    """Normalize a URL for deduplication.

    Lowercases scheme/host, strips fragments and tracking parameters, and
    removes a trailing slash (except for the bare origin).
    """
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return url.strip()
    if not parts.scheme or not parts.netloc:
        return url.strip()
    scheme = parts.scheme.lower()
    netloc = parts.netloc.lower()
    path = parts.path.rstrip("/") or ""
    query = _strip_tracking(parts.query)
    return urlunsplit((scheme, netloc, path, query, ""))


def _strip_tracking(query: str) -> str:
    params = [(key, value) for key, value in parse_qsl(query, keep_blank_values=True) if key.lower() not in TRACKING_PARAMS]
    return urlencode(params) if params else ""


def _title_key(title: str) -> str:
    return " ".join(title.strip().lower().split())


def dedupe_results(results: list, by_url: bool = True, by_title: bool = True) -> list:
    """Deduplicate search results in order by URL and/or title.

    Accepts any objects exposing ``url`` and ``title`` attributes
    (e.g. :class:`SearchResult` or :class:`Source`).
    """
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    deduped: list = []
    for result in results:
        url = normalize_url(getattr(result, "url", ""))
        title = _title_key(getattr(result, "title", ""))
        if by_url and url in seen_urls:
            continue
        if by_title and title and title in seen_titles:
            continue
        seen_urls.add(url)
        if title:
            seen_titles.add(title)
        deduped.append(result)
    return deduped