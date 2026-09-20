import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useResearchSession } from '../hooks/useResearchSession';
import { ResearchProgress } from '../components/research/ResearchProgress';
import { AppShell } from '../components/layout/AppShell';
import { ResearchHeader } from '../components/research/ResearchHeader';
import { ResearchSummary } from '../components/research/ResearchSummary';
import { FindingCard } from '../components/research/FindingCard';
import { SourceList } from '../components/research/SourceList';
import { ResearchGapCard } from '../components/research/ResearchGapCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

// Section wrapper
function Section({
  id,
  title,
  children,
  count,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      style={{ marginBottom: '3rem', scrollMarginTop: '4rem' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.875rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h2
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {title}
        </h2>
        {count != null && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              color: 'var(--text-subtle)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              padding: '0.125rem 0.4375rem',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function ResearchSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    progress,
    session,
    isLoadingSession,
    isComplete,
    isFailed,
    error,
  } = useResearchSession(id ?? '');

  // Redirect if no ID
  useEffect(() => {
    if (!id) navigate('/', { replace: true });
  }, [id, navigate]);

  // ── Loading progress ──────────────────────────────────────
  if (!isComplete && !isFailed) {
    return (
      <ResearchProgress
        objective={id ?? ''}
        progress={progress}
        isFailed={isFailed}
      />
    );
  }

  // ── Failed ────────────────────────────────────────────────
  if (isFailed) {
    return (
      <ResearchProgress
        objective={id ?? ''}
        progress={progress}
        isFailed={true}
      />
    );
  }

  // ── Loading session data ──────────────────────────────────
  if (isLoadingSession || !session) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <AppShell>
        <ErrorState
          title="Failed to load research session"
          message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
        />
      </AppShell>
    );
  }

  // ── Workspace ─────────────────────────────────────────────
  return (
    <AppShell>
      {/* Objective header */}
      <ResearchHeader session={session} />

      {/* Summary */}
      {session.synthesis && (
        <Section id="overview" title="Summary">
          <ResearchSummary synthesis={session.synthesis} />
        </Section>
      )}

      {/* Findings */}
      <Section id="findings" title="Key Findings" count={session.findings.length}>
        {session.findings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {session.findings.map((finding, i) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                sources={session.sources}
                index={i}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No findings generated"
            description="The research session did not produce structured findings."
          />
        )}
      </Section>

      {/* Sources */}
      <Section id="sources" title="Sources" count={session.sources.length}>
        {session.sources.length > 0 ? (
          <SourceList sources={session.sources} />
        ) : (
          <EmptyState
            title="No sources collected"
            description="The research session did not discover any relevant sources."
          />
        )}
      </Section>

      {/* Open Questions */}
      <Section id="questions" title="Open Questions" count={session.gaps.length}>
        {session.gaps.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {session.gaps.map((gap, i) => (
              <ResearchGapCard key={gap.id} gap={gap} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open questions identified"
            description="The collected sources appear to cover the research objective comprehensively."
          />
        )}
      </Section>
    </AppShell>
  );
}
