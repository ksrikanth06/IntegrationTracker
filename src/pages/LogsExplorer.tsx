import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { Log } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchRecentLogsThunk, syncRecentLogsThunk } from '../store/logsSlice';
import { PageSpinner, PageError } from '../components/PageStates';

const fmtTs = (s: string) =>
  s && s !== 'NULL'
    ? new Date(s).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

// Parse any date/datetime string → epoch ms; returns NaN on failure
const toEpoch = (s: string): number => {
  if (!s) return NaN;
  const ms = new Date(s).getTime();
  return isNaN(ms) ? NaN : ms;
};

// Format a datetime-local input value for chip display
const fmtFilterLabel = (s: string) =>
  s
    ? new Date(s).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

type EventFilter = 'ALL' | 'Start' | 'Info' | 'Success' | 'Failure';
type TimeMode   = 'NONE' | 'AFTER' | 'BEFORE' | 'BETWEEN';

export default function LogsExplorer() {
  const dispatch = useAppDispatch();
  const { items: allLogs, loading, error } = useAppSelector(s => s.logs);
  const { items: allInterfaces } = useAppSelector(s => s.integrations);
  const syncing = useAppSelector(s => s.logs.loading);

  // Fetch once on mount (MAINTAIN_CACHE controls whether the network is hit)
  useEffect(() => { dispatch(fetchRecentLogsThunk()); }, [dispatch]);

  const refetch = () => dispatch(syncRecentLogsThunk());

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedIfIds, setSelectedIfIds] = useState<Set<string>>(new Set());
  const [ifDropdownOpen, setIfDropdownOpen] = useState(false);
  const [ifSearch, setIfSearch]             = useState('');
  const [keyword, setKeyword]               = useState('');
  const [txnFilter, setTxnFilter]           = useState('');
  const [eventFilter, setEventFilter]       = useState<EventFilter>('ALL');
  const [timeMode, setTimeMode]             = useState<TimeMode>('NONE');
  const [timeAfter, setTimeAfter]           = useState('');
  const [timeBefore, setTimeBefore]         = useState('');
  const [expandedLog, setExpandedLog]       = useState<string | null>(null);
  const [page, setPage]                     = useState(1);
  const PAGE_SIZE = 20;

  const ifDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ifDropdownRef.current && !ifDropdownRef.current.contains(e.target as Node)) {
        setIfDropdownOpen(false);
      }
    }
    if (ifDropdownOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [ifDropdownOpen]);

  // ── Summary stats (always from all logs, transactions-based rate) ────────
  const stats = useMemo(() => {
    const txMap: Record<string, string> = {};
    for (const l of allLogs) {
      if (l.EventType === 'Success' || l.EventType === 'Failure') {
        txMap[l.TransactionID] = l.EventType;
      }
    }
    const txVals     = Object.values(txMap);
    const totalTxns  = txVals.length;
    const success    = txVals.filter(v => v === 'Success').length;
    const failures   = txVals.filter(v => v === 'Failure').length;
    const interfaces = new Set(allLogs.map(l => l.InterfaceID)).size;
    return { total: allLogs.length, totalTxns, success, failures, interfaces };
  }, [allLogs]);

  // ── Name lookup ───────────────────────────────────────────────────────────
  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const i of allInterfaces) m[i.InterfaceID] = i.InterfaceName;
    return m;
  }, [allInterfaces]);

  // ── Bar chart: top 8 interfaces by volume ────────────────────────────────
  const chartData = useMemo(() => {
    const map: Record<string, { Start: number; Info: number; Success: number; Failure: number }> = {};
    for (const l of allLogs) {
      if (!map[l.InterfaceID]) map[l.InterfaceID] = { Start: 0, Info: 0, Success: 0, Failure: 0 };
      const et = l.EventType as keyof (typeof map)[string];
      if (et in map[l.InterfaceID]) map[l.InterfaceID][et]++;
    }
    return Object.entries(map)
      .map(([id, c]) => ({ id, ...c, total: c.Start + c.Info + c.Success + c.Failure }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [allLogs]);

  // ── Interface options for the multi-select ────────────────────────────────
  const interfaceOptions = useMemo(() =>
    [...allInterfaces]
      .sort((a, b) => a.InterfaceID.localeCompare(b.InterfaceID))
      .map(i => ({ id: i.InterfaceID, name: i.InterfaceName })),
    [allInterfaces],
  );

  const filteredIfOptions = useMemo(() => {
    const q = ifSearch.trim().toLowerCase();
    if (!q) return interfaceOptions;
    return interfaceOptions.filter(
      o => o.id.toLowerCase().includes(q) || o.name.toLowerCase().includes(q),
    );
  }, [interfaceOptions, ifSearch]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
    setExpandedLog(null);
  }, [selectedIfIds, eventFilter, keyword, txnFilter, timeMode, timeAfter, timeBefore]);

  // ── Combined filtered log set ─────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    const q   = keyword.trim().toLowerCase();
    const txn = txnFilter.trim().toLowerCase();
    return allLogs.filter(l => {
      if (selectedIfIds.size > 0 && !selectedIfIds.has(l.InterfaceID)) return false;
      if (eventFilter !== 'ALL' && l.EventType !== eventFilter) return false;
      if (txn && !l.TransactionID.toLowerCase().includes(txn)) return false;
      if (q) {
        const hay = [l.ID, l.TransactionID, l.ServiceName, l.LogMessage,
                     l.ServerName, l.InterfaceID, l.ErrorType].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (timeMode !== 'NONE') {
        const logTs = toEpoch(l.CreatedDate);
        if (!isNaN(logTs)) {
          if (timeMode === 'AFTER'   && timeAfter  && logTs < toEpoch(timeAfter))                          return false;
          if (timeMode === 'BEFORE'  && timeBefore && logTs > toEpoch(timeBefore))                         return false;
          if (timeMode === 'BETWEEN' && timeAfter  && timeBefore &&
              (logTs < toEpoch(timeAfter) || logTs > toEpoch(timeBefore)))                                 return false;
        }
      }
      return true;
    });
  }, [allLogs, selectedIfIds, eventFilter, keyword, txnFilter, timeMode, timeAfter, timeBefore]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs  = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    selectedIfIds.size > 0 || keyword !== '' || txnFilter !== '' || eventFilter !== 'ALL' || timeMode !== 'NONE';

  const successRate = stats.totalTxns > 0
    ? ((stats.success / stats.totalTxns) * 100).toFixed(1)
    : '0';

  function clearAllFilters() {
    setSelectedIfIds(new Set());
    setKeyword('');
    setTxnFilter('');
    setEventFilter('ALL');
    setTimeMode('NONE');
    setTimeAfter('');
    setTimeBefore('');
    setExpandedLog(null);
  }

  function toggleInterface(id: string) {
    setSelectedIfIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setExpandedLog(null);
  }

  const XIcon = () => (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );

  if (loading) return <PageSpinner />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div className="w-full px-6 lg:px-8 py-6 lg:py-8 space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-rail mb-1">
            Observability
          </p>
          <h1 className="font-display text-3xl font-bold text-navy-900">Logs Explorer</h1>
          <p className="text-sm text-navy-600 mt-1">
            Live snapshot of integration event logs across all interfaces.
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-50 transition-colors"
          title="Sync latest logs from server"
        >
          <svg
            className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
          </svg>
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* ── 4 Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={stats.total} sub="All log entries"
          accent="#0E4F8A" icon={<IconLogs />} />
        <StatCard label="Successful Txns" value={stats.success} sub={`${successRate}% of completed transactions`}
          accent="#10b981" icon={<IconCheck />} />
        <StatCard label="Failed Txns" value={stats.failures}
          sub={`${stats.totalTxns > 0 ? ((stats.failures / stats.totalTxns) * 100).toFixed(1) : 0}% of completed transactions`}
          accent="#ef4444" icon={<IconAlert />} />
        <StatCard label="Interfaces" value={stats.interfaces} sub="Unique interfaces"
          accent="#8b5cf6" icon={<IconNetwork />} />
      </div>

      {/* ── Activity bar chart ───────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-navy-900">Activity by interface</h2>
            <span className="text-xs uppercase tracking-wider text-navy-500">
              Top {chartData.length} by volume
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                labelFormatter={(label: string) => nameMap[label] || label}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / .1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend formatter={(v) => (
                <span style={{ fontSize: 12, color: '#475569' }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
              )} />
              <Bar dataKey="Start"   stackId="a" fill="#0ea5e9" />
              <Bar dataKey="Info"    stackId="a" fill="#f59e0b" />
              <Bar dataKey="Success" stackId="a" fill="#10b981" />
              <Bar dataKey="Failure" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Browse / Filter + Results ────────────────────────────────────── */}
      <div className="card overflow-visible">

        {/* Panel header */}
        <div className="px-6 py-4 border-b border-navy-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy-900">Browse Logs</h2>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="btn-ghost text-xs gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
              Clear all
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="px-6 py-4 border-b border-navy-100 bg-navy-50/50 space-y-3">

          {/* Row 1: Interfaces · Keyword · Event */}
          <div className="flex flex-wrap gap-3 items-end">

            {/* Multi-interface dropdown */}
            <div className="relative" ref={ifDropdownRef}>
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Interfaces
              </label>
              <button
                type="button"
                onClick={() => setIfDropdownOpen(v => !v)}
                className="input flex items-center justify-between gap-2 text-left min-w-[200px]"
              >
                <span className={selectedIfIds.size === 0 ? 'text-navy-400' : 'text-navy-800'}>
                  {selectedIfIds.size === 0
                    ? 'All interfaces'
                    : `${selectedIfIds.size} interface${selectedIfIds.size > 1 ? 's' : ''} selected`}
                </span>
                <svg
                  className={`h-4 w-4 text-navy-400 shrink-0 transition-transform ${ifDropdownOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {ifDropdownOpen && (
                <div className="absolute z-20 mt-1 w-72 rounded-md border border-navy-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-navy-100">
                    <input
                      type="text"
                      value={ifSearch}
                      onChange={e => setIfSearch(e.target.value)}
                      placeholder="Search interfaces…"
                      className="input text-xs py-1.5 w-full"
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-1.5 border-b border-navy-100 bg-navy-50">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIfIds(prev => {
                          const next = new Set(prev);
                          filteredIfOptions.forEach(o => next.add(o.id));
                          return next;
                        })
                      }
                      className="text-xs text-rail hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-navy-300">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIfIds(new Set())}
                      className="text-xs text-navy-500 hover:underline"
                    >
                      Clear
                    </button>
                    <span className="ml-auto text-[10px] text-navy-400">
                      {filteredIfOptions.length} shown
                    </span>
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredIfOptions.map(o => (
                      <li key={o.id}>
                        <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-navy-50 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedIfIds.has(o.id)}
                            onChange={() => toggleInterface(o.id)}
                            className="rounded border-navy-300"
                          />
                          <span className="font-mono text-xs text-navy-600 shrink-0 w-12">{o.id}</span>
                          <span className="text-xs text-navy-700 truncate">
                            {o.name !== o.id ? o.name : ''}
                          </span>
                        </label>
                      </li>
                    ))}
                    {filteredIfOptions.length === 0 && (
                      <li className="px-3 py-4 text-xs text-navy-400 text-center">No interfaces match</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Keyword search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={e => { setKeyword(e.target.value); setExpandedLog(null); }}
                placeholder="Message, service, server…"
                className="input w-full"
              />
            </div>

            {/* Transaction ID */}
            <div className="min-w-[220px]">
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Transaction ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={txnFilter}
                  onChange={e => { setTxnFilter(e.target.value); setExpandedLog(null); }}
                  placeholder="Paste or type a transaction ID…"
                  className="input w-full pr-7 font-mono text-xs"
                />
                {txnFilter && (
                  <button
                    onClick={() => { setTxnFilter(''); setExpandedLog(null); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
                    aria-label="Clear transaction filter"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Event type */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Event
              </label>
              <select
                value={eventFilter}
                onChange={e => { setEventFilter(e.target.value as EventFilter); setExpandedLog(null); }}
                className="input min-w-[130px]"
              >
                <option value="ALL">All events</option>
                <option value="Start">Start</option>
                <option value="Info">Info</option>
                <option value="Success">Success</option>
                <option value="Failure">Failure</option>
              </select>
            </div>
          </div>

          {/* Row 2: Time filter */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Time filter
              </label>
              <select
                value={timeMode}
                onChange={e => {
                  setTimeMode(e.target.value as TimeMode);
                  setTimeAfter('');
                  setTimeBefore('');
                }}
                className="input min-w-[150px]"
              >
                <option value="NONE">No time filter</option>
                <option value="AFTER">After</option>
                <option value="BEFORE">Before</option>
                <option value="BETWEEN">Between</option>
              </select>
            </div>

            {(timeMode === 'AFTER' || timeMode === 'BETWEEN') && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                  {timeMode === 'BETWEEN' ? 'From' : 'After'}
                </label>
                <input
                  type="datetime-local"
                  step="1"
                  value={timeAfter}
                  onChange={e => setTimeAfter(e.target.value)}
                  className="input"
                />
              </div>
            )}

            {(timeMode === 'BEFORE' || timeMode === 'BETWEEN') && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                  {timeMode === 'BETWEEN' ? 'To' : 'Before'}
                </label>
                <input
                  type="datetime-local"
                  step="1"
                  value={timeBefore}
                  onChange={e => setTimeBefore(e.target.value)}
                  className="input"
                />
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="px-6 py-2.5 border-b border-navy-100 bg-white flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase tracking-wider text-navy-400 font-semibold mr-1">
              Active:
            </span>

            {[...selectedIfIds].map(id => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-700">
                {id}
                <button onClick={() => toggleInterface(id)} className="ml-0.5 text-navy-400 hover:text-navy-700">
                  <XIcon />
                </button>
              </span>
            ))}

            {keyword && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                "{keyword}"
                <button onClick={() => setKeyword('')} className="ml-0.5 text-purple-400 hover:text-purple-700">
                  <XIcon />
                </button>
              </span>
            )}

            {eventFilter !== 'ALL' && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                eventFilter === 'Failure' ? 'bg-red-100 text-red-700'     :
                eventFilter === 'Success' ? 'bg-emerald-100 text-emerald-700' :
                eventFilter === 'Info'    ? 'bg-amber-100 text-amber-700' :
                                            'bg-sky-100 text-sky-700'
              }`}>
                {eventFilter}
                <button
                  onClick={() => setEventFilter('ALL')}
                  className={`ml-0.5 ${
                    eventFilter === 'Failure' ? 'text-red-400 hover:text-red-700'       :
                    eventFilter === 'Success' ? 'text-emerald-400 hover:text-emerald-700' :
                    eventFilter === 'Info'    ? 'text-amber-400 hover:text-amber-700'   :
                                                'text-sky-400 hover:text-sky-700'
                  }`}
                >
                  <XIcon />
                </button>
              </span>
            )}

            {timeMode !== 'NONE' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {timeMode === 'AFTER'   ? `After ${fmtFilterLabel(timeAfter)}` :
                 timeMode === 'BEFORE'  ? `Before ${fmtFilterLabel(timeBefore)}` :
                 `${fmtFilterLabel(timeAfter)} – ${fmtFilterLabel(timeBefore)}`}
                <button
                  onClick={() => { setTimeMode('NONE'); setTimeAfter(''); setTimeBefore(''); }}
                  className="ml-0.5 text-amber-400 hover:text-amber-700"
                >
                  <XIcon />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results summary bar */}
        <div className="px-6 py-2 bg-white border-b border-navy-100 text-xs text-navy-500 flex items-center justify-between">
          <span>
            Showing{' '}
            <span className="font-semibold text-navy-800">{filteredLogs.length}</span>
            {hasActiveFilters ? ` of ${allLogs.length} logs` : ' logs'}
            {selectedIfIds.size > 0
              ? ` across ${selectedIfIds.size} interface${selectedIfIds.size > 1 ? 's' : ''}`
              : ''}
          </span>
          <span>
            <span className="text-sky-600 font-medium">
              {filteredLogs.filter(l => l.EventType === 'Start').length} start
            </span>
            {' · '}
            <span className="text-amber-600 font-medium">
              {filteredLogs.filter(l => l.EventType === 'Info').length} info
            </span>
            {' · '}
            <span className="text-emerald-600 font-medium">
              {filteredLogs.filter(l => l.EventType === 'Success').length} ok
            </span>
            {' · '}
            <span className="text-red-500 font-medium">
              {filteredLogs.filter(l => l.EventType === 'Failure').length} fail
            </span>
          </span>
        </div>

        {/* Empty state */}
        {filteredLogs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-navy-700">No logs match these filters</p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="mt-2 text-sm text-rail hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-navy-100">
                <thead className="bg-navy-50">
                  <tr>
                    {['Event', 'Interface', 'Log ID', 'Transaction ID', 'Service', 'Message', 'Server', 'Time', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 bg-white">
                  {pagedLogs.map(log => {
                    const isFailure  = log.EventType === 'Failure';
                    const isExpanded = expandedLog === log.ID;
                    return (
                      <>
                        <tr
                          key={log.ID}
                          onClick={() => setExpandedLog(isExpanded ? null : log.ID)}
                          className={`cursor-pointer select-none transition-colors ${
                            isFailure
                              ? isExpanded ? 'bg-red-50' : 'bg-red-50/40 hover:bg-red-50'
                              : isExpanded ? 'bg-navy-50' : 'hover:bg-navy-50'
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <EventBadge type={log.EventType} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              to={`/projects/${encodeURIComponent(log.InterfaceID)}`}
                              onClick={e => e.stopPropagation()}
                              className="font-mono text-xs text-navy-500 hover:text-rail hover:underline"
                            >
                              {log.InterfaceID}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-500 whitespace-nowrap">
                            {log.ID}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-600 whitespace-nowrap">
                            {log.TransactionID.slice(0, 8)}…
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-700 max-w-[160px] truncate">
                            {log.ServiceName}
                          </td>
                          <td className="px-4 py-3 text-sm text-navy-800">
                            {log.LogMessage}
                            {isFailure && log.ErrorType !== 'NULL' && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                [{log.ErrorType}]
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-600 whitespace-nowrap">
                            {log.ServerName}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-500 whitespace-nowrap">
                            {fmtTs(log.CreatedDate)}
                          </td>
                          <td className="px-4 py-3 text-navy-400">
                            <svg
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${log.ID}-detail`} className="bg-navy-50/60">
                            <td colSpan={9} className="px-6 py-5">
                              <LogDetailPanel log={log} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-navy-100">
              {pagedLogs.map(log => {
                const isFailure  = log.EventType === 'Failure';
                const isExpanded = expandedLog === log.ID;
                return (
                  <div
                    key={log.ID}
                    onClick={() => setExpandedLog(isExpanded ? null : log.ID)}
                    className={`p-4 cursor-pointer select-none transition-colors ${
                      isFailure
                        ? isExpanded ? 'bg-red-50' : 'bg-red-50/40'
                        : isExpanded ? 'bg-navy-50' : 'hover:bg-navy-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <EventBadge type={log.EventType} />
                        <span className="font-mono text-xs text-navy-500">{log.InterfaceID}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-navy-400">{fmtTs(log.CreatedDate)}</span>
                        <svg
                          className={`h-4 w-4 text-navy-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20" fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm text-navy-800 mb-1">{log.LogMessage}</p>
                    {isFailure && log.ErrorType !== 'NULL' && (
                      <p className="text-xs text-red-600 font-medium mb-1">{log.ErrorType}</p>
                    )}
                    <p className="text-xs text-navy-500 font-mono truncate">{log.TransactionID}</p>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-navy-200">
                        <LogDetailPanel log={log} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Pagination bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-navy-100 bg-white">
                <span className="text-xs text-navy-500">
                  Page <span className="font-semibold text-navy-800">{page}</span> of{' '}
                  <span className="font-semibold text-navy-800">{totalPages}</span>
                  {' '}·{' '}
                  <span className="font-semibold text-navy-800">{filteredLogs.length}</span> total
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setPage(1); setExpandedLog(null); }}
                    disabled={page === 1}
                    className="rounded px-2 py-1 text-xs text-navy-600 hover:bg-navy-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="First page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => { setPage(p => p - 1); setExpandedLog(null); }}
                    disabled={page === 1}
                    className="rounded px-2.5 py-1 text-xs text-navy-600 hover:bg-navy-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-navy-400">…</span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => { setPage(n as number); setExpandedLog(null); }}
                          className={`rounded px-2.5 py-1 text-xs font-medium ${
                            page === n
                              ? 'bg-navy-800 text-white'
                              : 'text-navy-600 hover:bg-navy-100'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => { setPage(p => p + 1); setExpandedLog(null); }}
                    disabled={page === totalPages}
                    className="rounded px-2.5 py-1 text-xs text-navy-600 hover:bg-navy-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => { setPage(totalPages); setExpandedLog(null); }}
                    disabled={page === totalPages}
                    className="rounded px-2 py-1 text-xs text-navy-600 hover:bg-navy-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: number; sub: string; accent: string; icon: React.ReactNode;
}
function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l" style={{ backgroundColor: accent }} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 truncate">{label}</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-navy-900 tabular-nums">{value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-navy-500 truncate">{sub}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}18` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, { chip: string; dot: string }> = {
    Start:   { chip: 'bg-sky-100 text-sky-700',         dot: 'bg-sky-500' },
    Info:    { chip: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
    Success: { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    Failure: { chip: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  };
  const s = styles[type] ?? { chip: 'bg-navy-100 text-navy-700', dot: 'bg-navy-400' };
  return (
    <span className={`chip font-medium ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {type}
    </span>
  );
}

function LogDetailPanel({ log }: { log: Log }) {
  const fmt = (raw: string) => {
    if (!raw || raw === 'NULL') return null;
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  };

  const fields: [string, string, boolean?][] = [
    ['Log ID',        log.ID],
    ['Interface ID',  log.InterfaceID],
    ['Transaction ID', log.TransactionID, true],
    ['Event Type',    log.EventType],
    ['Error Type',    log.ErrorType === 'NULL' ? '—' : log.ErrorType],
    ['Service',       log.ServiceName, true],
    ['Server',        log.ServerName],
    ['Message',       log.LogMessage],
    ['Display Order', log.DisplayOrder],
    ['Auto Retry',    log.IsAutoRetry === '1' ? 'Yes' : 'No'],
    ['Active',        log.IsActive],
    ['Created By',    log.CreatedBy],
    ['Created Date',  fmtTs(log.CreatedDate)],
    ['Modified By',   log.ModifiedBy === 'NULL' ? '—' : log.ModifiedBy],
    ['Modified Date', log.ModifiedDate === 'NULL' ? '—' : log.ModifiedDate],
  ];

  const requestPayload  = fmt(log.RequestPayload);
  const responsePayload = fmt(log.ResponsePayload);
  const errorPayload    = fmt(log.ErrorPayload);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-navy-200 overflow-hidden">
        {fields.map(([label, value, mono], idx) => (
          <div
            key={label}
            className={`grid grid-cols-[160px_1fr] gap-4 px-4 py-2 text-xs ${
              idx % 2 === 0 ? 'bg-white' : 'bg-navy-50/60'
            }`}
          >
            <span className="font-semibold uppercase tracking-wider text-navy-500 shrink-0">{label}</span>
            <span className={`text-navy-800 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
          </div>
        ))}
      </div>

      {(requestPayload || responsePayload || errorPayload) && (
        <div className="space-y-3">
          {requestPayload && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-navy-500 font-semibold mb-1">Request Payload</p>
              <pre className="text-xs text-navy-700 bg-white border border-navy-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">{requestPayload}</pre>
            </div>
          )}
          {responsePayload && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-navy-500 font-semibold mb-1">Response Payload</p>
              <pre className="text-xs text-navy-700 bg-white border border-navy-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">{responsePayload}</pre>
            </div>
          )}
          {errorPayload && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-1">Error Payload</p>
              <pre className="text-xs text-navy-700 bg-red-50 border border-red-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">{errorPayload}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconLogs() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}
