import { Search, Layers, Sparkles } from 'lucide-react';

interface AuthShowcaseProps {
  mode: 'signin' | 'signup';
}

/** Right-hand brand landing for SignIn/SignUp: tagline, features, demo panel. */
export function AuthShowcase({ mode }: AuthShowcaseProps) {
  const heading =
    mode === 'signup'
      ? 'Turn a research objective into the knowledge you need to act.'
      : 'Your research, mapped. Enter the workspace.';

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 2.5rem 3rem 4rem',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow handled by GridWarp behind everything that follows */}
      <div className="bg-grid" aria-hidden="true" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <h2
          style={{
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.035em',
            lineHeight: 1.15,
            color: 'var(--text)',
            maxWidth: '22ch',
          }}
        >
          {heading}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '46ch', lineHeight: 1.7 }}>
          REACH mines, filters, and synthesizes sources into a shared workspace — so a research
          objective becomes evidence you can reason over.
        </p>
      </div>

      {/* Feature rows */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginTop: '2.5rem',
        }}
      >
        <FeatureRow
          icon={<Search size={18} />}
          title="Persistent sources"
          body="Star, save, tag, and compare sources across every session. Nothing you collect vanishes."
        />
        <FeatureRow
          icon={<Layers size={18} />}
          title="Session workspace"
          body="Saved sources, running notes, and automated comparisons live side by side."
        />
        <FeatureRow
          icon={<Sparkles size={18} />}
          title="Synthesis you can build on"
          body="A structured report with findings, gaps, and open questions — ready to carry into a paper, a product, or a team brief."
        />
      </div>

      {/* Demo / tutorial panel */}
      <div
        style={{
          marginTop: '2.5rem',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--surface)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--surface-hover)',
            borderBottom: '1px solid var(--border-strong)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--text-subtle)',
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Tutorial
          </span>
        </div>
        <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.5,
            }}
          >
            Sample: how discoverability works
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.375rem', lineHeight: 1.6 }}>
            Follow a two-minute tour of starting research, saving your first source, and
            reading the synthesis.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface-elevated)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '30px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(232,185,49,0.15)',
                position: 'relative',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '3px 10px',
                  background: 'var(--accent-dim)',
                  animation: 'crunch-bars 2.2s ease-in-out infinite',
                }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                reach // research tour
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>2:04 · REACH</p>
            </div>
            <button
              aria-label="Play tutorial video"
              style={{
                marginLeft: 'auto',
                flexShrink: 0,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,185,49,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
                <path d="M3.5 2.5v7l6-3.5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>{title}</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '46ch' }}>{body}</p>
      </div>
    </div>
  );
}
