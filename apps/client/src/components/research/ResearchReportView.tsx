import { useMemo } from 'react';
import type { ResearchReport } from '../../types/research';

interface ResearchReportViewProps {
  report: ResearchReport;
}

// Renders the generated report's markdown: headings, bullet lists, inline
// code, bold, and [label](url) links (so source appendix titles render as
// real links instead of raw markdown text).

function inline(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    }
    const full = match[0];
    if (match[3]) {
      const inside = full.slice(1, -1);
      const split = inside.indexOf('](');
      const label = inside.slice(0, split);
      const url = inside.slice(split + 2);
      nodes.push(
        <a key={key++} href={url} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    } else if (match[2]) {
      nodes.push(<strong key={key++}>{full.slice(2, -2)}</strong>);
    } else if (match[1]) {
      nodes.push(<code key={key++}>{full.slice(1, -1)}</code>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) {
    nodes.push(<span key={key++}>{text.slice(last)}</span>);
  }
  return nodes;
}

function renderLine(line: string, key: number) {
  if (line.startsWith('### ')) {
    return (
      <h4 key={key} style={{ lineHeight: 1.7, fontSize: '0.9375rem', marginTop: '1.25rem' }}>
        {inline(line.slice(4))}
      </h4>
    );
  }
  if (line.startsWith('## ')) {
    return (
      <h4
        key={key}
        style={{
          lineHeight: 1.7,
          fontSize: '0.8125rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          margin: '1.75rem 0 0.5rem',
        }}
      >
        {inline(line.slice(3))}
      </h4>
    );
  }
  if (line.startsWith('# ')) {
    return (
      <h3 key={key} style={{ lineHeight: 1.7, fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        {inline(line.slice(2))}
      </h3>
    );
  }
  if (/^[-*] /.test(line)) {
    return (
      <li key={key} style={{ lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {inline(line.replace(/^[-*] /, ''))}
      </li>
    );
  }
  if (line.trim() === '') {
    return <div key={key} style={{ height: '0.5rem' }} />;
  }
  return (
    <p key={key} style={{ lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      {inline(line)}
    </p>
  );
}

export function ResearchReportView({ report }: ResearchReportViewProps) {
  const blocks = useMemo(() => {
    const lines = report.markdown.split('\n');
    const output: React.ReactNode[] = [];
    let list: React.ReactNode[] = [];
    let key = 0;

    const flushList = () => {
      if (list.length) {
        output.push(
          <ul
            key={`list-${key}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              paddingLeft: '1.25rem',
              listStyle: 'none',
            }}
          >
            {list}
          </ul>
        );
        key += 1;
        list = [];
      }
    };

    lines.forEach((line) => {
      if (/^[-*] /.test(line)) {
        list.push(renderLine(line, key));
        key += 1;
      } else {
        flushList();
        output.push(renderLine(line, key));
        key += 1;
      }
    });
    flushList();
    return output;
  }, [report.markdown]);

  return (
    <article
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '1.5rem 1.75rem',
      }}
      aria-label="Research report"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="label" style={{ color: 'var(--accent)', textTransform: 'uppercase' }}>
          Research profile: {report.intent}
        </span>
      </div>
      <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {blocks}
      </div>
    </article>
  );
}