import type { ResearchSession, ResearchProgress, ResearchStatus } from '../types/research';
import type { Source } from '../types/source';

// ── Progressive mock progress ─────────────────────────────
const PROGRESS_STEPS: Array<{ status: ResearchStatus; progress: number; message: string; queries?: number; results?: number; sources?: number }> = [
  { status: 'planning',     progress: 8,  message: 'Understanding research objective...' },
  { status: 'planning',     progress: 14, message: 'Identifying research dimensions...' },
  { status: 'searching',    progress: 22, message: 'Generating 6 targeted queries...',   queries: 3 },
  { status: 'searching',    progress: 32, message: 'Discovering sources across the web...', queries: 6, results: 18 },
  { status: 'filtering',    progress: 44, message: 'Filtering relevant results...',       queries: 6, results: 47 },
  { status: 'fetching',     progress: 54, message: 'Selecting 12 high-quality sources...', queries: 6, results: 47, sources: 8 },
  { status: 'analyzing',    progress: 65, message: 'Analyzing sources...',               queries: 6, results: 47, sources: 12 },
  { status: 'analyzing',    progress: 75, message: 'Extracting key findings...',         queries: 6, results: 47, sources: 12 },
  { status: 'synthesizing', progress: 86, message: 'Synthesizing research findings...',  queries: 6, results: 47, sources: 12 },
  { status: 'synthesizing', progress: 94, message: 'Identifying open questions...',      queries: 6, results: 47, sources: 12 },
  { status: 'complete',     progress: 100, message: 'Research complete',                 queries: 6, results: 47, sources: 12 },
];

const startTimes: Record<string, number> = {};

export function MOCK_PROGRESS(sessionId: string): ResearchProgress {
  if (!startTimes[sessionId]) startTimes[sessionId] = Date.now();
  const elapsed = Date.now() - startTimes[sessionId];
  // Each step lasts ~2.5 seconds for a ~25 second total demo
  const stepIndex = Math.min(
    Math.floor(elapsed / 2500),
    PROGRESS_STEPS.length - 1
  );
  const step = PROGRESS_STEPS[stepIndex];
  return {
    status: step.status,
    progress: step.progress,
    message: step.message,
    queries_count: step.queries,
    results_count: step.results,
    sources_count: step.sources,
  };
}

