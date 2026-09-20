import { useState } from 'react';
import { Bookmark, ArrowUpRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Source } from '../../types/source';
import { SourceBadge } from './SourceBadge';
import { ExternalLink } from '../common/ExternalLink';
import { formatSourceIndex } from '../../lib/utils';
import { updateSourceWorkspace } from '../../lib/api';

interface SourceCardProps {
  source: Source;
  index: number;
  sessionId: string;
}

export function SourceCard({ source, index, sessionId }: SourceCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const isPartial = source.fetch_status === 'partial';
  const isFailed  = source.fetch_status === 'failed';

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['research-session', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['workspace', sessionId] });
  };

  const saveMutation = useMutation({
    mutationFn: (saved: boolean) => updateSourceWorkspace(sessionId, source.id, { saved }),
    onSuccess: refresh,
  });

  return (
    <article
      id={`source-${source.id}`}
      className="animate-fade-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        animationDelay: `${index * 50}ms`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        outline: 'none',
      }}
      tabIndex={0}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(232,185,49,0.3)';
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <SourceBadge type={source.type} size="sm" />
            <span style={{ fontSize: '0.6875rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-subtle)' }}>
              [{formatSourceIndex(index)}]
            </span>
            {isPartial && (
              <span style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--amber)', background: 'var(--amber-dim)', borderRadius: 'var(--radius-xs)', padding: '0.125rem 0.375rem' }}>
                Partial
              </span>
            )}
            {isFailed && (
              <span style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--red)', background: 'var(--red-dim)', borderRadius: 'var(--radius-xs)', padding: '0.125rem 0.375rem' }}>
                Unavailable
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.35 }}>
            {source.title}
          </h3>
          <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-subtle)' }}>
            {source.domain}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          <button
            title={source.saved ? 'Unsave source' : 'Save source'}
            aria-label={source.saved ? 'Unsave source' : 'Save source'}
            aria-pressed={source.saved}
            onClick={() => saveMutation.mutate(!source.saved)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: source.saved ? 'var(--amber-dim)' : 'transparent',
              color: source.saved ? 'var(--amber)' : 'var(--text-subtle)',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={14} fill={source.saved ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <ExternalLink href={source.url} label={`Open ${source.title} in new tab`}
            style={{ flexShrink: 0, padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', fontSize: '0.75rem' }}
          >
            <ArrowUpRight size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
            Open
          </ExternalLink>
        </div>
      </div>

      {/* Analysis preview */}
      {source.analysis ? (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
            {source.analysis.summary}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              alignSelf: 'flex-start', fontSize: '0.75rem', color: 'var(--accent)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-bright)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
          >
            {expanded ? 'Show less details' : 'Show analysis details'}
          </button>
          {expanded && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '0.375rem' }}>Why relevant</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{source.analysis.why_relevant}</p>
              </div>
              {source.analysis.key_points.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '0.5rem' }}>Key points</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {source.analysis.key_points.map((point, i) => (
                      <li key={i} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        <span aria-hidden="true" style={{ marginTop: '0.5rem', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {source.analysis.technologies.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '0.375rem' }}>Technologies</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {source.analysis.technologies.map((t) => (
                      <span key={t} style={{ padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'var(--surface-elevated)', border: '1px solid var(--border)', fontSize: '0.6875rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {source.analysis.limitations.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '0.375rem' }}>Limitations</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {source.analysis.limitations.map((lim, i) => (
                      <li key={i} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        <span aria-hidden="true" style={{ marginTop: '0.5rem', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : isFailed ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          We couldn't retrieve this source. The rest of your research is still available.
        </p>
      ) : (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
          {source.snippet}
        </p>
      )}
    </article>
  );
}
