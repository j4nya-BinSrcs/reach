import type { Finding } from '../../types/research';
import type { Source } from '../../types/source';
import { EvidenceReference } from './EvidenceReference';

interface FindingCardProps {
  finding: Finding;
  sources: Source[];
  index: number;
}

export function FindingCard({ finding, sources, index }: FindingCardProps) {
  // Map source_ids to their global indices
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
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
        (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
      }}
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

      {/* Summary */}
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

      {/* Source references */}
      {referencedSources.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            flexWrap: 'wrap',
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
      )}
    </article>
  );
}