// ── Sources ───────────────────────────────────────────────
const MOCK_SOURCES: Source[] = [
  {
    id: 's1',
    session_id: 'mock-session-001',
    url: 'https://github.com/tantivy-search/tantivy',
    title: 'Tantivy — Full-text search engine library written in Rust',
    type: 'github',
    domain: 'github.com',
    description: 'Tantivy is a full-text search engine library inspired by Apache Lucene and written in Rust.',
    snippet: 'A full-text search engine library written in Rust. Tantivy is inspired by Apache Lucene and is closer to Lucene in its design than to Elasticsearch or Solr in the sense that it is not an off-the-shelf search engine server, but rather a crate that can be used to build search engines.',
    relevance: 96,
    fetch_status: 'success',
    analysis: {
      summary: 'Tantivy is a production-ready, high-performance full-text search engine library written in Rust. It provides an inverted index implementation, query parsing, and rich search features — a direct foundation for a custom search engine.',
      key_points: [
        'Implements inverted index using Rust for memory safety and performance',
        'Supports BM25 ranking, phrase queries, and range queries',
        'Apache-licensed and widely used in production systems',
        'Provides a low-level API for building specialized search engines',
      ],
      technologies: ['Rust', 'Inverted Index', 'BM25', 'Apache Lucene'],
      concepts: ['Full-text search', 'Tokenization', 'Scoring', 'Query parsing'],
      why_relevant: 'Directly addresses the objective of building a Rust-based search engine. Tantivy is the most mature and production-proven Rust search library available.',
      limitations: [
        'Library-level only — no built-in distributed or privacy features',
        'Documentation depth varies across modules',
      ],
    },
  },
  {
    id: 's2',
    session_id: 'mock-session-001',
    url: 'https://arxiv.org/abs/2301.09254',
    title: 'Privacy-Preserving Information Retrieval: A Survey',
    type: 'paper',
    domain: 'arxiv.org',
    description: 'A comprehensive survey of privacy-preserving techniques applicable to search engines and information retrieval systems.',
    snippet: 'This survey covers private information retrieval (PIR), oblivious RAM, differential privacy in IR systems, and federated search approaches. We analyze trade-offs between privacy guarantees and retrieval performance.',
    relevance: 88,
    fetch_status: 'success',
    analysis: {
      summary: 'This academic survey catalogues privacy-preserving techniques for information retrieval, including Private Information Retrieval (PIR), ORAM, differential privacy, and federated approaches. Provides a taxonomy of threat models relevant to search engine design.',
      key_points: [
        'Private Information Retrieval (PIR) prevents servers from learning which documents are queried',
        'Differential privacy can protect query logs while preserving aggregate utility',
        'Federated search distributes index computation across nodes',
        'Performance overhead for full PIR remains significant at scale',
      ],
      technologies: ['PIR', 'Differential Privacy', 'ORAM', 'Federated Search'],
      concepts: ['Query privacy', 'Access pattern leakage', 'Anonymization', 'Threat modeling'],
      why_relevant: 'Provides the academic foundation for privacy requirements in the search engine, identifying which threat models are practically addressable.',
      limitations: [
        'Most PIR schemes have O(√N) or O(N) communication complexity',
        'Few production systems deploy full PIR due to overhead',
      ],
    },
  },
  {
    id: 's3',
    session_id: 'mock-session-001',
    url: 'https://docs.meilisearch.com/learn/core_concepts/documents',
    title: 'MeiliSearch — Core Concepts Documentation',
    type: 'documentation',
    domain: 'docs.meilisearch.com',
    description: 'Official MeiliSearch documentation covering indexing, search, and relevance configuration.',
    snippet: 'MeiliSearch is an open-source, blazingly fast, and hyper-relevant search engine. It uses a LMDB-based inverted index for persistence and provides a REST API for document management.',
    relevance: 79,
    fetch_status: 'success',
    analysis: {
      summary: 'MeiliSearch documentation explains its indexing architecture using LMDB, ranking rules, and typo-tolerance. Useful as a design reference for a custom search engine.',
      key_points: [
        'Uses LMDB as the underlying storage engine for the inverted index',
        'Provides configurable ranking rules and custom synonyms',
        'Implemented in Rust — code is useful as a reference',
        'REST API design patterns are well-documented',
      ],
      technologies: ['Rust', 'LMDB', 'REST API', 'Inverted Index'],
      concepts: ['Ranking rules', 'Typo tolerance', 'Faceting', 'Index configuration'],
      why_relevant: 'As a Rust search engine, MeiliSearch source code and documentation serve as an architectural reference for building a custom Rust search engine.',
      limitations: [
        'Privacy features are minimal — no built-in query anonymization',
        'Designed for product search, not general web search',
      ],
    },
  },
  {
    id: 's4',
    session_id: 'mock-session-001',
    url: 'https://github.com/quickwit-oss/quickwit',
    title: 'Quickwit — Cloud-native search engine built in Rust',
    type: 'github',
    domain: 'github.com',
    description: 'Quickwit is a distributed search engine optimized for log and event data, built in Rust.',
    snippet: 'Quickwit is a distributed search & analytics engine built to index large amounts of data in a cost-efficient way. It is designed for cloud storage (S3) and provides sub-second search on petabyte-scale indexes.',
    relevance: 82,
    fetch_status: 'success',
    analysis: {
      summary: 'Quickwit provides a reference implementation for a distributed Rust search engine using cloud storage. Its architecture (disaggregated storage and compute) is instructive for scaling a privacy-focused search engine.',
      key_points: [
        'Built on Tantivy for the core search primitives',
        'Separates storage from compute using object storage (S3)',
        'Supports distributed indexing across multiple nodes',
        'Open source under AGPL and Apache-2.0',
      ],
      technologies: ['Rust', 'Tantivy', 'S3', 'gRPC', 'Distributed Systems'],
      concepts: ['Disaggregated storage', 'Distributed indexing', 'Log search', 'Cloud-native'],
      why_relevant: 'Shows how Tantivy scales to distributed workloads — directly relevant to understanding the architecture ceiling of a Rust-based search engine.',
      limitations: [
        'Focused on log/event data rather than web search',
        'AGPL license may impose constraints on commercial use',
      ],
    },
  },
  {
    id: 's5',
    session_id: 'mock-session-001',
    url: 'https://github.com/sbert/sbert-search',
    title: 'Semantic Search with Sentence Transformers',
    type: 'tool',
    domain: 'github.com',
    description: 'A collection of tools and examples for building semantic search engines using sentence transformers.',
    snippet: 'Semantic search using sentence-transformers and FAISS for efficient nearest-neighbor lookup. Enables meaning-based search rather than keyword matching.',
    relevance: 71,
    fetch_status: 'success',
    analysis: {
      summary: 'Demonstrates dense vector retrieval as an alternative or complement to inverted-index search. Relevant for understanding hybrid search architectures.',
      key_points: [
        'Sentence transformers encode queries and documents into dense vectors',
        'FAISS provides efficient approximate nearest-neighbor search',
        'Can be combined with BM25 for hybrid retrieval',
        'Python-based — would require FFI or a sidecar service from Rust',
      ],
      technologies: ['Python', 'FAISS', 'Transformers', 'Dense Retrieval'],
      concepts: ['Semantic search', 'Vector embeddings', 'Hybrid retrieval', 'ANN'],
      why_relevant: 'Helps evaluate whether semantic search should be included alongside keyword search in the privacy-focused engine.',
      limitations: [
        'Not Rust-native — integration requires significant engineering',
        'Embeddings can encode sensitive information if not carefully managed',
      ],
    },
  },
  {
    id: 's6',
    session_id: 'mock-session-001',
    url: 'https://www.usenix.org/system/files/nsdi22-paper-ma.pdf',
    title: 'Honeycrisp: Large-Scale Differentially Private Aggregation Without a Trusted Core',
    type: 'paper',
    domain: 'usenix.org',
    description: 'USENIX NSDI 2022 paper on large-scale differentially private aggregation systems.',
    snippet: 'We present Honeycrisp, a system for computing differentially private aggregations over large data sets without requiring a central trusted authority.',
    relevance: 74,
    fetch_status: 'partial',
    analysis: {
      summary: 'Honeycrisp describes a distributed differential privacy system at scale. Relevant to understanding how query analytics can be collected without compromising individual privacy.',
      key_points: [
        'Eliminates trusted central aggregator using cryptographic techniques',
        'Achieves meaningful privacy at large user scale',
        'Open-sources a significant portion of the implementation',
      ],
      technologies: ['Differential Privacy', 'Secure Aggregation', 'Cryptography'],
      concepts: ['Distributed DP', 'Federated analytics', 'Privacy budget'],
      why_relevant: 'Provides a concrete architecture for collecting search analytics privately — important for a production privacy-focused search engine.',
      limitations: [
        'PDF partially retrieved — some sections unavailable',
        'System complexity is high for an initial prototype',
      ],
    },
  },
  {
    id: 's7',
    session_id: 'mock-session-001',
    url: 'https://github.com/BurntSushi/ripgrep',
    title: 'ripgrep — Recursively search directories for a regex pattern',
    type: 'github',
    domain: 'github.com',
    description: 'ripgrep is a line-oriented search tool that recursively searches your current directory for a regex pattern, written in Rust.',
    snippet: 'ripgrep combines the usability of The Silver Searcher with the raw speed of GNU grep. It respects your gitignore by default and automatically skips binary files.',
    relevance: 61,
    fetch_status: 'success',
    analysis: {
      summary: 'ripgrep demonstrates high-performance regex search in Rust, particularly its use of the `regex` crate and parallel search strategies. Useful for understanding Rust search performance patterns.',
      key_points: [
        'Uses the `regex` crate with NFA/DFA hybrid matching',
        'Employs parallel file traversal with rayon',
        'Memory maps large files for efficient searching',
        'Shows practical techniques for Rust I/O performance',
      ],
      technologies: ['Rust', 'Regex', 'Rayon', 'Memory Mapping'],
      concepts: ['Parallel search', 'NFA/DFA', 'I/O optimization'],
      why_relevant: 'Provides concrete Rust performance techniques applicable to a search engine\'s indexing and query pipeline.',
      limitations: [
        'File search only — not a web search or full-text indexing engine',
        'Not directly applicable to inverted index design',
      ],
    },
  },
  {
    id: 's8',
    session_id: 'mock-session-001',
    url: 'https://brave.com/privacy/browser/',
    title: 'Brave Search — Privacy-Preserving Search Architecture',
    type: 'article',
    domain: 'brave.com',
    description: 'Technical overview of Brave Search\'s privacy-first architecture and independent index.',
    snippet: 'Brave Search uses its own independent index and does not track users, profile them, or use their search history to serve ads.',
    relevance: 85,
    fetch_status: 'success',
    analysis: {
      summary: 'Brave Search\'s architecture overview describes how a privacy-first production search engine operates at scale — no query logging, no user profiling, independent index.',
      key_points: [
        'Maintains an independent web index without user-identifying data',
        'Search requests are anonymized at the network level',
        'No cross-session query correlation',
        'Goggles system allows user-defined ranking modifications',
      ],
      technologies: ['Web Crawling', 'Anonymization', 'Independent Index'],
      concepts: ['Query anonymization', 'Zero-knowledge search', 'Independent crawling'],
      why_relevant: 'Provides a real-world example of privacy-preserving search at production scale — directly validates the feasibility of the objective.',
      limitations: [
        'Proprietary implementation details are not publicly available',
        'Scale requires significant infrastructure investment',
      ],
    },
  },
];

