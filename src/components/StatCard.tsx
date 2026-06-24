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
  onClick?: () => void;
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
  onClick,
}: StatCardProps) {
  const color = accentColor ?? ACCENT_HEX[accent];

  return (
    <div
      className={`card p-5 relative overflow-hidden transition-shadow ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-transform' : ''
      }`}
      onClick={onClick}
    >
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
        {onClick && (
          <svg className="h-4 w-4 text-navy-300 shrink-0 self-center ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}
