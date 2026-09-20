import React from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}
      role="status"
    >
      {icon && (
        <div
          className="mb-4 opacity-30"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: '0.375rem',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            maxWidth: '28rem',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
