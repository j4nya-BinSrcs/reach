import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STEPS = [
  { label: 'Question',      description: 'Research objective',       accent: true },
  { label: 'Discovery',     description: 'Queries + source search',  accent: false },
  { label: 'Sources',       description: 'Filter, rank & select',    accent: false },
  { label: 'Evidence',      description: 'Fetch & analyze content',  accent: false },
  { label: 'Context',       description: 'Synthesize findings',      accent: false },
  { label: 'Understanding', description: 'Workspace + report',       accent: true },
];

export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="workflow" aria-labelledby="workflow-heading"
      style={{ padding: '6rem 1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <motion.div ref={ref}
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div className="section-label" aria-hidden="true">Research Workflow</div>
        <h2 id="workflow-heading" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1rem' }}>
          Bounded by design
        </h2>
        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.65 }}>
          No infinite crawlers. Each research run is bounded and purposeful — then you continue from understanding.
        </p>
      </motion.div>

      {/* ── Equal-width grid ── */}
      <div
        role="list"
        aria-label="Research workflow steps"
        style={{
          display: 'grid',
          /* 6 step boxes + 5 connector columns — connectors are fixed width */
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '0',
          alignItems: 'stretch',
          overflowX: 'auto',
        }}
      >
        {STEPS.map((step, i) => (
          <div key={step.label} role="listitem"
            style={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>

            {/* Step box — same width guaranteed by 1fr grid */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(232,185,49,0.3)';
                el.style.boxShadow = '0 8px 24px rgba(232,185,49,0.06)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = step.accent ? 'rgba(232,185,49,0.22)' : 'var(--border)';
                el.style.boxShadow = 'none';
              }}
              style={{
                flex: 1,
                padding: '1.5rem 0.75rem',
                borderRadius: '10px',
                border: `1px solid ${step.accent ? 'rgba(232,185,49,0.22)' : 'var(--border)'}`,
                background: step.accent ? 'var(--accent-dim)' : 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                alignItems: 'center',
                textAlign: 'center',
                minHeight: '110px',
                justifyContent: 'center',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
            >
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em',
                color: step.accent ? 'var(--accent)' : 'var(--text-subtle)',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {step.label}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {step.description}
              </span>
            </motion.div>

            {/* Connector — NOT a grid cell, positioned in the gap using margin */}
            {i < STEPS.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.2 + i * 0.09, duration: 0.4 }}
                aria-hidden="true"
                style={{ padding: '0 0.25rem', flexShrink: 0 }}
              >
                <motion.span
                  animate={{ opacity: [0.25, 0.75, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.28 }}
                  style={{ color: 'var(--text-subtle)', fontSize: '0.8125rem' }}
                >
                  →
                </motion.span>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile vertical list */}
      <div className="workflow-mobile-list" aria-hidden="true">
        {STEPS.map((step, i) => (
          <motion.div key={step.label}
            initial={{ opacity: 0, x: -16 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.45 }}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
              background: step.accent ? 'var(--accent-dim)' : 'var(--surface)',
              border: `1px solid ${step.accent ? 'rgba(232,185,49,0.25)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
              color: step.accent ? 'var(--accent)' : 'var(--text-subtle)',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{step.label}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{step.description}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
