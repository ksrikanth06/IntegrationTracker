import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  /** Named accent — used when accentColor is not supplied. */
  accent?: 'navy' | 'rail' | 'mobility' | 'erp' | 'freight';
  /** Explicit hex color. Overrides accent when provided. */
  accentColor?: string;
  icon?: ReactNode;
}

const ACCENT_HEX: Record<NonNullable<StatCardProps['accent']>, string> = {
  navy: '#1e3a5f',
  rail: '#C8102E',
  mobility: '#0E4F8A',
  erp: '#C8102E',
  freight: '#F59E0B',
};

export default function StatCard({
  label,
  value,
  hint,
  accent = 'navy',
  accentColor,
  icon,
}: StatCardProps) {
  const color = accentColor ?? ACCENT_HEX[accent];

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-navy-900 tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
        </div>
        {icon && <div className="text-navy-300">{icon}</div>}
      </div>
    </div>
  );
}
