import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface Node {
  id: string; label: string; x: number; y: number; r: number; isCenter?: boolean;
}

const NODES: Node[] = [
  { id: 'center',   label: 'REACH',    x: 200, y: 200, r: 36, isCenter: true },
  { id: 'question', label: 'Question', x: 200, y: 62,  r: 24 },
  { id: 'sources',  label: 'Sources',  x: 338, y: 118, r: 22 },
  { id: 'evidence', label: 'Evidence', x: 358, y: 268, r: 22 },
  { id: 'context',  label: 'Context',  x: 238, y: 355, r: 22 },
  { id: 'insights', label: 'Insights', x: 58,  y: 298, r: 22 },
  { id: 'findings', label: 'Findings', x: 62,  y: 118, r: 22 },
];
const EDGES: [string, string][] = [
  ['center','question'],['center','sources'],['center','evidence'],
  ['center','context'],['center','insights'],['center','findings'],
];

function getNode(id: string) { return NODES.find(n => n.id === id)!; }

export function ResearchIntelligenceSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <section id="research-intelligence" aria-labelledby="intelligence-heading"
      style={{ padding: '6rem 1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}
      ref={sectionRef}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem', alignItems: 'center' }}>

        {/* Text column */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div className="section-label" aria-hidden="true">Research Intelligence</div>
            <h2 id="intelligence-heading" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1rem' }}>
              Everything connected,<br />nothing missed
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              REACH organizes the entire research process around your objective. Sources, findings, evidence, and open questions — all interconnected with full provenance back to the original content.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              'Up to 7 targeted search queries per objective',
              'Up to 15 sources selected, fetched, and analyzed',
              'Findings linked directly to their source evidence',
              'Open questions surfaced alongside established findings',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <motion.div
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '0.45rem' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <span style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SVG network with CursorGrid overlay */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
          style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', position: 'relative' }}>

          <div style={{ padding: '1rem', position: 'relative', zIndex: 1 }}>
            <svg viewBox="0 0 400 420" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block' }}>
              {/* Animated connection lines */}
              {EDGES.map(([fromId, toId], i) => {
                const from = getNode(fromId);
                const to = getNode(toId);
                const highlighted = hoveredNode === fromId || hoveredNode === toId;
                return (
                  <motion.line key={`${fromId}-${toId}`}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={highlighted ? 'rgba(232,185,49,0.7)' : 'rgba(232,185,49,0.2)'}
                    strokeWidth={highlighted ? 2 : 1}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.7, delay: i * 0.1 }}
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                  />
                );
              })}

              {/* Animated travelling dot on each edge */}
              {EDGES.map(([fromId, toId], i) => {
                const from = getNode(fromId);
                const to = getNode(toId);
                return (
                  <motion.circle key={`dot-${i}`} r="3" fill="rgba(232,185,49,0.9)"
                    animate={{
                      cx: [from.x, to.x, from.x],
                      cy: [from.y, to.y, from.y],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 3, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                );
              })}

              {/* Nodes */}
              {NODES.map((node, i) => {
                const isActive = hoveredNode === node.id;
                const isConn = hoveredNode
                  ? EDGES.some(([a,b]) => (a === hoveredNode || b === hoveredNode) && (a === node.id || b === node.id))
                  : false;
                return (
                  <motion.g key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'default' }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}>
                    {/* Pulse ring on center and hovered */}
                    {(isActive || node.isCenter) && (
                      <motion.circle cx={node.x} cy={node.y} r={node.r + 10}
                        fill="rgba(232,185,49,0.05)" stroke="rgba(232,185,49,0.15)" strokeWidth="1"
                        animate={{ r: [node.r + 8, node.r + 16, node.r + 8] }}
                        transition={{ duration: 2.5, repeat: Infinity }} />
                    )}
                    <circle cx={node.x} cy={node.y} r={node.r}
                      fill={node.isCenter ? 'rgba(232,185,49,0.15)' : isActive || isConn ? 'rgba(232,185,49,0.1)' : 'var(--surface-elevated)'}
                      stroke={node.isCenter ? 'rgba(232,185,49,0.7)' : isActive || isConn ? 'rgba(232,185,49,0.5)' : 'var(--border-strong)'}
                      strokeWidth={node.isCenter ? 2 : 1.5}
                      style={{ transition: 'fill 0.2s, stroke 0.2s' }} />
                    <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
                      fill={node.isCenter ? 'var(--accent)' : isActive || isConn ? 'var(--text)' : 'var(--text-muted)'}
                      fontSize={node.isCenter ? '11' : '9'} fontWeight={node.isCenter ? '700' : '500'}
                      fontFamily="DM Sans,sans-serif"
                      style={{ transition: 'fill 0.2s', userSelect: 'none' }}>
                      {node.label}
                    </text>
                  </motion.g>
                );
              })}
            </svg>

            <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace', marginTop: '0.5rem', letterSpacing: '0.06em' }}>
              Illustrative concept · Hover nodes · Move cursor
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
