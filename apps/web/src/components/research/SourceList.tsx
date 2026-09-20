import type { Source } from '../../types/source';
import { SourceCard } from './SourceCard';

interface SourceListProps {
  sessionId: string;
  sources: Source[];
}

export function SourceList({ sessionId, sources }: SourceListProps) {
  const successCount = sources.filter((s) => s.fetch_status === 'success').length;
  const partialCount = sources.filter((s) => s.fetch_status === 'partial').length;
  const failedCount  = sources.filter((s) => s.fetch_status === 'failed').length;

  return (
    <div>
      {/* Stats row */}
      {(partialCount > 0 || failedCount > 0) && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
          role="status"
          aria-live="polite"
        >
          <span>
            <strong style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
              {successCount}
            </strong>{' '}
            analyzed
          </span>
          {partialCount > 0 && (
            <span>
              <strong style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                {partialCount}
              </strong>{' '}
              partial
            </span>
          )}
          {failedCount > 0 && (
            <span>
              <strong style={{ color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
                {failedCount}
              </strong>{' '}
              unavailable
            </span>
          )}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sources.map((source, index) => (
          <SourceCard key={source.id} source={source} index={index} sessionId={sessionId} />
        ))}
      </div>
    </div>
  );
}
