import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchIntegrationsThunk, addIntegrationThunk } from '../store/integrationsSlice';
import FilterBar, { type Filters } from '../components/FilterBar';
import InterfaceList from '../components/InterfaceList';
import AddIntegrationModal from '../components/AddIntegrationModal';
import { PageSpinner, PageError } from '../components/PageStates';

const initialFilters: Filters = {
  search: '',
  category: 'ALL',
  priority: 'ALL',
  status: 'ALL',
  frequency: 'ALL',
};

export default function IntegrationList() {
  const dispatch  = useAppDispatch();
  const location  = useLocation();
  const { items: integrations, loading, error } = useAppSelector(s => s.integrations);
  const refetch = () => dispatch(fetchIntegrationsThunk());
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(() => {
    const nav = location.state as { category?: Filters['category'] } | null;
    return nav?.category ? { ...initialFilters, category: nav.category } : initialFilters;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { priorities, frequencies } = useMemo(() => {
    const p = new Set<string>();
    const f = new Set<string>();
    integrations.forEach(i => {
      if (i.InterfacePriority) p.add(i.InterfacePriority);
      if (i.InterfaceFrequency) f.add(i.InterfaceFrequency);
    });
    return { priorities: Array.from(p).sort(), frequencies: Array.from(f).sort() };
  }, [integrations]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return integrations.filter(i => {
      if (filters.category !== 'ALL' && i.ProjectOps !== filters.category) return false;
      if (filters.priority !== 'ALL' && i.InterfacePriority !== filters.priority) return false;
      if (filters.frequency !== 'ALL' && i.InterfaceFrequency !== filters.frequency) return false;
      if (filters.status === 'ACTIVE' && i.IsActive !== 1) return false;
      if (filters.status === 'INACTIVE' && i.IsActive !== 0) return false;
      if (q) {
        const hay = [
          i.InterfaceID,
          i.InterfaceName,
          i.DataObject,
          i.Description,
          i.PackageName,
          i.SourceApplication,
          i.TargetApplication,
          i.SourceProtocol,
          i.TargetProtocol,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filters, integrations]);

  if (loading) return <PageSpinner />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  return (
    <div className="w-full px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-rail mb-1">
            Catalog
          </p>
          <h1 className="font-display text-3xl font-bold text-navy-900">Integrations</h1>
          <p className="text-sm text-navy-600 mt-1">
            Browse and manage all integrations across Mobility, ERP, and Freight.
          </p>
        </div>
        <button
          onClick={() => { setSaveError(null); setShowAddModal(true); }}
          className="btn-primary shrink-0 mt-1 gap-1.5"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add Integration
        </button>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        priorities={priorities}
        frequencies={frequencies}
        resultCount={filtered.length}
      />

      <InterfaceList items={filtered} />

      {showAddModal && (
        <AddIntegrationModal
          saving={saving}
          saveError={saveError}
          onSave={async item => {
            setSaving(true);
            setSaveError(null);
            try {
              await dispatch(addIntegrationThunk(item)).unwrap();
              setShowAddModal(false);
            } catch (e) {
              setSaveError((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => setShowAddModal(false)}
          createdBy={user?.username ?? 'USER'}
        />
      )}
    </div>
  );
}
