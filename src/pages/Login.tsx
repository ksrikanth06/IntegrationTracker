import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      const from = (location.state as LocationState)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else {
      setError('Enter both a username and password to continue.');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-navy-50">
      {/* Left panel — brand */}
      <div className="hidden lg:flex relative flex-col justify-between bg-navy-900 text-white p-12 overflow-hidden">
        <div className="absolute inset-x-0 bottom-1/3 h-2 bg-rail rail-track" />
        <div className="absolute inset-x-0 bottom-1/3 mt-6 h-1 bg-navy-700 rail-track" />

        <div className="flex items-center gap-3 relative z-10">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-rail font-display font-bold">
            IT
          </span>
          <span className="font-display font-semibold tracking-wide text-lg">
            Integration Tracker
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-rail-light mb-3">
            webMethods 10.15 · ER-IL
          </p>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Every interface, every direction, in one catalog.
          </h1>
          <p className="text-navy-200 text-sm leading-relaxed">
            Track integrations across Mobility, ERP, and Freight. Search by
            source, target, protocol, or owner. Drill into any interface for
            the full record.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-display text-2xl font-bold">120</div>
            <div className="text-navy-300 text-xs uppercase tracking-wider">Interfaces</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold">3</div>
            <div className="text-navy-300 text-xs uppercase tracking-wider">Domains</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold">37</div>
            <div className="text-navy-300 text-xs uppercase tracking-wider">Applications</div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-rail font-display font-bold text-white">
              IT
            </span>
            <span className="font-display font-semibold tracking-wide text-lg text-navy-900">
              Integration Tracker
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold text-navy-900">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            Access the interface catalog.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                placeholder="srikanth"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-rail/10 border border-rail/30 px-3 py-2 text-sm text-rail-dark">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-xs text-navy-500 pt-2">
              Demo build — any non-empty credentials sign you in.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
