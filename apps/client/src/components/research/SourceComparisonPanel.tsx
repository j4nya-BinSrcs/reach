import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { compareSources, listComparisons } from '../../lib/api';
import type { SourceComparison, ComparisonPoint } from '../../types/research';
import type { Source } from '../../types/source';

interface SourceComparisonPanelProps {
  sessionId: string;
  sources: Source[];
}

function PointList({ points }: { points: ComparisonPoint[] }) {
  if (points.length === 0) return null;
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {points.map((p, i) => (
        <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {p.statement}
        </li>
      ))}
    </ul>
  );
}

function ComparisonCard({ comparison, sources, isExpanded, onToggle }: {
  comparison: SourceComparison;
  sources: Source[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const sourceTitle = (id: string) =>
    sources.find((s) => s.id === id)?.title ?? sources.find((s) => s.id === id)?.url ?? `Source ${id}`;

  return (
    <div
      className="animate-fade-in"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>#{comparison.id}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sourceTitle(comparison.source_a_id)}
          </span>
          <ArrowRight size={12} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sourceTitle(comparison.source_b_id)}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isExpanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {comparison.result.overview && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {comparison.result.overview}
            </p>
          )}
          <ComparisonSection label="Similarities" icon={<Plus size={13} style={{ color: 'var(--green)' }} />} points={comparison.result.similarities} />
          <ComparisonSection label="Differences" icon={<Minus size={13} style={{ color: 'var(--amber)' }} />} points={comparison.result.differences} />
          <ComparisonSection label="Contradictions" icon={<AlertTriangle size={13} style={{ color: 'var(--red)' }} />} points={comparison.result.contradictions} />
          {comparison.result.complementarity_notes && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
              {comparison.result.complementarity_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonSection({ label, icon, points }: { label: string; icon: React.ReactNode; points: ComparisonPoint[] }) {
  if (points.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', marginBottom: '0.5rem' }}>
        {icon}
        <span className="label" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <PointList points={points} />
    </div>
  );
}

export function SourceComparisonPanel({ sessionId, sources, enabled }: SourceComparisonPanelProps & { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [sourceA, setSourceA] = useState<string>('');
  const [sourceB, setSourceB] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const comparisonsQuery = useQuery({
    queryKey: ['comparisons', sessionId],
    queryFn: () => listComparisons(sessionId),
    enabled,
  });

  const compareMutation = useMutation({
    mutationFn: () => compareSources(sessionId, sourceA, sourceB),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons', sessionId] });
    },
  });

  // When comparisons change, if there's a new one and nothing is expanded, expand the first
  useEffect(() => {
    const comparisons = comparisonsQuery.data ?? [];
    if (comparisons.length > 0 && !expandedId) {
      setExpandedId(comparisons[0].id);
    }
  }, [comparisonsQuery.data, expandedId]);

  const comparisons = comparisonsQuery.data ?? [];
  const canCompare = sourceA && sourceB && sourceA !== sourceB;

  const toggleComparison = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Controls - Sticky */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap',
        padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', background: 'var(--surface)',
        position: 'sticky', top: '0', zIndex: 10,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: '160px' }}>
          <span className="label" style={{ color: 'var(--text-muted)' }}>Source A</span>
          <select value={sourceA} onChange={(e) => setSourceA(e.target.value)}
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
            <option value="" disabled>Choose a source…</option>
            {sources.filter((s) => s.id !== sourceB).map((s) => (
              <option key={s.id} value={s.id}>{s.title || s.url}</option>
            ))}
          </select>
        </label>
        <ArrowRight size={16} style={{ color: 'var(--text-subtle)', marginBottom: '0.625rem', flexShrink: 0 }} aria-hidden="true" />
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: '160px' }}>
          <span className="label" style={{ color: 'var(--text-muted)' }}>Source B</span>
          <select value={sourceB} onChange={(e) => setSourceB(e.target.value)}
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
            <option value="" disabled>Choose a source…</option>
            {sources.filter((s) => s.id !== sourceA).map((s) => (
              <option key={s.id} value={s.id}>{s.title || s.url}</option>
            ))}
          </select>
        </label>
        <button onClick={() => compareMutation.mutate()} disabled={!canCompare || compareMutation.isPending}
          style={{ background: canCompare ? 'var(--accent)' : 'var(--surface-elevated)', color: canCompare ? '#fff' : 'var(--text-subtle)', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600, cursor: canCompare ? 'pointer' : 'not-allowed', marginBottom: '0.625rem', fontFamily: 'inherit' }}>
          {compareMutation.isPending ? 'Comparing…' : 'Compare'}
        </button>
        {compareMutation.isError && (
          <span style={{ fontSize: '0.75rem', color: 'var(--red)', marginBottom: '0.625rem' }}>
            {compareMutation.error instanceof Error ? compareMutation.error.message : 'Comparison failed'}
          </span>
        )}
      </div>

      {comparisons.length === 0 && !compareMutation.isPending && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
          No comparisons yet. Pick two sources above to find similarities, differences, and contradictions.
        </p>
      )}

      {comparisons.length > 0 && (
        <p className="label" style={{ color: 'var(--text-muted)' }}>Comparison history ({comparisons.length})</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {comparisons.map((comparison, _i) => (
          <ComparisonCard
            key={comparison.id}
            comparison={comparison}
            sources={sources}
            isExpanded={comparison.id === (expandedId ?? comparisons[0]?.id)}
            onToggle={() => toggleComparison(comparison.id)}
          />
        ))}
      </div>
    </div>
  );
}
