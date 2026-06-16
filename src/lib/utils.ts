import type { Interface } from '../types';

// ── Known branded colors ─────────────────────────────────────────────────────

const KNOWN_HEX: Record<string, string> = {
  MOBILITY: '#0E4F8A',
  ERP: '#C8102E',
  FREIGHT: '#F59E0B',
};

const KNOWN_BG: Record<string, string> = {
  MOBILITY: 'bg-[#E6EFF7] text-[#0E4F8A]',
  ERP: 'bg-[#FCE4E8] text-[#C8102E]',
  FREIGHT: 'bg-amber-100 text-amber-800',
};

// ── Fallback palettes for unknown/API-sourced categories ─────────────────────

const HEX_PALETTE = [
  '#6366f1', '#10b981', '#f97316', '#8b5cf6',
  '#06b6d4', '#84cc16', '#ec4899', '#14b8a6',
];

const BG_PALETTE = [
  'bg-indigo-100 text-indigo-800',
  'bg-emerald-100 text-emerald-800',
  'bg-orange-100 text-orange-800',
  'bg-violet-100 text-violet-800',
  'bg-cyan-100 text-cyan-800',
  'bg-lime-100 text-lime-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
];

/** Deterministic index from a string so the same category always gets the same palette slot. */
function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Hex fill color for pie slices, stat card accents, and breakdown bars. */
export function getCategoryColor(cat: string): string {
  return KNOWN_HEX[cat] ?? HEX_PALETTE[hash(cat) % HEX_PALETTE.length];
}

/** Tailwind chip/badge class pair for category labels. */
export function getCategoryBg(cat: string): string {
  return KNOWN_BG[cat] ?? BG_PALETTE[hash(cat) % BG_PALETTE.length];
}

/** Returns the raw ProjectOps value, uppercased. Never forces a fallback category. */
export function getCategory(i: Interface): string {
  return (i.ProjectOps || 'UNKNOWN').toUpperCase();
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}
