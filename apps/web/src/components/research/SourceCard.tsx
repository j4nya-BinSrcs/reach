import { useState } from 'react';
import { Star, Bookmark, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Source } from '../../types/source';
import { SourceBadge } from './SourceBadge';
import { SourceSummaryModal } from './SourceSummaryModal';
import { ExternalLink } from '../common/ExternalLink';
import { formatSourceIndex } from '../../lib/utils';
import { updateSourceWorkspace } from '../../lib/api';

const compactBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.3125rem 0.625rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

interface SourceCardProps {
  source: Source;
  index: number;
  sessionId: string;
}

export function SourceCard({ source, index, sessionId }: SourceCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState(source.tags.join(', '));
  const [noteInput, setNoteInput] = useState(source.note);
  const [editingNote, setEditingNote] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isPartial = source.fetch_status === 'partial';
  const isFailed  = source.fetch_status === 'failed';

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['research-session', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['workspace', sessionId] });
  };

  const starMutation = useMutation({
    mutationFn: (starred: boolean) => updateSourceWorkspace(sessionId, source.id, { starred }),
    onSuccess: refresh,
  });

  const saveMutation = useMutation({
    mutationFn: (saved: boolean) => updateSourceWorkspace(sessionId, source.id, { saved }),
    onSuccess: refresh,
  });

  const tagsMutation = useMutation({
    mutationFn: (tags: string[]) => updateSourceWorkspace(sessionId, source.id, { tags }),
    onSuccess: refresh,
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => updateSourceWorkspace(sessionId, source.id, { note }),
    onSuccess: refresh,
  });

  return (
    <article
      id={`source-${source.id}`}
      className="animate-fade-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
        animationDelay: `${index * 50}ms`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        outline: 'none',
      }}
      tabIndex={0}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border-strong)';
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow = 'none';
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.35)';
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <SourceBadge type={source.type} size="sm" />
            {/* Index */}
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-subtle)',
              }}
              aria-label={`Source ${index + 1}`}
            >
              [{formatSourceIndex(index)}]
            </span>
            {isPartial && (
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--amber)',
                  background: 'var(--amber-dim)',
                  border: '1px solid rgba(232,168,76,0.2)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.125rem 0.375rem',
                }}
                aria-label="Partially retrieved"
              >
                Partial
              </span>
            )}
            {isFailed && (
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--red)',
                  background: 'var(--red-dim)',
                  border: '1px solid rgba(232,92,92,0.2)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.125rem 0.375rem',
                }}
                aria-label="Could not retrieve"
              >
                Unavailable
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.35,
            }}
          >
            {source.title}
          </h3>

          {/* Domain */}
          <span
            className="mono-text"
            style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}
          >
            {source.domain}
          </span>
        </div>

        {/* Open original */}
        <ExternalLink
          href={source.url}
          label={`Open ${source.title} in new tab`}
          style={{
            flexShrink: 0,
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'transparent',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
          }}
        >
          Open ↗
        </ExternalLink>

        {/* Workspace actions */}
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          <button
            title={source.starred ? 'Remove star' : 'Star source'}
            aria-label={source.starred ? 'Remove star' : 'Star source'}
            aria-pressed={source.starred}
            onClick={() => starMutation.mutate(!source.starred)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: source.starred ? 'var(--amber-dim)' : 'transparent',
              color: source.starred ? 'var(--amber)' : 'var(--text-subtle)',
              cursor: 'pointer',
            }}
          >
            <Star size={14} fill={source.starred ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <button
            title={source.saved ? 'Unsave source' : 'Save source'}
            aria-label={source.saved ? 'Unsave source' : 'Save source'}
            aria-pressed={source.saved}
            onClick={() => saveMutation.mutate(!source.saved)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: source.saved ? 'var(--green-dim)' : 'transparent',
              color: source.saved ? 'var(--green)' : 'var(--text-subtle)',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={14} fill={source.saved ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <button
            title="Summarize this source"
            aria-label="Summarize this source"
            onClick={() => setSummaryOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tags + note */}
      {(source.tags.length > 0 || source.note || editingTags || editingNote) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {source.tags.length > 0 && !editingTags && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {source.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '0.1875rem 0.5rem',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    fontSize: '0.6875rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--accent)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {source.note && !editingNote && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {source.note}
            </p>
          )}
        </div>
      )}

      {editingTags && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                tagsMutation.mutate(tagInput.split(',').map((t) => t.trim()).filter(Boolean));
                setEditingTags(false);
              }
            }}
            aria-label="Tags (comma separated)"
            placeholder="core, reference, archive"
            style={{
              flex: 1,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.4375rem 0.625rem',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => {
              tagsMutation.mutate(tagInput.split(',').map((t) => t.trim()).filter(Boolean));
              setEditingTags(false);
            }}
            style={{ ...compactBtn, color: 'var(--accent)' }}
          >
            Save tags
          </button>
        </div>
      )}

      {editingNote && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                noteMutation.mutate(noteInput.trim());
                setEditingNote(false);
              }
            }}
            aria-label="Note"
            placeholder="Add a note about this source…"
            style={{
              flex: 1,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.4375rem 0.625rem',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => {
              noteMutation.mutate(noteInput.trim());
              setEditingNote(false);
            }}
            style={{ ...compactBtn, color: 'var(--accent)' }}
          >
            Save note
          </button>
        </div>
      )}

      {source.saved && !editingNote && (
        <button
          onClick={() => setEditingNote(true)}
          style={{
            ...compactBtn,
            alignSelf: 'flex-start',
            color: 'var(--text-muted)',
          }}
        >
          {source.note ? 'Edit note' : 'Add note'}
        </button>
      )}
      {!source.saved && !editingNote && !source.note && (
        <button
          onClick={() => setEditingNote(true)}
          style={{
            ...compactBtn,
            alignSelf: 'flex-start',
            color: 'var(--text-subtle)',
          }}
        >
          Add note
        </button>
      )}

      {/* Relevance bar */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.375rem',
          }}
        >
          <span className="label" style={{ color: 'var(--text-subtle)' }}>
            Relevance
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              color: source.relevance >= 80 ? 'var(--green)' : source.relevance >= 60 ? 'var(--amber)' : 'var(--text-muted)',
            }}
          >
            {source.relevance}%
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={source.relevance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Relevance: ${source.relevance}%`}
          style={{
            height: '3px',
            background: 'var(--surface-elevated)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${source.relevance}%`,
              background:
                source.relevance >= 80
                  ? 'var(--green)'
                  : source.relevance >= 60
                  ? 'var(--amber)'
                  : 'var(--text-muted)',
              borderRadius: '2px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Analysis */}
      {source.analysis ? (
        <>
          {/* Why relevant */}
          <div>
            <p className="label" style={{ marginBottom: '0.375rem' }}>
              Why relevant
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
              {source.analysis.why_relevant}
            </p>
          </div>

          {/* Toggle more details */}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              alignSelf: 'flex-start',
              fontSize: '0.75rem',
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--accent-bright)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
            }}
          >
            {expanded ? '↑ Show less' : '↓ Show more'}
          </button>

          {expanded && (
            <div
              className="animate-fade-in stagger-children"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {/* Summary */}
              <div>
                <p className="label" style={{ marginBottom: '0.375rem' }}>Summary</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  {source.analysis.summary}
                </p>
              </div>

              {/* Key points */}
              {source.analysis.key_points.length > 0 && (
                <div>
                  <p className="label" style={{ marginBottom: '0.5rem' }}>Key points</p>
                  <ul
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.375rem',
                    }}
                  >
                    {source.analysis.key_points.map((point, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          gap: '0.625rem',
                          fontSize: '0.875rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            marginTop: '0.5rem',
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            flexShrink: 0,
                          }}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Technologies */}
              {source.analysis.technologies.length > 0 && (
                <div>
                  <p className="label" style={{ marginBottom: '0.375rem' }}>Technologies</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {source.analysis.technologies.map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: '0.1875rem 0.5rem',
                          borderRadius: 'var(--radius-xs)',
                          background: 'var(--surface-elevated)',
                          border: '1px solid var(--border)',
                          fontSize: '0.6875rem',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Limitations */}
              {source.analysis.limitations.length > 0 && (
                <div>
                  <p className="label" style={{ marginBottom: '0.375rem', color: 'var(--amber)' }}>
                    Limitations
                  </p>
                  <ul
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.375rem',
                    }}
                  >
                    {source.analysis.limitations.map((lim, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          gap: '0.625rem',
                          fontSize: '0.875rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            marginTop: '0.5rem',
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: 'var(--amber)',
                            flexShrink: 0,
                          }}
                        />
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

      {/* Focused summary modal */}
      {summaryOpen && (
        <SourceSummaryModal
          sessionId={sessionId}
          source={source}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </article>
  );
}
