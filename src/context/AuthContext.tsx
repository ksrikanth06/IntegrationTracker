import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { store } from '../store';
import { clearCache as clearIntegrationsCache } from '../store/integrationsSlice';
import { clearLogsCache } from '../store/logsSlice';

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'it-tracker-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = async (username: string, password: string) => {
    // Demo auth: accept any non-empty credentials.
    // Replace with a real API call in production.
    if (!username.trim() || !password.trim()) return false;
    const next: User = {
      username: username.trim(),
      displayName: username.trim().split(/[.\s]+/).map(s => s[0]?.toUpperCase() + s.slice(1)).join(' '),
      loggedInAt: new Date().toISOString(),
    };
    setUser(next);
    return true;
  };

  const logout = () => {
    store.dispatch(clearIntegrationsCache());
    store.dispatch(clearLogsCache());
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
