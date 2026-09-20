import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. The rest of the research session is still available.',
  action,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-start gap-3 p-5 rounded-lg animate-fade-in"
      role="alert"
      style={{
        background: 'var(--red-dim)',
        border: '1px solid rgba(232,92,92,0.2)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="flex items-center gap-2">
        <AlertCircle
          size={15}
          aria-hidden="true"
          style={{ color: 'var(--red)', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text)',
          }}
        >
          {title}
        </span>
      </div>
      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
