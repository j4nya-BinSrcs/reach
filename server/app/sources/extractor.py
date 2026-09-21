"""Deterministic content extraction — the no-LLM analysis engine.

Reads real fetched text and derives everything from it: summaries, key
points, technologies, concepts, open questions, limitations, findings and
comparisons are all *extracted* from the supplied material. Nothing here is
canned: if a term or sentence is not in the material it never appears in the
output. Used automatically when no LLM API key is configured, and as a
robustness net whenever the model layer is unavailable.
"""

import math
import re
from collections import Counter

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "for", "with", "to", "of", "in",
    "on", "at", "from", "by", "that", "this", "these", "those", "it", "its",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "can", "could", "should", "may",
    "might", "must", "shall", "not", "no", "nor", "so", "if", "then", "than",
    "when", "where", "which", "who", "whom", "whose", "what", "how", "why",
    "as", "such", "both", "each", "few", "more", "most", "other", "some",
    "any", "all", "there", "here", "about", "into", "over", "under", "again",
    "further", "once", "only", "own", "same", "too", "very", "just", "also",
    "after", "before", "between", "during", "through", "above", "below",
    "while", "because", "until", "use", "using", "used", "e.g.", "i.e.",
    "etc.", "via",
}

_QUESTION_CUES = (
    "how", "what", "why", "when", "where", "which", "who", "whether",
    "can we", "should", "does it", "is it", "are there", "i wonder",
    "remains", "unclear", "not yet", "open question", "open problem",
)

_LIMITATION_CUES = (
    "limitation", "limited", "does not", "cannot", "isn't", "aren't", "won't",
    "fail", "fails", "failure", "problem", "challenge", "drawback", "trade-off",
    "tradeoff", "unclear", "unknown", "not yet", "difficult", "hard to",
    "lacks", "missing", "out of scope", "beyond the scope", "future work",
    "however", "unfortunately",
)

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z“\"'([]|\d)")


def clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "")
    return text.strip()


def terms(text: str) -> list[str]:
    """Lowercased content words, stopwords removed."""
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9_+\-.]{1,}", text or "")
    return [token.lower().rstrip(".") for token in tokens if token.lower().rstrip(".") not in _STOPWORDS]


def split_sentences(text: str) -> list[str]:
    """Split text into cleaned, reasonably-sized sentences."""
    text = clean(text)
    if not text:
        return []
    raw = _SENTENCE_SPLIT.split(text)
    sentences: list[str] = []
    for part in raw:
        part = part.strip()
        if not (40 <= len(part) <= 500):
            continue
        if part not in sentences:
            sentences.append(part)
        if len(sentences) >= 60:
            break
    return sentences


def sentence_scores(text: str, objective: str = "") -> list[tuple[str, float]]:
    """Score sentences by information density + objective relevance."""
    sentences = split_sentences(text)
    if not sentences:
        return []
    frequencies = Counter(terms(text))
    objective_terms = set(terms(objective))
    scored: list[tuple[str, float]] = []
    for index, sentence in enumerate(sentences):
        tokens = terms(sentence)
        if not tokens:
            continue
        density = sum(frequencies.get(token, 0) for token in set(tokens)) / math.sqrt(len(tokens))
        hits = len(objective_terms & set(tokens))
        objective_weight = hits / max(len(objective_terms), 1) if objective_terms else 0.0
        position = 1.0 + 0.6 / (index + 2)
        score = 0.45 * density + 0.35 * objective_weight + 0.2 * position
        scored.append((sentence, round(float(score), 4)))
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored


def _bounded_top(scored: list[tuple[str, float]], n: int) -> list[str]:
    picked: list[str] = []
    seen: set[str] = set()
    for sentence, _ in scored:
        if len(picked) >= n:
            break
        key = re.sub(r"\W+", "", sentence.lower())
        if key in seen:
            continue
        seen.add(key)
        picked.append(sentence)
    return picked


def extractive_summary(text: str, n: int = 3) -> str:
    """A summary built from the source's own most informative sentences."""
    sentences = _bounded_top(sentence_scores(text), n)
    if sentences:
        return " ".join(sentences)
    snippet = clean(text)
    return snippet[:600]


def key_points(text: str, n: int = 5) -> list[str]:
    """Distinct high-value sentences pulled straight from the material."""
    return _bounded_top(sentence_scores(text), n)


def objective_sentences(text: str, objective: str, n: int = 2) -> list[str]:
    """The sentences most tightly tied to the research objective."""
    scores = sentence_scores(text, objective)
    candidates = sorted(scores, key=lambda pair: pair[1], reverse=True)
    return _bounded_top(candidates, n)


