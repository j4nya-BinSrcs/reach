import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// ── Rich animated SVG preview per capability ─────────────────────────────────

function PreviewResearch() {
  return (
    <svg viewBox="0 0 140 80" style={{ width: '100%' }} aria-hidden="true">
      {/* Document lines */}
      {[0,1,2,3].map(i => (
        <motion.rect key={i} x="14" y={18+i*12} width={50+i*5} height="5" rx="2"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
          initial={{ scaleX: 0, transformOrigin: '0 50%' }}
          animate={{ scaleX: 1 }} transition={{ delay: i * 0.1, duration: 0.4 }} />
      ))}
      {/* Magnifying glass */}
      <motion.circle cx="100" cy="40" r="20" fill="none" stroke="rgba(232,185,49,0.6)" strokeWidth="2"
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.line x1="114" y1="54" x2="126" y2="66" stroke="rgba(232,185,49,0.8)" strokeWidth="2.5" strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Scan line inside glass */}
      <motion.line x1="82" y1="40" x2="118" y2="40" stroke="rgba(232,185,49,0.4)" strokeWidth="1.5"
        animate={{ y1: [28, 52, 28], y2: [28, 52, 28] }} transition={{ duration: 1.8, repeat: Infinity }} />
    </svg>
  );
}

function PreviewDiscovery() {
  return (
    <svg viewBox="0 0 140 80" style={{ width: '100%' }} aria-hidden="true">
      {/* Globe ellipses */}
      <ellipse cx="70" cy="40" rx="34" ry="34" fill="none" stroke="rgba(232,185,49,0.3)" strokeWidth="1.2" />
      <ellipse cx="70" cy="40" rx="20" ry="34" fill="none" stroke="rgba(232,185,49,0.2)" strokeWidth="1" />
      <line x1="36" y1="40" x2="104" y2="40" stroke="rgba(232,185,49,0.2)" strokeWidth="1" />
      <line x1="42" y1="20" x2="98" y2="20" stroke="rgba(232,185,49,0.15)" strokeWidth="0.8" />
      <line x1="42" y1="60" x2="98" y2="60" stroke="rgba(232,185,49,0.15)" strokeWidth="0.8" />
      {/* Scanning line */}
      <motion.line x1="36" y1="40" x2="104" y2="40" stroke="rgba(232,185,49,0.7)" strokeWidth="1.5"
        animate={{ y1: [12, 68, 12], y2: [12, 68, 12] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
      {/* Blip */}
      <motion.circle cx="70" cy="40" r="3" fill="rgba(232,185,49,0.9)"
        animate={{ r: [2, 5, 2], opacity: [1, 0.3, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
    </svg>
  );
}

function PreviewEvidence() {
  return (
    <svg viewBox="0 0 140 80" style={{ width: '100%' }} aria-hidden="true">
      <rect x="20" y="10" width="100" height="60" rx="6" fill="none" stroke="rgba(232,185,49,0.25)" strokeWidth="1" />
      {[0,1,2,3].map(i => (
        <motion.rect key={i} x="30" y={20+i*12} height="5" rx="2"
          fill="rgba(255,255,255,0.07)"
          initial={{ width: 0 }} animate={{ width: [60, 75, 50, 68][i] }}
          transition={{ delay: i * 0.1, duration: 0.4 }} />
      ))}
      {/* Checkmarks appearing */}
      {[0,1,2].map(i => (
        <motion.path key={i} d={`M${108},${20+i*12} L${112},${25+i*12} L${120},${16+i*12}`}
          stroke="rgba(76,175,130,0.9)" strokeWidth="2" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.2, duration: 0.35 }} />
      ))}
    </svg>
  );
}

function PreviewContext() {
  return (
    <svg viewBox="0 0 140 80" style={{ width: '100%' }} aria-hidden="true">
      <circle cx="52" cy="40" r="28" fill="rgba(232,185,49,0.08)" stroke="rgba(232,185,49,0.4)" strokeWidth="1.5" />
      <circle cx="88" cy="40" r="28" fill="rgba(232,185,49,0.08)" stroke="rgba(232,185,49,0.4)" strokeWidth="1.5" />
      {/* Animated intersection highlight */}
      <motion.path d="M70,14 A28,28 0 0 1 70,66 A28,28 0 0 1 70,14"
        fill="rgba(232,185,49,0.18)"
        animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }} />
      <text x="52" y="43" textAnchor="middle" fontSize="8" fill="rgba(232,185,49,0.5)" fontFamily="DM Sans,sans-serif">A</text>
      <text x="88" y="43" textAnchor="middle" fontSize="8" fill="rgba(232,185,49,0.5)" fontFamily="DM Sans,sans-serif">B</text>
      <text x="70" y="43" textAnchor="middle" fontSize="7" fill="rgba(232,185,49,0.9)" fontFamily="DM Sans,sans-serif">∩</text>
    </svg>
  );
}

function PreviewClarity() {
  return (
    <svg viewBox="0 0 140 80" style={{ width: '100%' }} aria-hidden="true">
      <rect x="12" y="8" width="116" height="64" rx="6" fill="none" stroke="rgba(232,185,49,0.2)" strokeWidth="1" />
      {/* Title line */}
      <motion.rect x="20" y="18" width="70" height="6" rx="3" fill="rgba(232,185,49,0.5)"
        initial={{ scaleX: 0, transformOrigin: '0 50%' }} animate={{ scaleX: 1 }} transition={{ duration: 0.4 }} />
      {/* Content lines */}
      {[0,1,2,3,4].map(i => (
        <motion.rect key={i} x="20" y={30+i*8} height="4" rx="2"
          fill="rgba(255,255,255,0.1)"
          initial={{ scaleX: 0, transformOrigin: '0 50%' }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
          style={{ width: [80, 95, 65, 90, 55][i] }}
        />
      ))}
      {/* Star badge */}
      <motion.polygon points="120,14 122,20 128,20 123,24 125,30 120,26 115,30 117,24 112,20 118,20"
        fill="rgba(232,185,49,0.8)"
        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} />
    </svg>
  );
}

interface Capability {
  title: string; body: string; color: string;  Preview: () => React.ReactElement;
}

const CAPABILITIES: Capability[] = [
  {
    title: 'Research',
    body: 'Turn a research objective into a structured investigation. REACH plans dimensions and generates up to 7 targeted queries.',
    color: 'var(--accent)',
    Preview: PreviewResearch,
  },
  {
    title: 'Discovery',
    body: 'Explore across papers, GitHub, documentation, and tools. Candidates are deduplicated, classified, and ranked before any LLM analysis.',
    color: 'var(--green)',
    Preview: PreviewDiscovery,
  },
  {
    title: 'Evidence',
    body: 'Sources are fetched and analyzed with schema-validated structured output. A bad source never kills a session — failure tolerance is built in.',
    color: 'var(--accent)',
    Preview: PreviewEvidence,
  },
  {
    title: 'Context',
    body: 'Findings are synthesized with source provenance. Compare any two sources — similarities, differences, and contradictions on demand.',
    color: 'var(--amber)',
    Preview: PreviewContext,
  },
  {
    title: 'Clarity',
    body: 'A full markdown report, tabbed workspace, starred sources, tags, notes, and on-demand summaries — all in one place.',
    color: 'var(--green)',
    Preview: PreviewClarity,
  },
];

function CapabilityCard({ cap, index }: { cap: Capability; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { Preview } = cap;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px ${cap.color}33`;
        el.style.borderColor = `${cap.color}44`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = 'none';
        el.style.borderColor = 'var(--border)';
      }}
      style={{
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* SVG preview panel */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-elevated)',
        padding: '0.75rem 1rem',
        position: 'relative',
        overflow: 'hidden',
        height: '96px',
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Accent top line */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '1rem', right: '1rem', height: '1px',
          background: `linear-gradient(to right, transparent, ${cap.color}66, transparent)`,
        }} />
        {/* Subtle glow behind illustration */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 60% 50%, ${cap.color}0d 0%, transparent 70%)`,
        }} />
        <Preview />
      </div>

      {/* Text */}
      <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
        <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          {cap.title}
        </h3>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
          {cap.body}
        </p>
      </div>
    </motion.div>
  );
}

export function CapabilitiesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' });

  return (
    <section id="capabilities" aria-labelledby="capabilities-heading"
      style={{ padding: '6rem 1.5rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <motion.div ref={headerRef}
          initial={{ opacity: 0, y: 24 }} animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div className="section-label" aria-hidden="true">Capabilities</div>
          <h2 id="capabilities-heading" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1rem' }}>
            Built for serious research
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
            Every capability is grounded in the actual REACH pipeline — no feature-list fluff.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {CAPABILITIES.map((cap, i) => (
            <CapabilityCard key={cap.title} cap={cap} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
