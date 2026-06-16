import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import staticData from '../data/interfaces.json';
import type { Interface } from '../types';
import { USE_API } from '../config';
import { fetchIntegrations, postIntegration } from '../services/api';

interface IntegrationsContextValue {
  integrations: Interface[];
  loading: boolean;
  error: string | null;
  addIntegration: (item: Interface) => Promise<void>;
  refetch: () => void;
}

const IntegrationsContext = createContext<IntegrationsContextValue | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const [integrations, setIntegrations] = useState<Interface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!USE_API) {
      setIntegrations(staticData as Interface[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchIntegrations()
      .then(setIntegrations)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addIntegration = useCallback(async (item: Interface) => {
    if (USE_API) {
      const saved = await postIntegration(item);
      setIntegrations(prev => [saved, ...prev]);
    } else {
      setIntegrations(prev => [item, ...prev]);
    }
  }, []);

  const value = useMemo(
    () => ({ integrations, loading, error, addIntegration, refetch: load }),
    [integrations, loading, error, addIntegration, load]
  );

  return (
    <IntegrationsContext.Provider value={value}>{children}</IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  const ctx = useContext(IntegrationsContext);
  if (!ctx) throw new Error('useIntegrations must be used within IntegrationsProvider');
  return ctx;
}
