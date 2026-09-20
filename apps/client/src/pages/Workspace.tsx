import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Star, Bookmark, Tags, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell';
import { SourceCard } from '../components/research/SourceCard';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { listWorkspaceSources } from '../lib/api';

type Filter = 'all' | 'starred' | 'saved' | 'tag';

interface FilterState {
  type: Filter;
  tag?: string;
}

const FILTERS: { id: Filter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All sources', icon: null },
  { id: 'starred', label: 'Starred', icon: <Star size={13} aria-hidden="true" /> },
  { id: 'saved', label: 'Saved', icon: <Bookmark size={13} aria-hidden="true" /> },
];

export function Workspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ type: 'all' });

  useEffect(() => {
    if (!id) navigate('/', { replace: true });
  }, [id, navigate]);

  // Fetch the full workspace (unfiltered) so tag chips and counts work client-side
  const workspaceQuery = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => listWorkspaceSources(id ?? ''),
    enabled: !!id,
  });

  // All tags present across sources for the filter dropdown
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (workspaceQuery.data ?? []).forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [workspaceQuery.data]);

  // Apply the active filter client-side (backend also supports starred/saved/tag)
  const visible = useMemo(() => {
    const sources = workspaceQuery.data ?? [];
    if (filter.type === 'starred') return sources.filter((s) => s.starred);
    if (filter.type === 'saved') return sources.filter((s) => s.saved);
    if (filter.type === 'tag' && filter.tag) return sources.filter((s) => s.tags.includes(filter.tag!));
    return sources;
  }, [workspaceQuery.data, filter]);

  return (
    <AppShell>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link
            to={`/research/${id}`}
            style={{
              fontSize: '0.875rem',
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            ← Back to research session
          </Link>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginTop: '0.5rem' }}>
            Workspace
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {FILTERS.map(({ id: filterId, label, icon }) => {
          const active = filter.type === filterId;
          return (
            <button
              key={filterId}
              onClick={() => setFilter({ type: filterId })}
              aria-pressed={active}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.4375rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'var(--surface-elevated)' : 'var(--surface)',
                border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.15s ease, background 0.15s ease, border-color 0.15s ease',
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}

        {/* Tag dropdown */}
        {allTags.length > 0 && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Tags size={13} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-subtle)', pointerEvents: 'none' }} aria-hidden="true" />
            <select
              value={filter.type === 'tag' ? filter.tag ?? '' : ''}
              onChange={(e) => {
                const tag = e.target.value;
                setFilter(tag ? { type: 'tag', tag } : { type: 'all' });
              }}
              aria-label="Filter by tag"
              style={{
                padding: '0.4375rem 1.875rem 0.4375rem 1.875rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
            {filter.type === 'tag' && filter.tag && (
              <button
                onClick={() => setFilter({ type: 'all' })}
                aria-label="Clear tag filter"
                style={{
                  position: 'absolute',
                  right: '0.375rem',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.25rem',
                }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Source count */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>
        {visible.length} source{visible.length === 1 ? '' : 's'}
      </p>

      {/* Sources */}
      {workspaceQuery.isPending ? (
        <LoadingState />
      ) : workspaceQuery.isError ? (
        <EmptyState
          title="Could not load the workspace"
          description={workspaceQuery.error instanceof Error ? workspaceQuery.error.message : 'Unknown error'}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={
            filter.type === 'all'
              ? 'This session has no sources in the workspace.'
              : 'No sources match this filter. Tag, star, or save sources from the research session to find them here.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visible.map((source, index) => (
            <SourceCard
              key={source.id}
              source={source}
              index={index}
              sessionId={id ?? ''}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}