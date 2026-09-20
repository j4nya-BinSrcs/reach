import { useMemo } from 'react';
import type { ResearchReport } from '../../types/research';

interface ResearchReportViewProps {
  report: ResearchReport;
}

// Minimal, safe markdown renderer for the generated report.
// Renders headings, lists, inline code, and paragraphs.
function renderLine(line: string, keyPrefix: string) {
  const inline = (text: string) => {
    // split on backticks for inline code
    const parts = text.split('`');
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <code key={i}>{part}</code>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (line.startsWith('### ')) {
    return <h4 key={keyPrefix} style={{ lineHeight: 1.7, fontSize: '0.9375rem', marginTop: '1.25rem' }}>{inline(line.slice(4))}</h4>;
  }
  if (line.startsWith('## ')) {
    return <h4 key={keyPrefix} style={{ lineHeight: 1.7, fontSize: '0.8125rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', margin: '1.75rem 0 0.5rem' }}>{inline(line.slice(3))}</h4>;
  }
  if (line.startsWith('# ')) {
    return <h3 key={keyPrefix} style={{ lineHeight: 1.7, fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{inline(line.slice(2))}</h3>;
  }
  if (/^[-*] /.test(line)) {
    return (
      <li key={keyPrefix} style={{ lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {inline(line.replace(/^[-*] /, ''))}
      </li>
    );
  }
  const boldMatch = /^\*\*(.*?)\*\*/.exec(line);
  if (line.includes('**') && boldMatch) {
    const bold = boldMatch[1];
    const rest = line.replace(/^\*\*(.*?)\*\*/, '').replace(/^:\s*/, '');
    return (
      <p key={keyPrefix} style={{ lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <strong style={{ color: 'var(--text)' }}>{bold}</strong>
        {rest ? ` — ${inline(rest)}` : null}
      </p>
    );
  }
  if (line.trim() === '') return <div key={keyPrefix} style={{ height: '0.5rem' }} />;
  return <p key={keyPrefix} style={{ lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{inline(line)}</p>;
}

export function ResearchReportView({ report }: ResearchReportViewProps) {
  const blocks = useMemo(() => {
    const lines = report.markdown.split('\n');
    const output: React.ReactNode[] = [];
    let list: React.ReactNode[] = [];
    let index = 0;

    const flushList = () => {
      if (list.length) {
        output.push(<ul key={`list-${index++}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingLeft: '1.25rem', listStyle: 'none' }}>{list}</ul>);
        list = [];
      }
    };

    lines.forEach((line) => {
      const key = `l${index}`;
      if (/^[-*] /.test(line)) {
        list.push(renderLine(line, key));
      } else {
        flushList();
        output.push(renderLine(line, key));
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
          Intent template: {report.intent}
        </span>
      </div>
      <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {blocks}
      </div>
    </article>
  );
}