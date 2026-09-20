"""Content parser: converts fetched HTML/text into normalized readable text.

Fetched pages are treated as untrusted input; no raw HTML is ever stored or
rendered by the frontend. We only keep plain text plus a title and
description for provenance.
"""

import logging
import re
from html import unescape

logger = logging.getLogger(__name__)

_TAGS_TO_REMOVE = {"script", "style", "noscript", "template", "svg", "iframe", "form", "nav", "footer", "header"}
_WHITESPACE = re.compile(r"[ \t\u00a0]+")
_BLANK_LINES = re.compile(r"\n{3,}")


class ParsedContent:
    """Normalized plain-text output of the parser."""

    def __init__(self, title: str = "", description: str = "", text: str = "") -> None:
        self.title = title
        self.description = description
        self.text = text


def parse_content(raw: bytes | str, content_type: str = "", max_length: int = 12_000) -> ParsedContent:
    """Parse raw HTTP body into :class:`ParsedContent`.

    HTML bodies are stripped of scripts/styles and reduced to text;
    plain bodies are cleaned of excess whitespace.
    """
    if isinstance(raw, bytes):
        text_decoded = _decode(raw, content_type)
    else:
        text_decoded = raw

    if not text_decoded.strip():
        return ParsedContent(text="")

    if _looks_like_html(raw, content_type):
        return _parse_html(text_decoded, max_length)
    return ParsedContent(text=_clean_text(text_decoded)[:max_length])


def _decode(raw: bytes, content_type: str) -> str:
    """Best-effort charset decoding of fetched bytes."""
    charset = None
    match = re.search(r"charset=([\w-]+)", content_type, re.IGNORECASE)
    if match:
        charset = match.group(1)
    for encoding in [charset, "utf-8", "latin-1"]:
        if not encoding:
            continue
        try:
            return raw.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("utf-8", errors="replace")


def _looks_like_html(raw: bytes | str, content_type: str) -> bool:
    lowered = content_type.lower()
    if "html" in lowered:
        return True
    sample = raw if isinstance(raw, str) else raw[:2048].decode("utf-8", errors="ignore")
    return "<html" in sample.lower() or bool(re.search(r"<!doctype html", sample, re.IGNORECASE))


def _parse_html(text: str, max_length: int) -> ParsedContent:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(text, "lxml")
    for tag in soup(_TAGS_TO_REMOVE):
        tag.decompose()

    title = _clean_text(soup.title.string) if soup.title and soup.title.string else ""
    description = ""
    meta = soup.find("meta", attrs={"name": lambda value: value and value.lower() == "description"})
    if meta and meta.get("content"):
        description = _clean_text(meta["content"])

    for line_break in soup(["br", "p", "h1", "h2", "h3", "h4", "li", "blockquote", "pre"])[:]:
        line_break.append("\n")

    body = soup.get_text(separator=" ")
    body_text = _clean_text(body)
    return ParsedContent(title=title[:500], description=description[:500], text=body_text[:max_length])


def _clean_text(text: str) -> str:
    text = unescape(text)
    text = _WHITESPACE.sub(" ", text)
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n")]
    lines = [line for line in lines if line]
    return _BLANK_LINES.sub("\n\n", "\n".join(lines)).strip()