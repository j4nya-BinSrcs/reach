import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// ── Animated mini-preview per step ───────────────────────────────────────────

function PreviewAsk() {
  return (
    <svg viewBox="0 0 120 72" style={{ width: '100%', maxWidth: 120 }} aria-hidden="true">
      <rect x="4" y="8" width="112" height="56" rx="6" fill="none" stroke="rgba(232,185,49,0.3)" strokeWidth="1" />
      <motion.rect x="14" y="24" width="2" height="16" rx="1" fill="rgba(232,185,49,0.9)"
        animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      {[0,1,2].map(i => (
        <motion.rect key={i} x="20" y={26+i*7} width={40+i*15} height="4" rx="2"
          fill="rgba(232,185,49,0.2)"
          initial={{ scaleX: 0, transformOrigin: '0 50%' }}
          animate={{ scaleX: 1 }} transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }} />
      ))}
      <motion.rect x="82" y="50" width="28" height="10" rx="4"
        fill="rgba(232,185,49,0.8)"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
    </svg>
  );
}

function PreviewExplore() {
  return (
    <svg viewBox="0 0 120 72" style={{ width: '100%', maxWidth: 120 }} aria-hidden="true">
      {[38, 28, 18].map((r, i) => (
        <motion.circle key={r} cx="60" cy="36" r={r}
          fill="none" stroke="rgba(232,185,49,0.25)" strokeWidth="1"
          animate={{ r: [r, r + 6, r], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }} />
      ))}
      <circle cx="60" cy="36" r="8" fill="rgba(232,185,49,0.7)" />
      {[[60,4],[100,22],[100,54],[60,68],[20,54],[20,22]].map(([x,y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="3" fill="rgba(232,185,49,0.4)"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.08 }} />
      ))}
    </svg>
  );
}

function PreviewConnect() {
  const nodes = [[20,20],[20,50],[100,20],[100,50],[60,36]];
  const lines = [[0,4],[1,4],[2,4],[3,4],[0,2],[1,3]];
  return (
    <svg viewBox="0 0 120 72" style={{ width: '100%', maxWidth: 120 }} aria-hidden="true">
      {lines.map(([a,b], i) => (
        <motion.line key={i}
          x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="rgba(232,185,49,0.35)" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: i * 0.1 }} />
      ))}
      {nodes.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 4 ? 8 : 5}
          fill={i === 4 ? 'rgba(232,185,49,0.8)' : 'rgba(232,185,49,0.3)'}
          stroke="rgba(232,185,49,0.5)" strokeWidth="1" />
      ))}
    </svg>
  );
}

function PreviewUnderstand() {
  return (
    <svg viewBox="0 0 120 72" style={{ width: '100%', maxWidth: 120 }} aria-hidden="true">
      <rect x="10" y="6" width="100" height="60" rx="5" fill="none" stroke="rgba(232,185,49,0.25)" strokeWidth="1" />
      {[0,1,2,3,4].map(i => (
        <motion.rect key={i} x="18" y={16+i*9} height="5" rx="2"
          fill="rgba(232,185,49,0.2)"
          initial={{ width: 0 }} animate={{ width: i === 4 ? 55 : [65,80,55,70][i % 4] }}
          transition={{ delay: 0.2 + i * 0.12, duration: 0.45 }} />
      ))}
      <motion.path d="M84,52 L89,58 L100,44" stroke="rgba(76,175,130,0.9)" strokeWidth="2" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }} />
    </svg>
  );
}

function PreviewContinue() {
  return (
    <svg viewBox="0 0 120 72" style={{ width: '100%', maxWidth: 120 }} aria-hidden="true">
      <motion.path d="M30,36 A30,30 0 1 1 60,66" fill="none" stroke="rgba(232,185,49,0.5)" strokeWidth="2" strokeLinecap="round"
        animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '60px 36px' }} />
      <motion.polygon points="60,58 54,68 66,68" fill="rgba(232,185,49,0.9)"
        animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '60px 36px' }} />
      <circle cx="60" cy="36" r="14" fill="rgba(232,185,49,0.1)" stroke="rgba(232,185,49,0.3)" strokeWidth="1" />
      <text x="60" y="40" textAnchor="middle" fontSize="9" fill="rgba(232,185,49,0.8)" fontWeight="600" fontFamily="DM Sans,sans-serif">Next</text>
    </svg>
  );
}

interface WorkStep {
  number: string;
  title: string;
  body: string;
  Preview: () => React.ReactElement;
}

const STEPS: WorkStep[] = [
  {
    number: '01', title: 'Ask',
    body: 'Enter a research objective — a specific question or topic to explore deeply. The more precise, the better the output.',
    Preview: PreviewAsk,
  },
  {
    number: '02', title: 'Explore',
    body: 'REACH decomposes the objective into research dimensions and generates up to 7 targeted queries — systematically covering the space.',
    Preview: PreviewExplore,
  },
  {
    number: '03', title: 'Connect',
    body: 'Up to 15 sources are selected, fetched, and analyzed with structured output. Each result is schema-validated and grounded in real content.',
    Preview: PreviewConnect,
  },
  {
    number: '04', title: 'Understand',
    body: 'A research workspace is built from findings with source provenance, open questions, and a full markdown report — all traceable.',
    Preview: PreviewUnderstand,
  },
  {
    number: '05', title: 'Continue',
    body: 'Star sources, add notes, request on-demand summaries, or compare any two sources side by side. Then start your next journey.',
    Preview: PreviewContinue,
  },
];

function StepCard({ step, index }: { step: WorkStep; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { Preview } = step;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(232,185,49,0.25)';
        el.style.boxShadow = '0 12px 40px rgba(232,185,49,0.07)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow = 'none';
      }}
      style={{
        padding: '1.75rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Decorative step number */}
      <span aria-hidden="true" style={{
        position: 'absolute', top: '0.875rem', right: '1.125rem',
        fontSize: '3.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text-subtle)', lineHeight: 1, userSelect: 'none', opacity: 0.35,
      }}>
        {step.number}
      </span>

      {/* Animated SVG preview */}
      <div style={{
        height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
      }}>
        <Preview />
      </div>

      {/* Text */}
      <div>
        <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          {step.title}
        </h3>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
          {step.body}
        </p>
      </div>
    </motion.div>
  );
}

export function HowItWorksSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' });

  return (
    <section id="how-it-works" aria-labelledby="how-heading"
      style={{ padding: '6rem 1.5rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <motion.div ref={headerRef}
          initial={{ opacity: 0, y: 24 }} animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div className="section-label" aria-hidden="true">How It Works</div>
          <h2 id="how-heading" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1rem' }}>
            One objective. Five steps.
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
            REACH automates the research workflow — deterministic filtering first, LLM analysis only where it adds genuine value.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