def technologies(text: str) -> list[str]:
    """Technology names that actually appear in the material."""
    lowered = (" " + text.lower() + " ")
    found: list[str] = []
    for name in _TECH_TERMS:
        if re.search(rf"(?<![a-z0-9]){re.escape(name)}(?![a-z0-9])", lowered):
            found.append(_TECH_LABELS.get(name, name.title()))
    return _dedupe_ordered(found)[:20]


def concepts(text: str, n: int = 6) -> list[str]:
    """Recurring content phrases extracted from the material."""
    tokens = terms(text)
    if not tokens:
        return []
    unigrams = Counter(tokens)
    bigrams = Counter(f"{a} {b}" for a, b in zip(tokens, tokens[1:], strict=False))
    combined: list[str] = []
    for phrase, count in unigrams.most_common(60):
        if count >= 2:
            combined.append((phrase, count))
    for phrase, count in bigrams.most_common(40):
        if count >= 2:
            combined.append((phrase, count))
    combined.sort(key=lambda pair: pair[1], reverse=True)
    picked: list[str] = []
    seen: set[str] = set()
    for phrase, _ in combined:
        key = phrase
        if key in seen or phrase in _STOPWORDS:
            continue
        seen.add(key)
        picked.append(phrase.title())
        if len(picked) >= n:
            break
    return picked


def open_questions(text: str, n: int = 4) -> list[str]:
    questions: list[str] = []
    for sentence in split_sentences(text):
        lowered = sentence.lower()
        is_question = sentence.rstrip().endswith("?") or any(cue in lowered for cue in _QUESTION_CUES)
        if is_question and sentence not in questions:
            questions.append(sentence)
        if len(questions) >= n:
            break
    return questions


def limitations(text: str, n: int = 4) -> list[str]:
    found: list[str] = []
    for sentence in split_sentences(text):
        if any(cue in sentence.lower() for cue in _LIMITATION_CUES) and sentence not in found:
            found.append(sentence)
        if len(found) >= n:
            break
    return found


def word_overlap(left: str, right: str) -> float:
    left_terms = set(terms(left))
    right_terms = set(terms(right))
    if not left_terms or not right_terms:
        return 0.0
    return len(left_terms & right_terms) / len(left_terms | right_terms)


def cluster_findings(sentences: list[str], threshold: float = 0.14) -> list[list[str]]:
    """Greedily cluster related sentences into themes (each theme → a finding)."""
    clusters: list[list[str]] = []
    for sentence in sentences:
        if not sentence.strip():
            continue
        placed = False
        for cluster in clusters:
            if any(word_overlap(sentence, member) >= threshold for member in cluster):
                cluster.append(sentence)
                placed = True
                break
        if not placed:
            clusters.append([sentence])
    clusters.sort(key=len, reverse=True)
    return [member for member in clusters if any(len(c) > 12 for c in member)]


def finding_title(cluster: list[str]) -> str:
    """A short, content-derived headline for a cluster of sentences."""
    counter = Counter(terms(" ".join(cluster)))
    significant = [token for token, _ in counter.most_common(8) if len(token) > 3]
    return (" ".join(significant[:4])).title()[:80] or (cluster[0][:60] + "…")


def _dedupe_ordered(items: list[str]) -> list[str]:
    seen: set[str] = set()
    kept: list[str] = []
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        kept.append(item)
    return kept


# --- technology vocabulary (used only to *detect* real terms in content) ---

