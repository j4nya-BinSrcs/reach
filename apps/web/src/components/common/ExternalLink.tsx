import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
  label?: string;
}

export function ExternalLink({
  href,
  children,
  className,
  style,
  showIcon = true,
  label,
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        color: 'var(--accent)',
        fontSize: '0.8125rem',
        fontWeight: 500,
        transition: 'color 0.15s ease, gap 0.15s ease',
        ...style,
      }}
      aria-label={label ?? `${typeof children === 'string' ? children : 'Link'} (opens in new tab)`}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = 'var(--accent-bright)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
      }}
    >
      {children}
      {showIcon && (
        <ExternalLinkIcon
          size={11}
          aria-hidden="true"
          style={{ flexShrink: 0, transition: 'transform 0.15s ease' }}
        />
      )}
    </a>
  );
}
