import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResearchSession } from '../hooks/useResearchSession';
import { ResearchHeader } from '../components/research/ResearchHeader';
import { ResearchProgress } from '../components/research/ResearchProgress';
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

  useEffect(() => {
    if (!id) navigate('/', { replace: true });
  }, [id, navigate]);

  const isRunning = !isComplete && !isFailed;
  const hasLiveData = !!session && session.sources.length > 0;

  if (isRunning && !hasLiveData) {
    return <ResearchProgress objective={id ?? ''} progress={progress} isFailed={isFailed} />;
  }

  if (isFailed) {
    return <ResearchProgress objective={id ?? ''} progress={progress} isFailed={true} />;
  }

  if (isLoadingSession || !session) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load research session"
        message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
      />
    );
  }

  const leftContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <ResearchHeader session={session} running={isRunning} />
      <div>
        <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
          Sources ({session.sources.length})
        </p>
        {session.sources.length > 0 ? (
          <SourceList sources={session.sources} />
        ) : (
          <CardListSkeleton count={3} />
        )}
      </div>
    </div>
  );

  const rightContent = (
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
          {session.summary && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Summary</p>
              <SummarySkeleton />
            </div>
          )}
          {session.sources.filter(s => s.saved).length > 0 ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Saved Sources</p>
              <SourceList sources={session.sources.filter(s => s.saved)} />
            </div>
          ) : null}
          {session.sources.length > 0 ? (
            <div>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>All Sources</p>
              <SourceList sources={session.sources} />
            </div>
          ) : (
            <EmptyState title="No sources" description="Sources will appear here as they are discovered." />
          )}
        </section>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: '2rem 1.5rem 4rem',
          gap: '2rem',
          flex: 1,
        }}
      >
        {/* Left partition: session info + sources */}
        <div style={{ width: '340px', flexShrink: 0 }}>
          {leftContent}
        </div>
        {/* Right partition: tabs */}
        {rightContent}
      </div>
    </div>
  );
}
