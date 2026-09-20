import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResearchSession } from '../hooks/useResearchSession';
import { AppShell } from '../components/layout/AppShell';
import { ResearchHeader } from '../components/research/ResearchHeader';
import { ResearchProgress } from '../components/research/ResearchProgress';
import { ResearchProgressStrip } from '../components/research/ResearchProgressStrip';
import { ResearchReportView } from '../components/research/ResearchReportView';
import { FindingCard } from '../components/research/FindingCard';
import { ResearchGapCard } from '../components/research/ResearchGapCard';
import { SourceComparisonPanel } from '../components/research/SourceComparisonPanel';
import { SourceList } from '../components/research/SourceList';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { CardListSkeleton, ReportSkeleton, SummarySkeleton } from '../components/research/WorkspaceSkeleton';

type Tab = 'report' | 'findings' | 'comparisons' | 'workspace';

const TABS: { id: Tab; label: string }[] = [
  { id: 'report', label: 'Research Report' },
  { id: 'findings', label: 'Findings & Open Questions' },
  { id: 'comparisons', label: 'Comparisons' },
  { id: 'workspace', label: 'Workspace' },
];

function TabBar({ active, onSwitch }: { active: Tab; onSwitch: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.5rem',
      }}
    >
      {TABS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSwitch(id)}
            style={{
              padding: '0.75rem 1.125rem',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ResearchSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('report');

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

  const isRunning = !isComplete && !isFailed;
  const hasLiveData = !!session && session.sources.length > 0;

  // ── Loading progress (before anything is streamed) ──────
  if (isRunning && !hasLiveData) {
    return <ResearchProgress objective={id ?? ''} progress={progress} isFailed={isFailed} />;
  }

  // ── Failed ────────────────────────────────────────────
  if (isFailed) {
    return <ResearchProgress objective={id ?? ''} progress={progress} isFailed={true} />;
  }

  // ── Loading session data ──────────────────────────
  if (isLoadingSession || !session) {
    return <AppShell><LoadingState /></AppShell>;
  }

  // ── Error ─────────────────────────────────────────
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

  // ── Running workspace (live view with skeletons) ──
  if (isRunning) {
    return (
      <AppShell>
        <ResearchHeader session={session} running={true} />
        <ResearchProgressStrip progress={progress} />
        <div style={{ display: 'flex', gap: '2rem' }}>
          {/* Left column: session info + sources */}
          <div style={{ width: '300px', flexShrink: 0 }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
                Sources ({session.sources.length})
              </p>
              {session.sources.length > 0 ? (
                <SourceList sessionId={session.id} sources={session.sources} />
              ) : (
                <CardListSkeleton count={3} />
              )}
            </div>
          </div>
          {/* Right column: tabs */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TabBar active={activeTab} onSwitch={setActiveTab} />
            {activeTab === 'report' && (
              <section aria-label="Research report">
                {session.report ? (
                  <ResearchReportView report={session.report} />
                ) : (
                  <ReportSkeleton />
                )}
              </section>
            )}
            {activeTab === 'findings' && (
              <section aria-label="Findings and open questions">
                {session.findings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {session.findings.map((finding, i) => (
                      <FindingCard key={finding.id} finding={finding} sources={session.sources} index={i} />
                    ))}
                  </div>
                )}
                {session.gaps.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {session.gaps.map((gap, i) => (
                      <ResearchGapCard key={gap.id} gap={gap} index={i} />
                    ))}
                  </div>
                )}
                {session.findings.length === 0 && session.gaps.length === 0 && (
                  <EmptyState title="No findings yet" description="Findings will appear here as the research progresses." />
                )}
              </section>
            )}
            {activeTab === 'comparisons' && (
              <section aria-label="Source comparisons">
                <SourceComparisonPanel
                  sessionId={session.id}
                  sources={session.sources}
                  enabled={session.sources.length >= 2}
                />
              </section>
            )}
            {activeTab === 'workspace' && (
              <section aria-label="Workspace">
                {session.summary && <SummarySkeleton />}
                {session.sources.length > 0 ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
                      Saved Sources
                    </p>
                    <SourceList sessionId={session.id} sources={session.sources} />
                  </div>
                ) : (
                  <EmptyState title="No saved sources" description="Star or save sources to organize them here." />
                )}
              </section>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Workspace (completed) ──
  return (
    <AppShell>
      <ResearchHeader session={session} />
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Left column: session info + sources */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
              Sources ({session.sources.length})
            </p>
            {session.sources.length > 0 ? (
              <SourceList sessionId={session.id} sources={session.sources} />
            ) : (
              <EmptyState title="No sources" description="Sources will appear here as they are discovered." />
            )}
          </div>
        </div>
        {/* Right column: tabs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <TabBar active={activeTab} onSwitch={setActiveTab} />
          {activeTab === 'report' && (
            <section aria-label="Research report">
              {session.report && <ResearchReportView report={session.report} />}
            </section>
          )}
          {activeTab === 'findings' && (
            <section aria-label="Findings and open questions">
              {session.findings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {session.findings.map((finding, i) => (
                    <FindingCard key={finding.id} finding={finding} sources={session.sources} index={i} />
                  ))}
                </div>
              )}
              {session.gaps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {session.gaps.map((gap, i) => (
                    <ResearchGapCard key={gap.id} gap={gap} index={i} />
                  ))}
                </div>
              )}
              {session.findings.length === 0 && session.gaps.length === 0 && (
                <EmptyState title="No findings yet" description="Findings and open questions will appear here once the research completes." />
              )}
            </section>
          )}
          {activeTab === 'comparisons' && (
            <section aria-label="Source comparisons">
              <SourceComparisonPanel
                sessionId={session.id}
                sources={session.sources}
                enabled={session.sources.length >= 2}
              />
            </section>
          )}
          {activeTab === 'workspace' && (
            <section aria-label="Workspace">
              {session.summary && (
                <div style={{ marginBottom: '2rem' }}>
                  <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
                    Summary
                  </p>
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
                  Saved Sources
                </p>
                {session.sources.filter(s => s.saved).length > 0 ? (
                  <SourceList sessionId={session.id} sources={session.sources.filter(s => s.saved)} />
                ) : (
                  <EmptyState title="No saved sources" description="Star or save sources to organize them here." />
                )}
              </div>
              {session.sources.length > 0 && (
                <div>
                  <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
                    All Sources
                  </p>
                  <SourceList sessionId={session.id} sources={session.sources} />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
