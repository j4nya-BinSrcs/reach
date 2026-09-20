import type { SourceType } from '../../types/source';
import { SOURCE_TYPE_LABELS } from '../../lib/constants';
import { sourceTypeColor, sourceTypeBg } from '../../lib/utils';

interface SourceBadgeProps {
  type: SourceType;
  size?: 'sm' | 'md';
}

const SOURCE_TYPE_ICONS: Record<SourceType, string> = {
  paper:         '📄',
  github:        '💻',
  documentation: '📚',
  tool:          '🔧',
  project:       '🌐',
  article:       '📝',
  other:         '○',
};

export function SourceBadge({ type, size = 'md' }: SourceBadgeProps) {
  const isSm = size === 'sm';

  return (
    <span
      role="img"
      aria-label={SOURCE_TYPE_LABELS[type]}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3125rem',
        padding: isSm ? '0.1875rem 0.4375rem' : '0.25rem 0.5625rem',
        borderRadius: 'var(--radius-xs)',
        background: sourceTypeBg(type),
        border: `1px solid ${sourceTypeColor(type)}30`,
        fontSize: isSm ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        color: sourceTypeColor(type),
        lineHeight: 1,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: isSm ? '0.625rem' : '0.75rem' }}>
        {SOURCE_TYPE_ICONS[type]}
      </span>
      {SOURCE_TYPE_LABELS[type]}
    </span>
  );
}
