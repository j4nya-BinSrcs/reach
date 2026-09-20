import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ height: '1rem', ...style }}
      aria-hidden="true"
    />
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-6 animate-fade-fast" aria-label="Loading research session" role="status">
      {/* Header skeleton */}
      <div
        className="p-6 rounded-lg"
        style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
      >
        <Skeleton style={{ width: '30%', height: '0.75rem', marginBottom: '1rem' }} />
        <Skeleton style={{ width: '70%', height: '1.25rem', marginBottom: '0.5rem' }} />
        <Skeleton style={{ width: '50%', height: '1.25rem', marginBottom: '1.5rem' }} />
        <div className="flex gap-4">
          <Skeleton style={{ width: '80px', height: '0.75rem' }} />
          <Skeleton style={{ width: '80px', height: '0.75rem' }} />
          <Skeleton style={{ width: '80px', height: '0.75rem' }} />
        </div>
      </div>

      {/* Summary skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton style={{ width: '20%', height: '0.75rem' }} />
        <Skeleton style={{ height: '0.875rem' }} />
        <Skeleton style={{ width: '95%', height: '0.875rem' }} />
        <Skeleton style={{ width: '80%', height: '0.875rem' }} />
      </div>

      {/* Cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-5 rounded-lg flex flex-col gap-3"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        >
          <Skeleton style={{ width: '15%', height: '0.625rem' }} />
          <Skeleton style={{ width: '55%', height: '1rem' }} />
          <Skeleton style={{ height: '0.875rem' }} />
          <Skeleton style={{ width: '85%', height: '0.875rem' }} />
        </div>
      ))}
    </div>
  );
}

export function InlineLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-label={label}
    >
      <span className="pulse-dot" aria-hidden="true" />
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