// ── Full mock session ─────────────────────────────────────
export const MOCK_SESSION: ResearchSession = {
  id: 'mock-session-001',
  objective: 'I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, documentation, and technologies I should investigate.',
  status: 'complete',
  created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
  queries: [
    { id: 'q1', session_id: 'mock-session-001', query: 'Rust full-text search engine library', created_at: new Date().toISOString() },
    { id: 'q2', session_id: 'mock-session-001', query: 'privacy-preserving information retrieval research', created_at: new Date().toISOString() },
    { id: 'q3', session_id: 'mock-session-001', query: 'inverted index implementation Rust', created_at: new Date().toISOString() },
    { id: 'q4', session_id: 'mock-session-001', query: 'differential privacy search engine query log', created_at: new Date().toISOString() },
    { id: 'q5', session_id: 'mock-session-001', query: 'open source privacy search engine architecture', created_at: new Date().toISOString() },
    { id: 'q6', session_id: 'mock-session-001', query: 'Rust web crawler indexer performance benchmarks', created_at: new Date().toISOString() },
  ],
  sources: MOCK_SOURCES,
  findings: [
    {
      id: 'f1',
      session_id: 'mock-session-001',
      title: 'Tantivy is the foundational Rust search library',
      summary: 'Tantivy provides a production-ready inverted index implementation in Rust, directly enabling the construction of a custom search engine without rewriting core data structures. Multiple production search engines (Quickwit, Meilisearch) build on Tantivy, validating its stability.',
      source_ids: ['s1', 's4', 's3'],
    },
    {
      id: 'f2',
      session_id: 'mock-session-001',
      title: 'Query privacy is the primary unsolved challenge',
      summary: 'The academic literature identifies query privacy — preventing a server from learning what users search for — as the hardest problem. Full Private Information Retrieval (PIR) remains computationally impractical at scale. Practical approaches use differential privacy on query logs or network-level anonymization.',
      source_ids: ['s2', 's6', 's8'],
    },
    {
      id: 'f3',
      session_id: 'mock-session-001',
      title: 'Production privacy search engines validate feasibility',
      summary: 'Brave Search demonstrates that a privacy-preserving search engine with an independent index is commercially viable. Their architecture — no query logging, anonymized network requests, independent crawl — provides a concrete blueprint.',
      source_ids: ['s8', 's2'],
    },
    {
      id: 'f4',
      session_id: 'mock-session-001',
      title: 'Distributed Rust search is already proven',
      summary: 'Quickwit shows that a distributed search engine built on Tantivy can scale to petabyte-class indexes in a cloud-native architecture. The pattern of disaggregating storage (S3) from compute is an established approach.',
      source_ids: ['s4', 's1'],
    },
  ],
  gaps: [
    {
      id: 'g1',
      title: 'Distributed indexing performance at 100M+ documents under concurrent writes',
      description: 'The collected sources do not provide concrete benchmarks for write-heavy workloads at large scale using Tantivy or Quickwit. The performance characteristics of concurrent indexing and search remain unclear for a privacy-focused workload.',
    },
    {
      id: 'g2',
      title: 'Practical PIR overhead at realistic search engine scale',
      description: 'While the survey literature documents PIR schemes, none of the collected sources provide benchmarks for PIR applied to a search index of 1M+ documents. The gap between theoretical privacy guarantees and practical search engine performance is not well-characterized.',
    },
    {
      id: 'g3',
      title: 'Rust-native network anonymization layer options',
      description: 'The sources describe anonymization at a conceptual level but do not identify production-ready Rust libraries for network-level query anonymization (e.g., equivalent to Tor integration or onion routing for search requests).',
    },
  ],
  synthesis: {
    overview: 'Building a privacy-focused search engine in Rust is technically feasible using the Tantivy library as the core inverted index. The key challenges are not in search performance — Rust excels here — but in query privacy: preventing the search server from learning what users query. Practical approaches combine network-level anonymization (as Brave Search does) with careful query log design using differential privacy. A working prototype can be built on Tantivy with a custom privacy layer.',
    key_technologies: ['Tantivy', 'Rust', 'LMDB', 'Differential Privacy', 'BM25', 'Rayon', 'gRPC'],
    existing_projects: ['Tantivy', 'Quickwit', 'MeiliSearch', 'Brave Search', 'ripgrep'],
    research_directions: [
      'Private Information Retrieval (PIR) schemes',
      'Differential privacy for query log analysis',
      'Federated search architectures',
      'Distributed Rust indexing patterns',
    ],
  },
};

