import type { ReactNode } from 'react';
import { GridWarp } from './GridWarp';
import { AuthShowcase } from './AuthShowcase';

interface AuthShellProps {
  /** Which showcase copy to render: 'signin' or 'signup'. */
  mode: 'signin' | 'signup';
  /** The auth form card, rendered in the left pane with the brand right. */
  children: ReactNode;
}

/**
 * Two-pane auth frame: the full-viewport warping grid sits fixed behind, the
 * form card takes the left pane, and the brand/showcase lands on the right.
 * Stacks into a single centered column below 880px. Safe for all touch sizes.
 */
export function AuthShell({ mode, children }: AuthShellProps) {
  return (
    <>
      <GridWarp />
      <div
        style={{
          minHeight: '100vh',
        padding: 'clamp(1.5rem, 5vw, 4rem)',
        position: 'relative' as const,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 'clamp(2rem, 6vw, 5rem)',
          alignItems: 'center',
          maxWidth: '1180px',
          width: '100%',
        }}
      >
        <div style={{ minWidth: 0 }}>{children}</div>
        <AuthShowcase mode={mode} />
      </div>
      </div>
    </>
  );
}
