import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchIntegrationsThunk } from '../store/integrationsSlice';
import StatCard from '../components/StatCard';
import ProjectsPieChart from '../components/ProjectsPieChart';
import { getCategory, getCategoryColor } from '../lib/utils';
import { PageSpinner, PageError } from '../components/PageStates';

export default function Dashboard() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { items: integrations, loading, error } = useAppSelector(s => s.integrations);
  const refetch = () => dispatch(fetchIntegrationsThunk());

  // Derive distinct categories and counts from actual data — no hardcoded list.
  const { total, active, inactive, byCategory } = useMemo(() => {
    const byCategory: Record<string, { total: number; active: number }> = {};
    let active = 0;
    for (const i of integrations) {
      const cat = getCategory(i);
      if (!byCategory[cat]) byCategory[cat] = { total: 0, active: 0 };
      byCategory[cat].total++;
      if (i.IsActive === 1) { byCategory[cat].active++; active++; }
    }
    return { total: integrations.length, active, inactive: integrations.length - active, byCategory };
  }, [integrations]);

  // Sorted descending by count so the largest slice comes first in the pie.
  const pieData = useMemo(
    () =>
      Object.entries(byCategory)
        .map(([name, { total: value }]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    [byCategory]
  );

  const categoryDesc = pieData.length <= 4
    ? pieData.map(d => d.name).join(', ')
    : `${pieData.length} categories`;

  if (loading) return <PageSpinner />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  return (
    <div className="w-full px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-rail mb-1">
            Catalog overview
          </p>
          <h1 className="font-display text-3xl font-bold text-navy-900">Dashboard</h1>
          <p className="text-sm text-navy-600 mt-1">
            All integrations across {categoryDesc}.
          </p>
        </div>
      </div>

      {/* Stat cards — one per distinct category, plus the totals card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total projects"
          value={total}
          hint={`${active} active · ${inactive} inactive`}
          accent="navy"
          onClick={() => navigate('/integrations')}
        />
        {pieData.map(({ name, value }) => (
          <StatCard
            key={name}
            label={name}
            value={value}
            hint={total > 0 ? `${((value / total) * 100).toFixed(0)}% of catalog` : '—'}
            accentColor={getCategoryColor(name)}
            onClick={() => navigate('/integrations', { state: { category: name } })}
          />
        ))}
      </div>

      {/* Pie + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ProjectsPieChart data={pieData} total={total} />
        </div>

        <div className="lg:col-span-2 card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-navy-900">
              Category breakdown
            </h3>
            <span className="text-xs uppercase tracking-wider text-navy-500">
              Active vs Inactive
            </span>
          </div>
          <div className="space-y-4">
            {pieData.map(({ name, value }) => {
              const { active: catActive } = byCategory[name];
              const catInactive = value - catActive;
              const pct = total > 0 ? (value / total) * 100 : 0;
              const color = getCategoryColor(name);
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-medium text-sm text-navy-900">{name}</span>
                    </div>
                    <span className="text-xs text-navy-600 tabular-nums">
                      {value} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-navy-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${total > 0 ? (catActive / total) * 100 : 0}%` }}
                      title={`${catActive} active`}
                    />
                    <div
                      className="bg-navy-300"
                      style={{ width: `${total > 0 ? (catInactive / total) * 100 : 0}%` }}
                      title={`${catInactive} inactive`}
                    />
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-navy-500">
                    <span>{catActive} active</span>
                    <span>{catInactive} inactive</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
