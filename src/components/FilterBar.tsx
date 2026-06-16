import type { ProjectOps } from '../types';

export interface Filters {
  search: string;
  category: ProjectOps | 'ALL';
  priority: string;
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
  frequency: string;
}

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  priorities: string[];
  frequencies: string[];
  resultCount: number;
}

export default function FilterBar({
  filters,
  onChange,
  priorities,
  frequencies,
  resultCount,
}: Props) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const reset = () =>
    onChange({
      search: '',
      category: 'ALL',
      priority: 'ALL',
      status: 'ALL',
      frequency: 'ALL',
    });

  const hasFilters =
    filters.search !== '' ||
    filters.category !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.frequency !== 'ALL';

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={e => update('search', e.target.value)}
            placeholder="Search by name, ID, description, or application…"
            className="input"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
            Category
          </label>
          <select
            value={filters.category}
            onChange={e => update('category', e.target.value as Filters['category'])}
            className="input min-w-[140px]"
          >
            <option value="ALL">All categories</option>
            <option value="MOBILITY">Mobility</option>
            <option value="ERP">ERP</option>
            <option value="FREIGHT">Freight</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={e => update('priority', e.target.value)}
            className="input min-w-[120px]"
          >
            <option value="ALL">All</option>
            {priorities.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
            Frequency
          </label>
          <select
            value={filters.frequency}
            onChange={e => update('frequency', e.target.value)}
            className="input min-w-[140px]"
          >
            <option value="ALL">All</option>
            {frequencies.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
            Status
          </label>
          <select
            value={filters.status}
            onChange={e => update('status', e.target.value as Filters['status'])}
            className="input min-w-[120px]"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-navy-600">
          <span className="font-semibold text-navy-900 tabular-nums">{resultCount}</span>{' '}
          {resultCount === 1 ? 'result' : 'results'}
        </span>
        {hasFilters && (
          <button onClick={reset} className="btn-ghost">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