_TECH_TERMS: list[str] = [
    "rust", "python", "go", "golang", "typescript", "javascript", "c++", "c#",
    "java", "kotlin", "swift", "ruby", "php", "scala", "haskell", "clojure",
    "elixir", "erlang", "ocaml", "zig", "lua", "r language", "julia", "dart",
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "django", "flask",
    "fastapi", "express", "spring", "rails", "laravel", "symfony",
    "tensorflow", "pytorch", "keras", "jax", "onnx", "llama.cpp", "hugging face",
    "apache kafka", "kafka", "redis", "postgresql", "postgres", "mysql",
    "mongodb", "elasticsearch", "tantivy", "lucene", "meilisearch", "typesense",
    "sqlite", "clickhouse", "duckdb", "rocksdb", "leveldb", "sled",
    "tokio", "rayon", "async-std", "smol", "actix-web", "axum", "rocket",
    "bevy", "wgpu", "winit", "glium", "three.js", "babylon.js", "webgpu",
    "webgl", "vulkan", "opengl", "directx", "unity", "unreal", "godot",
    "docker", "kubernetes", "k8s", "grpc", "graphql", "protobuf", "thrift",
    "webassembly", "wasm", "llvm", "clang", "cuda", "opencl", "openmp",
    "apache arrow", "erasure coding", "lmm", "retrieval-augmented generation",
    "vector database", "hybrid search", "tf-idf", "bm25", "hnsw", "ann",
    "semantic search", "embedding", "inverted index", "suffix array",
    "n-gram", "full-text search", "fst", "mmap", "lru", "bloom filter",
    "prometheus", "grafana", "opentelemetry", "nginx", "caddy", "haproxy",
    "terraform", "ansible", "pulumi", "github actions", "gitlab ci", "jenkins",
    "pagerank", "mapreduce", "spark", "hadoop", "ray", "dask", "numpy",
    "pandas", "polars", "arrow", "parquet", "avro", "iceberg", "hudi",
    "rustls", "openssl", "libreoffice", "tesseract", "ffmpeg", "opencv",
    "electron", "tauri", "flutter", "react native", "expo", "qt", "gtk",
    "egui", "iced", "slint", "leptos", "yew", "dioxus", "sycamore",
    "sqlx", "seaorm", "sqlalchemy", "prisma", "diesel", "knex",
]

_TECH_LABELS = {
    "rust": "Rust",
    "python": "Python",
    "go": "Go",
    "golang": "Go",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "c++": "C++",
    "c#": "C#",
    "java": "Java",
    "react": "React",
    "vue": "Vue",
    "angular": "Angular",
    "svelte": "Svelte",
    "next.js": "Next.js",
    "nuxt": "Nuxt",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "express": "Express",
    "spring": "Spring",
    "rails": "Rails",
    "laravel": "Laravel",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "keras": "Keras",
    "jax": "JAX",
    "onnx": "ONNX",
    "kafka": "Apache Kafka",
    "redis": "Redis",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "elasticsearch": "Elasticsearch",
    "tantivy": "Tantivy",
    "lucene": "Lucene",
    "meilisearch": "Meilisearch",
    "typesense": "Typesense",
    "sqlite": "SQLite",
    "clickhouse": "ClickHouse",
    "duckdb": "DuckDB",
    "rocksdb": "RocksDB",
    "leveldb": "LevelDB",
    "tokio": "Tokio",
    "rayon": "Rayon",
    "async-std": "async-std",
    "actix-web": "Actix-web",
    "axum": "Axum",
    "rocket": "Rocket",
    "bevy": "Bevy",
    "wgpu": "wgpu",
    "winit": "winit",
    "three.js": "Three.js",
    "webgpu": "WebGPU",
    "webgl": "WebGL",
    "vulkan": "Vulkan",
    "opengl": "OpenGL",
    "directx": "DirectX",
    "unity": "Unity",
    "unreal": "Unreal Engine",
    "godot": "Godot",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "grpc": "gRPC",
    "graphql": "GraphQL",
    "protobuf": "Protocol Buffers",
    "webassembly": "WebAssembly",
    "wasm": "WebAssembly",
    "llvm": "LLVM",
    "clang": "Clang",
    "cuda": "CUDA",
    "opencl": "OpenCL",
    "openmp": "OpenMP",
    "tf-idf": "TF-IDF",
    "bm25": "BM25",
    "hnsw": "HNSW",
    "ann": "ANN",
    "inverted index": "Inverted index",
    "suffix array": "Suffix array",
    "full-text search": "Full-text search",
    "bloom filter": "Bloom filter",
    "prometheus": "Prometheus",
    "grafana": "Grafana",
    "opentelemetry": "OpenTelemetry",
    "nginx": "Nginx",
    "terraform": "Terraform",
    "ansible": "Ansible",
    "pagerank": "PageRank",
    "mapreduce": "MapReduce",
    "pandas": "pandas",
    "polars": "Polars",
    "arrow": "Apache Arrow",
    "parquet": "Parquet",
    "flink": "Flink",
    "flutter": "Flutter",
    "tauri": "Tauri",
    "electron": "Electron",
    "egui": "egui",
    "iced": "Iced",
    "slint": "Slint",
    "leptos": "Leptos",
    "yew": "Yew",
    "dioxus": "Dioxus",
    "sqlx": "SQLx",
    "seaorm": "SeaORM",
    "sqlalchemy": "SQLAlchemy",
    "prisma": "Prisma",
    "diesel": "Diesel",
}