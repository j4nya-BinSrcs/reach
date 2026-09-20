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
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { CardListSkeleton, ReportSkeleton, SummarySkeleton } from '../components/research/WorkspaceSkeleton';

type Tab = 'report' | 'findings' | 'workspace';

const TABS: { id: Tab; label: string }[] = [
  { id: 'report', label: 'Research Report' },
  { id: 'findings', label: 'Findings & Open Questions' },
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
    if (!id) navigate('/');
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
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '0 1.5rem' }}>
          <CardListSkeleton count={3} />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <ErrorState
          title="Failed to load research session"
          message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
        />
        <Footer />
      </div>
    );
  }

  const savedSources = session.sources.filter(s => s.saved);
  const hasSummary = !!session.summary;

  const leftContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
      <ResearchHeader session={session} running={isRunning} />
      <div>
        <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
          Sources ({session.sources.length})
        </p>
        {session.sources.length > 0 ? (
          <SourceList sources={session.sources} sessionId={session.id} />
        ) : (
          <CardListSkeleton count={3} />
        )}
      </div>
    </div>
  );

  const rightContent = (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
      <TabBar active={activeTab} onSwitch={setActiveTab} />

      {/* Report Tab */}
      {activeTab === 'report' && (
        <section aria-label="Research report" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 12rem)', paddingRight: '0.5rem' }}>
          {session.report ? (
            <ResearchReportView report={session.report} />
          ) : (
            <ReportSkeleton />
          )}
        </section>
      )}

      {/* Findings Tab */}
      {activeTab === 'findings' && (
        <section aria-label="Findings and open questions" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 12rem)', paddingRight: '0.5rem' }}>
          {session.findings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {session.findings.map((finding, i) => (
                <FindingCard key={finding.id} finding={finding} sources={session.sources} index={i} />
              ))}
            </div>
          )}
          {session.gaps.length > 0 && (
            <>
              <div
                style={{
                  height: '1px',
                  background: 'var(--border)',
                  margin: '1.5rem 0',
                }}
              />
              <p
                className="label"
                style={{ marginBottom: '0.75rem', color: 'var(--amber)' }}
              >
                Open Questions ({session.gaps.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {session.gaps.map((gap, i) => (
                  <ResearchGapCard key={gap.id} gap={gap} index={i} />
                ))}
              </div>
            </>
          )}
          {session.findings.length === 0 && session.gaps.length === 0 && (
            <EmptyState title="No findings yet" description="Findings and open questions will appear here as the research progresses." />
          )}
        </section>
      )}

      {/* Workspace Tab */}
      {activeTab === 'workspace' && (
        <section aria-label="Workspace" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 12rem)', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary */}
          {hasSummary ? (
            <div>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Summary</p>
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {hasSummary && session.summary ? session.summary.overview : ''}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '0.5rem' }}>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Summary</p>
              <SummarySkeleton />
            </div>
          )}

          {/* Saved Sources */}
          {savedSources.length > 0 && (
            <div>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Saved Sources ({savedSources.length})</p>
              <SourceList sources={savedSources} sessionId={session.id} />
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Session Notes</p>
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: '1.25rem 1.5rem',
              }}
            >
              <textarea
                placeholder="Add notes about this research session..."
                defaultValue=""
                style={{
                  width: '100%',
                  minHeight: '100px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Comparison moved to workspace */}
          <div>
            <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Source Comparison</p>
            {session.sources.length >= 2 ? (
              <SourceComparisonPanel
                sessionId={session.id}
                sources={session.sources}
                enabled={true}
              />
            ) : (
              <EmptyState title="Need 2+ sources" description="Compare sources to find similarities, differences, and contradictions." />
            )}
          </div>
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
      <div className="bg-grid" aria-hidden="true" />

      {/* Persistent header */}
      <Header />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: '5.5rem 1.5rem 3rem',
          gap: '2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left partition: 40% */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
          {leftContent}
        </div>
        {/* Right partition: 60% */}
        <div style={{ flex: '0 0 60%', minWidth: 0 }}>
          {rightContent}
        </div>
      </div>

      {/* Persistent footer */}
      <Footer />
    </div>
  );
}
