import type { ResearchSynthesis } from '../../types/research';

interface ResearchSummaryProps {
  synthesis: ResearchSynthesis;
}

export function ResearchSummary({ synthesis }: ResearchSummaryProps) {
  return (
    <section
      id="overview-summary"
      className="animate-fade-in"
      style={{ marginBottom: '3rem' }}
      aria-label="Research summary"
    >
      <h2
        className="label"
        style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}
      >
        Summary
      </h2>

      {/* Overview */}
      <p
        style={{
          fontSize: '0.9375rem',
          color: 'var(--text-muted)',
          lineHeight: 1.75,
          marginBottom: '1.75rem',
          maxWidth: '700px',
        }}
      >
        {synthesis.overview}
      </p>

      {/* Grid of lists */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {synthesis.key_technologies.length > 0 && (
          <TagGroup
            label="Key technologies"
            items={synthesis.key_technologies}
            color="var(--accent)"
            bg="var(--accent-dim)"
          />
        )}
        {synthesis.existing_projects.length > 0 && (
          <TagGroup
            label="Existing projects"
            items={synthesis.existing_projects}
            color="var(--green)"
            bg="var(--green-dim)"
          />
        )}
        {synthesis.research_directions.length > 0 && (
          <TagGroup
            label="Research directions"
            items={synthesis.research_directions}
            color="var(--amber)"
            bg="var(--amber-dim)"
          />
        )}
      </div>
    </section>
  );
}

function TagGroup({
  label,
  items,
  color,
  bg,
}: {
  label: string;
  items: string[];
  color: string;
  bg: string;
}) {
  return (
    <div>
      <p className="label" style={{ marginBottom: '0.625rem' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              padding: '0.25rem 0.5625rem',
              borderRadius: 'var(--radius-xs)',
              background: bg,
              border: `1px solid ${color}30`,
              fontSize: '0.75rem',
              fontWeight: 500,
              color: color,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
