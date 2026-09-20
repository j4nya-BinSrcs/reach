import { useState } from 'react';
import type { Finding } from '../../types/research';
import type { Source } from '../../types/source';
import { EvidenceReference } from './EvidenceReference';

interface FindingCardProps {
  finding: Finding;
  sources: Source[];
  index: number;
}

export function FindingCard({ finding, sources, index }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const referencedSources = finding.source_ids.map((sid) => ({
    source: sources.find((s) => s.id === sid),
    globalIndex: sources.findIndex((s) => s.id === sid),
  })).filter((r) => r.source != null);

  return (
    <article
      className="animate-fade-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        animationDelay: `${index * 60}ms`,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Finding index */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.5rem',
          fontSize: '0.6875rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-subtle)',
          fontWeight: 500,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Eyebrow */}
      <p className="label" style={{ marginBottom: '0.625rem' }}>
        Key Finding
      </p>

      {/* Title */}
      <h3
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
          marginBottom: '0.625rem',
          lineHeight: 1.4,
          paddingRight: '2rem',
        }}
      >
        {finding.title}
      </h3>

      {/* Summary — always visible */}
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          lineHeight: 1.7,
          marginBottom: referencedSources.length > 0 ? '1rem' : 0,
        }}
      >
        {finding.summary}
      </p>

      {/* Expandable detail */}
      {referencedSources.length > 0 && (
        <div
          style={{
            maxHeight: expanded ? '600px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              flexWrap: 'wrap',
              paddingTop: expanded ? '0.75rem' : '0',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-subtle)',
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginRight: '0.125rem',
              }}
            >
              Supported by
            </span>
            {referencedSources.map(({ source, globalIndex }) => (
              <EvidenceReference
                key={source!.id}
                sourceIndex={globalIndex}
                source={source}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expand hint */}
      <span
        style={{
          position: 'absolute',
          bottom: '0.75rem',
          right: '1.5rem',
          fontSize: '0.6875rem',
          color: 'var(--text-subtle)',
          transition: 'opacity 0.2s ease',
          opacity: expanded ? 0 : 1,
        }}
      >
        {expanded ? '▲ less' : '▼ more'}
      </span>
    </article>
  );
}
