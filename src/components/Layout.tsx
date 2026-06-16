import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-navy-800 text-white'
        : 'text-navy-400 hover:bg-navy-800 hover:text-white'
    }`;

  const initials = (user?.displayName ?? '?')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-navy-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-navy-900/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-navy-900 transition-transform duration-200 md:relative md:translate-x-0 md:shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-navy-800 px-4">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-rail font-display font-bold text-sm text-white">
              IT
            </span>
            <span className="font-display font-semibold tracking-wide text-white leading-tight">
              Integration<br />Tracker
            </span>
          </Link>
        </div>

        {/* Section label */}
        <div className="px-4 pt-5 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-500">
            Navigation
          </p>
        </div>

        {/* Nav links */}
        <nav
          className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4"
          onClick={() => setSidebarOpen(false)}
        >
          <NavLink to="/" end className={navLinkClass}>
            <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v4.5A2.25 2.25 0 0 0 4.25 11h4.5A2.25 2.25 0 0 0 11 8.75v-4.5A2.25 2.25 0 0 0 8.75 2h-4.5Zm9 0A2.25 2.25 0 0 0 11 4.25v4.5A2.25 2.25 0 0 0 13.25 11h2.5A2.25 2.25 0 0 0 18 8.75v-4.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm-9 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h4.5A2.25 2.25 0 0 0 11 15.75v-2.5A2.25 2.25 0 0 0 8.75 11h-4.5Zm9 0A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/integrations" className={navLinkClass}>
            <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
            </svg>
            Integrations
          </NavLink>
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-navy-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.displayName}</p>
              <p className="text-xs text-navy-400">Signed in</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-navy-400 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.07a.75.75 0 1 0-1.004-1.04l-2.5 2.56a.75.75 0 0 0 0 1.04l2.5 2.56a.75.75 0 1 0 1.004-1.04L8.704 10.75H18.25A.75.75 0 0 0 19 10Z"
                clipRule="evenodd"
              />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="flex h-14 shrink-0 items-center border-b border-navy-200 bg-white px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-navy-700 hover:bg-navy-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 2 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="ml-3 font-display font-semibold text-navy-900">
            Integration Tracker
          </span>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
