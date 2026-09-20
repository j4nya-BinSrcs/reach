import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { summarizeSource } from '../../lib/api';
import type { Source, SourceAnalysis } from '../../types/source';
import { LoadingState } from '../common/LoadingState';

interface SourceSummaryModalProps {
  sessionId: string;
  source: Source;
  onClose: () => void;
}

export function SourceSummaryModal({ sessionId, source, onClose }: SourceSummaryModalProps) {
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeSource(sessionId, source.id),
    onSuccess: (data) => setAnalysis(data),
  });

  useEffect(() => {
    summarizeMutation.mutate();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, source.id, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Focused summary for ${source.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(6,6,8,0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)' }}>
              <Sparkles size={12} aria-hidden="true" />
              Focused summary
            </span>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{source.title}</h3>
            <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{source.domain}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close focused summary"
            style={{
              flexShrink: 0,
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        {summarizeMutation.isPending && <LoadingState />}
        {summarizeMutation.isError && (
          <p style={{ fontSize: '0.875rem', color: 'var(--red)', lineHeight: 1.6 }}>
            {summarizeMutation.error instanceof Error
              ? summarizeMutation.error.message
              : 'Could not generate the focused summary. Please try again.'}
          </p>
        )}

        {analysis && (
          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Summary */}
            <div>
              <p className="label" style={{ marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Summary</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{analysis.summary}</p>
            </div>

            {/* Key points */}
            {analysis.key_points.length > 0 && (
              <div>
                <p className="label" style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Key points</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {analysis.key_points.map((point, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      <span aria-hidden="true" style={{ marginTop: '0.5rem', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technologies */}
            {analysis.technologies.length > 0 && (
              <div>
                <p className="label" style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Technologies</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {analysis.technologies.map((t) => (
                    <span key={t} style={{ padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.6875rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Concepts */}
            {analysis.concepts.length > 0 && (
              <div>
                <p className="label" style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Concepts</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {analysis.concepts.map((c) => (
                    <span key={c} style={{ padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.6875rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Why relevant */}
            {analysis.why_relevant && (
              <div>
                <p className="label" style={{ marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Why relevant</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{analysis.why_relevant}</p>
              </div>
            )}

            {/* Limitations */}
            {analysis.limitations.length > 0 && (
              <div>
                <p className="label" style={{ marginBottom: '0.5rem', color: 'var(--amber)' }}>Limitations</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {analysis.limitations.map((lim, i) => (
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
      </div>
    </div>
  );
}