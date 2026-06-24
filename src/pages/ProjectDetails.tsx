import { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import data from '../data/interfaces.json';
import type { Interface, Log, InterfaceInsights } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLogsByInterfaceIDThunk, syncLogsByInterfaceIDThunk } from '../store/logsSlice';
import { fetchInsightsByInterfaceID } from '../services/api';
import { getCategoryBg, formatDateTime, getCategory } from '../lib/utils';

type EventFilter = 'ALL' | 'Start' | 'Info' | 'Success' | 'Failure';
type TimeMode    = 'NONE' | 'AFTER' | 'BEFORE' | 'BETWEEN';

const toEpoch = (s: string): number => {
  if (!s) return NaN;
  const ms = new Date(s).getTime();
  return isNaN(ms) ? NaN : ms;
};

const fmtFilterLabel = (s: string) =>
  s
    ? new Date(s).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

const interfaces = data as Interface[];

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const decodedId = decodeURIComponent(id || '');
  const ifState    = useAppSelector(s => s.logs.byInterface[decodedId]);
  const logs       = ifState?.items   ?? [];
  const logsLoading = ifState?.loading ?? false;
  const logsError   = ifState?.error   ?? null;

  // Fetch on mount; MAINTAIN_CACHE controls whether the network is hit
  useEffect(() => {
    dispatch(fetchLogsByInterfaceIDThunk(decodedId));
  }, [dispatch, decodedId]);

  const refetchLogs = () => dispatch(syncLogsByInterfaceIDThunk(decodedId));

  const [insights, setInsights]               = useState<InterfaceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError]     = useState<string | null>(null);

  useEffect(() => {
    setInsightsLoading(true);
    setInsightsError(null);
    fetchInsightsByInterfaceID(decodedId)
      .then(results => {
        setInsights(results[0] ?? null);
        setInsightsLoading(false);
      })
      .catch(err => {
        setInsightsError(err.message);
        setInsightsLoading(false);
      });
  }, [decodedId]);
  const [expandedLog, setExpandedLog]       = useState<string | null>(null);
  const [logSearch, setLogSearch]           = useState('');
  const [txnFilter, setTxnFilter]           = useState('');
  const [logEventFilter, setLogEventFilter] = useState<EventFilter>('ALL');
  const [logServerFilter, setLogServerFilter] = useState('ALL');
  const [timeMode, setTimeMode]             = useState<TimeMode>('NONE');
  const [timeAfter, setTimeAfter]           = useState('');
  const [timeBefore, setTimeBefore]         = useState('');
  const [page, setPage]                     = useState(1);
  const PAGE_SIZE = 20;

  const item = useMemo(
    () => interfaces.find(i => i.InterfaceID === decodedId),
    [decodedId]
  );

  const servers = useMemo(
    () => Array.from(new Set(logs.map(l => l.ServerName))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q   = logSearch.trim().toLowerCase();
    const txn = txnFilter.trim().toLowerCase();
    return logs.filter(l => {
      if (logEventFilter !== 'ALL' && l.EventType !== logEventFilter) return false;
      if (logServerFilter !== 'ALL' && l.ServerName !== logServerFilter) return false;
      if (txn && !l.TransactionID.toLowerCase().includes(txn)) return false;
      if (q) {
        const hay = [l.TransactionID, l.ServiceName, l.LogMessage, l.ServerName, l.ID]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (timeMode !== 'NONE') {
        const logTs = toEpoch(l.CreatedDate);
        if (!isNaN(logTs)) {
          if (timeMode === 'AFTER'   && timeAfter  && logTs < toEpoch(timeAfter))  return false;
          if (timeMode === 'BEFORE'  && timeBefore && logTs > toEpoch(timeBefore)) return false;
          if (timeMode === 'BETWEEN' && timeAfter  && timeBefore &&
              (logTs < toEpoch(timeAfter) || logTs > toEpoch(timeBefore)))         return false;
        }
      }
      return true;
    });
  }, [logs, logSearch, txnFilter, logEventFilter, logServerFilter, timeMode, timeAfter, timeBefore]);

  const hasLogFilters =
    logSearch !== '' || txnFilter !== '' || logEventFilter !== 'ALL' ||
    logServerFilter !== 'ALL' || timeMode !== 'NONE';

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
    setExpandedLog(null);
  }, [logSearch, txnFilter, logEventFilter, logServerFilter, timeMode, timeAfter, timeBefore]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs  = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportToCSV() {
    const headers = ['Log ID','Interface ID','Transaction ID','Event Type','Service','Server','Message','Error Type','Created Date'];
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredLogs.map(l => [
      l.ID, l.InterfaceID, l.TransactionID, l.EventType,
      l.ServiceName, l.ServerName, l.LogMessage,
      l.ErrorType === 'NULL' ? '' : l.ErrorType, l.CreatedDate,
    ].map(String).map(esc).join(','));
    const csv  = [headers.map(esc).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `logs-${decodedId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const clearLogFilters = () => {
    setLogSearch('');
    setTxnFilter('');
    setLogEventFilter('ALL');
    setLogServerFilter('ALL');
    setTimeMode('NONE');
    setTimeAfter('');
    setTimeBefore('');
    setPage(1);
  };

  if (!item) {
    return (
      <div className="w-full px-6 lg:px-8 py-12">
        <div className="card p-12 text-center">
          <p className="font-display text-2xl font-bold text-navy-900 mb-2">
            Project not found
          </p>
          <p className="text-sm text-navy-600 mb-6">
            No interface with ID "{id}" exists in the catalog.
          </p>
          <Link to="/" className="btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cat = getCategory(item);

  // Transaction-based success/failure — count unique TxIDs that resolved
  const txOutcomes: Record<string, string> = {};
  for (const l of logs) {
    if (l.EventType === 'Success' || l.EventType === 'Failure') {
      txOutcomes[l.TransactionID] = l.EventType;
    }
  }
  const txVals      = Object.values(txOutcomes);
  const totalTxns   = txVals.length;
  const successTxns = txVals.filter(v => v === 'Success').length;
  const failureTxns = txVals.filter(v => v === 'Failure').length;
  const successRate = totalTxns > 0 ? Math.round((successTxns / totalTxns) * 100) : null;

  return (
    <div className="w-full px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-navy-600">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 hover:text-rail"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <span className="text-navy-300">/</span>
        <Link to="/" className="hover:text-rail">Dashboard</Link>
        <span className="text-navy-300">/</span>
        <span className="font-mono text-xs text-navy-700">{item.InterfaceID}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`chip ${getCategoryBg(cat)}`}>{cat}</span>
              <span className="chip bg-navy-100 text-navy-800 font-semibold">
                {item.InterfacePriority}
              </span>
              {item.IsActive === 1 ? (
                <span className="chip bg-emerald-100 text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="chip bg-navy-100 text-navy-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-navy-400" />
                  Inactive
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">
              {item.InterfaceName}
            </h1>
            <p className="mt-1 font-mono text-xs text-navy-500">{item.InterfaceID}</p>
          </div>
        </div>
        <p className="mt-4 text-navy-700 leading-relaxed">{item.Description}</p>
      </div>

      {/* Flow diagram */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-navy-900 mb-4">
          Integration flow
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 rounded-md border border-navy-200 bg-navy-50 p-4">
            <p className="text-xs uppercase tracking-wider text-navy-500 mb-1">Source</p>
            <p className="font-display text-xl font-semibold text-navy-900">
              {item.SourceApplication}
            </p>
            <p className="mt-1 text-xs text-navy-600">
              Protocol · <span className="font-medium">{item.SourceProtocol}</span>
            </p>
          </div>

          <div className="flex flex-col items-center text-navy-400">
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="hidden sm:block">
              <path d="M2 12h36M30 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none" className="sm:hidden">
              <path d="M12 2v28M4 22l8 8 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="mt-1 text-xs uppercase tracking-wider">{item.InterfaceFrequency}</span>
          </div>

          <div className="flex-1 rounded-md border border-navy-200 bg-navy-50 p-4">
            <p className="text-xs uppercase tracking-wider text-navy-500 mb-1">Target</p>
            <p className="font-display text-xl font-semibold text-navy-900">
              {item.TargetApplication}
            </p>
            <p className="mt-1 text-xs text-navy-600">
              Protocol · <span className="font-medium">{item.TargetProtocol}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Specification">
          <Field label="Data object" value={item.DataObject} />
          <Field label="Package" value={item.PackageName} mono />
          <Field label="Priority" value={item.InterfacePriority} />
          <Field label="Frequency" value={item.InterfaceFrequency} />
          <Field label="Category" value={cat} />
        </Section>

        <Section title="Audit">
          <Field label="Created by" value={item.CreatedBy ?? '—'} />
          <Field label="Created on" value={formatDateTime(item.CreatedDate)} />
          <Field label="Modified by" value={item.ModifiedBy ?? '—'} />
          <Field label="Modified on" value={formatDateTime(item.ModifiedDate)} />
          <Field label="Status" value={item.IsActive === 1 ? 'Active' : 'Inactive'} />
        </Section>
      </div>

      {/* Insights */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-navy-900">Insights</h2>
          {insightsError && (
            <span className="text-xs text-red-500">{insightsError}</span>
          )}
        </div>

        {insightsLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy-200 border-t-rail" />
          </div>
        ) : insights ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Transactions */}
            <div className="rounded-xl border border-navy-100 bg-navy-50 p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l bg-navy-400" />
              <div className="pl-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-1">
                  Total Transactions
                </p>
                <p className="font-display text-3xl font-bold text-navy-900 tabular-nums">
                  {insights.TotalTransactions.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-navy-500">Completed transactions</p>
              </div>
            </div>

            {/* Succeeded */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l bg-emerald-500" />
              <div className="pl-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                  Succeeded
                </p>
                <p className="font-display text-3xl font-bold text-emerald-700 tabular-nums">
                  {insights.SuccessCount.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  {insights.SuccessRate.toFixed(2)}% success rate
                </p>
              </div>
            </div>

            {/* Failed */}
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l bg-red-500" />
              <div className="pl-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-1">
                  Failed
                </p>
                <p className="font-display text-3xl font-bold text-red-600 tabular-nums">
                  {insights.FailureCount.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {insights.FailureRate.toFixed(2)}% failure rate
                </p>
              </div>
            </div>

            {/* Last Transaction */}
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l bg-purple-400" />
              <div className="pl-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-1">
                  Last Transaction
                </p>
                {insights.LastTransactionTime ? (
                  <>
                    <p className="font-display text-base font-bold text-purple-800 leading-tight">
                      {new Date(insights.LastTransactionTime).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <p className="mt-1 text-xs text-purple-600 font-mono">
                      {new Date(insights.LastTransactionTime).toLocaleTimeString(undefined, {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="font-display text-base font-bold text-purple-400">—</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-navy-500 text-center py-6">No insights available</p>
        )}
      </div>

      {/* Logs */}
      <div className="card overflow-hidden">
        {logsLoading && (
          <div className="flex items-center justify-center px-6 py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-rail" />
          </div>
        )}
        {logsError && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-navy-800 mb-2">Failed to load logs</p>
            <p className="text-xs text-navy-500 mb-4">{logsError}</p>
            <button onClick={refetchLogs} className="btn-ghost text-xs">Retry</button>
          </div>
        )}
        {!logsLoading && !logsError && (
          <>
        {/* Logs header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-navy-100">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-navy-900">
                Logs for this interface
              </h2>
              <p className="text-xs text-navy-500 mt-0.5">
                <span className="font-semibold text-navy-900">{filteredLogs.length}</span>
                {hasLogFilters ? ` of ${logs.length}` : ''}{' '}
                {logs.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <button
              onClick={refetchLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-50 transition-colors"
              title="Sync latest logs from server"
            >
              <svg
                className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
              </svg>
              {logsLoading ? 'Syncing…' : 'Sync'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-40 transition-colors"
              title="Download filtered logs as CSV"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v7.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.75A.75.75 0 0 1 10 3ZM3.75 15a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clipRule="evenodd" />
              </svg>
              Export CSV
            </button>
          </div>
          {logs.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-navy-600">
                {totalTxns} transaction{totalTxns !== 1 ? 's' : ''}
              </span>
              <span className="text-navy-300">·</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {successTxns} succeeded
              </span>
              <span className="flex items-center gap-1.5 font-medium text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {failureTxns} failed
              </span>
              {successRate !== null && (
                <span className="font-semibold text-navy-700">
                  {successRate}% success rate
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter bar */}
        {logs.length > 0 && (
          <div className="border-b border-navy-100">
            {/* Row 1 */}
            <div className="px-6 py-3 bg-navy-50/50 flex flex-wrap gap-3 items-end">
              {/* Keyword */}
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                  Keyword
                </label>
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => { setLogSearch(e.target.value); setExpandedLog(null); }}
                  placeholder="Message, service, server…"
                  className="input w-full"
                />
              </div>

              {/* Transaction ID */}
              <div className="min-w-[200px]">
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
                  value={logEventFilter}
                  onChange={e => { setLogEventFilter(e.target.value as EventFilter); setExpandedLog(null); }}
                  className="input min-w-[130px]"
                >
                  <option value="ALL">All events</option>
                  <option value="Start">Start</option>
                  <option value="Info">Info</option>
                  <option value="Success">Success</option>
                  <option value="Failure">Failure</option>
                </select>
              </div>

              {/* Server */}
              {servers.length > 1 && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                    Server
                  </label>
                  <select
                    value={logServerFilter}
                    onChange={e => setLogServerFilter(e.target.value)}
                    className="input min-w-[130px]"
                  >
                    <option value="ALL">All servers</option>
                    {servers.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Row 2: Time filter */}
            <div className="px-6 py-3 bg-navy-50/30 border-t border-navy-100 flex flex-wrap gap-3 items-end">
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

              {/* Quick presets */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                  Quick preset
                </label>
                <div className="flex gap-1.5">
                  {([['1h', 60*60*1000], ['6h', 6*60*60*1000], ['24h', 24*60*60*1000], ['7d', 7*24*60*60*1000]] as [string, number][]).map(([label, ms]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() - ms);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                        setTimeMode('AFTER');
                        setTimeAfter(local);
                        setTimeBefore('');
                      }}
                      className="rounded border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 hover:border-navy-300 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
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

              {hasLogFilters && (
                <button onClick={clearLogFilters} className="btn-ghost self-end">
                  Clear all
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {hasLogFilters && (
              <div className="px-6 py-2.5 bg-white border-t border-navy-100 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] uppercase tracking-wider text-navy-400 font-semibold mr-1">
                  Active:
                </span>
                {logSearch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    "{logSearch}"
                    <button onClick={() => setLogSearch('')} className="ml-0.5 text-purple-400 hover:text-purple-700">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                    </button>
                  </span>
                )}
                {txnFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-mono font-medium text-navy-700">
                    {txnFilter}
                    <button onClick={() => setTxnFilter('')} className="ml-0.5 text-navy-400 hover:text-navy-700">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                    </button>
                  </span>
                )}
                {logEventFilter !== 'ALL' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    logEventFilter === 'Failure' ? 'bg-red-100 text-red-700'           :
                    logEventFilter === 'Success' ? 'bg-emerald-100 text-emerald-700'   :
                    logEventFilter === 'Info'    ? 'bg-amber-100 text-amber-700'       :
                                                   'bg-sky-100 text-sky-700'
                  }`}>
                    {logEventFilter}
                    <button
                      onClick={() => setLogEventFilter('ALL')}
                      className={`ml-0.5 ${
                        logEventFilter === 'Failure' ? 'text-red-400 hover:text-red-700'             :
                        logEventFilter === 'Success' ? 'text-emerald-400 hover:text-emerald-700'     :
                        logEventFilter === 'Info'    ? 'text-amber-400 hover:text-amber-700'         :
                                                       'text-sky-400 hover:text-sky-700'
                      }`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                    </button>
                  </span>
                )}
                {logServerFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {logServerFilter}
                    <button onClick={() => setLogServerFilter('ALL')} className="ml-0.5 text-indigo-400 hover:text-indigo-700">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                    </button>
                  </span>
                )}
                {timeMode !== 'NONE' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {timeMode === 'AFTER'   ? `After ${fmtFilterLabel(timeAfter)}`   :
                     timeMode === 'BEFORE'  ? `Before ${fmtFilterLabel(timeBefore)}` :
                     `${fmtFilterLabel(timeAfter)} – ${fmtFilterLabel(timeBefore)}`}
                    <button
                      onClick={() => { setTimeMode('NONE'); setTimeAfter(''); setTimeBefore(''); }}
                      className="ml-0.5 text-amber-400 hover:text-amber-700"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Results summary bar */}
            <div className="px-6 py-2 bg-white border-t border-navy-100 text-xs text-navy-500 flex items-center justify-between">
              <span>
                Showing{' '}
                <span className="font-semibold text-navy-800">{filteredLogs.length}</span>
                {hasLogFilters ? ` of ${logs.length} logs` : ' logs'}
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
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-navy-900 font-medium text-sm mb-1">
              {hasLogFilters ? 'No logs match these filters' : 'No logs found for this interface'}
            </p>
            {hasLogFilters && (
              <button onClick={clearLogFilters} className="mt-2 text-sm text-rail hover:underline">
                Clear filters
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
                    <LogTh>Event</LogTh>
                    <LogTh>Log ID</LogTh>
                    <LogTh>Transaction ID</LogTh>
                    <LogTh>Service</LogTh>
                    <LogTh>Message</LogTh>
                    <LogTh>Server</LogTh>
                    <LogTh>Time</LogTh>
                    <LogTh />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 bg-white">
                  {pagedLogs.map(log => {
                    const isFailure = log.EventType === 'Failure';
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
                          <td className="px-4 py-3 font-mono text-xs text-navy-500 whitespace-nowrap">
                            {log.ID}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-600 whitespace-nowrap">
                            {log.TransactionID.slice(0, 8)}…
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-700 max-w-[200px] truncate">
                            {log.ServiceName}
                          </td>
                          <td className="px-4 py-3 text-sm text-navy-800">
                            {log.LogMessage}
                            {isFailure && log.ErrorType !== 'NULL' && (
                              <span className="ml-2 text-xs text-rail font-medium">
                                [{log.ErrorType}]
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-600 whitespace-nowrap">
                            {log.ServerName}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-500 whitespace-nowrap">
                            {formatDateTime(log.CreatedDate)}
                          </td>
                          <td className="px-4 py-3 text-navy-400">
                            <svg
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${log.ID}-detail`} className="bg-navy-50/60">
                            <td colSpan={8} className="px-6 py-5">
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
                const isFailure = log.EventType === 'Failure';
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
                      <EventBadge type={log.EventType} />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-navy-400">{formatDateTime(log.CreatedDate)}</span>
                        <svg
                          className={`h-4 w-4 text-navy-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm text-navy-800 mb-1">{log.LogMessage}</p>
                    {isFailure && log.ErrorType !== 'NULL' && (
                      <p className="text-xs text-rail font-medium mb-1">{log.ErrorType}</p>
                    )}
                    <p className="text-xs text-navy-500 font-mono truncate mb-1">
                      {log.TransactionID}
                    </p>
                    <p className="text-xs text-navy-500 truncate">{log.ServiceName}</p>
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
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyField(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  const fmt = (raw: string) => {
    if (!raw || raw === 'NULL') return null;
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  };

  const fields: [string, string, boolean?, boolean?][] = [
    ['Log ID',         log.ID,            false, true],
    ['Interface ID',   log.InterfaceID],
    ['Transaction ID', log.TransactionID,  true,  true],
    ['Event Type',     log.EventType],
    ['Error Type',     log.ErrorType === 'NULL' ? '—' : log.ErrorType],
    ['Service Name',   log.ServiceName,    true],
    ['Server',         log.ServerName],
    ['Log Message',    log.LogMessage],
    ['Display Order',  log.DisplayOrder],
    ['Auto Retry',     log.IsAutoRetry === '1' ? 'Yes' : 'No'],
    ['Active',         log.IsActive],
    ['Created By',     log.CreatedBy],
    ['Created Date',   formatDateTime(log.CreatedDate)],
    ['Modified By',    log.ModifiedBy === 'NULL' ? '—' : log.ModifiedBy],
    ['Modified Date',  log.ModifiedDate === 'NULL' ? '—' : log.ModifiedDate],
  ];

  const requestPayload  = fmt(log.RequestPayload);
  const responsePayload = fmt(log.ResponsePayload);
  const errorPayload    = fmt(log.ErrorPayload);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-navy-200 overflow-hidden">
        {fields.map(([label, value, mono, copyable], idx) => (
          <div
            key={label}
            className={`grid grid-cols-[160px_1fr] gap-4 px-4 py-2 text-xs ${
              idx % 2 === 0 ? 'bg-white' : 'bg-navy-50/60'
            }`}
          >
            <span className="font-semibold uppercase tracking-wider text-navy-500 shrink-0">
              {label}
            </span>
            <div className="flex items-start gap-2 min-w-0">
              <span className={`text-navy-800 break-all flex-1 ${mono ? 'font-mono' : ''}`}>
                {value || '—'}
              </span>
              {copyable && value && value !== '—' && (
                <button
                  onClick={e => { e.stopPropagation(); copyField(label, value); }}
                  className="shrink-0 rounded p-0.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedField === label ? (
                    <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                      <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(requestPayload || responsePayload || errorPayload) && (
        <div className="space-y-3">
          {requestPayload && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-navy-500 font-semibold mb-1">
                Request Payload
              </p>
              <pre className="text-xs text-navy-700 bg-white border border-navy-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {requestPayload}
              </pre>
            </div>
          )}
          {responsePayload && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-navy-500 font-semibold mb-1">
                Response Payload
              </p>
              <pre className="text-xs text-navy-700 bg-white border border-navy-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {responsePayload}
              </pre>
            </div>
          )}
          {errorPayload && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-rail font-semibold mb-1">
                Error Payload
              </p>
              <pre className="text-xs text-navy-700 bg-red-50 border border-red-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {errorPayload}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="font-display text-lg font-semibold text-navy-900 mb-4">{title}</h2>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 items-baseline">
      <dt className="text-xs uppercase tracking-wider text-navy-500 col-span-1">{label}</dt>
      <dd className={`col-span-2 text-sm text-navy-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function LogTh({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy-600">
      {children}
    </th>
  );
}
