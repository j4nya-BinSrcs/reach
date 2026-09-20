import { Skeleton } from '../common/LoadingState';

const box: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface)',
  padding: '1.5rem 1.75rem',
};

const card: React.CSSProperties = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

export function ReportSkeleton() {
  return (
    <div style={box} aria-label="Report is being generated" role="status">
      <Skeleton style={{ width: '30%', height: '0.6875rem', marginBottom: '1.25rem' }} />
      <Skeleton style={{ width: '16%', height: '1rem', marginBottom: '0.625rem' }} />
      <Skeleton style={{ height: '0.875rem' }} />
      <Skeleton style={{ width: '82%', height: '0.875rem', marginBottom: '1.25rem' }} />
      <Skeleton style={{ width: '20%', height: '1rem', marginBottom: '0.5rem' }} />
      <Skeleton style={{ height: '0.875rem' }} />
      <Skeleton style={{ width: '92%', height: '0.875rem' }} />
      <Skeleton style={{ width: '70%', height: '0.875rem', marginBottom: '1.25rem' }} />
      <Skeleton style={{ width: '22%', height: '1rem', marginBottom: '0.5rem' }} />
      <Skeleton style={{ height: '0.875rem' }} />
      <Skeleton style={{ width: '88%', height: '0.875rem' }} />
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div role="status" aria-label="Synthesis is being generated">
      <Skeleton style={{ width: '18%', height: '0.6875rem', marginBottom: '1rem' }} />
      <Skeleton style={{ height: '0.9375rem', marginBottom: '0.5rem' }} />
      <Skeleton style={{ width: '96%', height: '0.9375rem', marginBottom: '0.5rem' }} />
      <Skeleton style={{ width: '74%', height: '0.9375rem' }} />
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <Skeleton style={{ width: '180px', height: '1.75rem', borderRadius: 'var(--radius-xs)' }} />
        <Skeleton style={{ width: '180px', height: '1.75rem', borderRadius: 'var(--radius-xs)' }} />
        <Skeleton style={{ width: '180px', height: '1.75rem', borderRadius: 'var(--radius-xs)' }} />
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...card, animationDelay: `${i * 60}ms` }}>
          <Skeleton style={{ width: '12%', height: '0.625rem' }} />
          <Skeleton style={{ width: '55%', height: '0.9375rem' }} />
          <Skeleton style={{ height: '0.875rem' }} />
          <Skeleton style={{ width: '86%', height: '0.875rem' }} />
        </div>
      ))}
    </div>
  );
}