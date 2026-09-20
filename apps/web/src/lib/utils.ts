import { clsx, type ClassValue } from 'clsx';
import type { SourceType } from '../types/source';
import type { ResearchStatus } from '../types/research';

// ── Class name merging ─────────────────────────────────────
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ── Date formatting ────────────────────────────────────────
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Text utilities ─────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

// ── Source type styling ────────────────────────────────────
export function sourceTypeColor(type: SourceType): string {
  const map: Record<SourceType, string> = {
    paper:         'var(--amber)',
    github:        'var(--text-muted)',
    documentation: 'var(--accent)',
    tool:          'var(--green)',
    project:       'var(--green)',
    article:       'var(--text-muted)',
    other:         'var(--text-subtle)',
  };
  return map[type] ?? 'var(--text-muted)';
}

export function sourceTypeBg(type: SourceType): string {
  const map: Record<SourceType, string> = {
    paper:         'var(--amber-dim)',
    github:        'rgba(255,255,255,0.05)',
    documentation: 'var(--accent-dim)',
    tool:          'var(--green-dim)',
    project:       'var(--green-dim)',
    article:       'rgba(255,255,255,0.04)',
    other:         'rgba(255,255,255,0.03)',
  };
  return map[type] ?? 'rgba(255,255,255,0.04)';
}

// ── Status utilities ───────────────────────────────────────
export function isTerminalStatus(status: ResearchStatus): boolean {
  return status === 'complete' || status === 'failed';
}

export function isActiveStatus(status: ResearchStatus): boolean {
  return !isTerminalStatus(status);
}

// ── Domain extraction ──────────────────────────────────────
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Source index formatting ────────────────────────────────
export function formatSourceIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}
