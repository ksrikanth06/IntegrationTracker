import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import data from '../data/interfaces.json';
import type { Interface, Log } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLogsThunk } from '../store/logsSlice';
import { getCategoryBg, formatDateTime, getCategory } from '../lib/utils';

const interfaces = data as Interface[];

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items: allLogs, loading: logsLoading, error: logsError } = useAppSelector(s => s.logs);
  const refetchLogs = () => dispatch(fetchLogsThunk());
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logEventFilter, setLogEventFilter] = useState<'ALL' | 'Success' | 'Error'>('ALL');
  const [logServerFilter, setLogServerFilter] = useState('ALL');

  const item = useMemo(
    () => interfaces.find(i => i.InterfaceID === decodeURIComponent(id || '')),
    [id]
  );

  const logs = useMemo(
    () => allLogs.filter(l => l.InterfaceID === decodeURIComponent(id || '')),
    [allLogs, id]
  );

  const servers = useMemo(
    () => Array.from(new Set(logs.map(l => l.ServerName))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return logs.filter(l => {
      if (logEventFilter !== 'ALL' && l.EventType !== logEventFilter) return false;
      if (logServerFilter !== 'ALL' && l.ServerName !== logServerFilter) return false;
      if (q) {
        const hay = [l.TransactionID, l.ServiceName, l.LogMessage, l.ServerName, l.ID]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, logSearch, logEventFilter, logServerFilter]);

  const hasLogFilters = logSearch !== '' || logEventFilter !== 'ALL' || logServerFilter !== 'ALL';

  const clearLogFilters = () => {
    setLogSearch('');
    setLogEventFilter('ALL');
    setLogServerFilter('ALL');
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
  const successCount = logs.filter(l => l.EventType === 'Success').length;
  const errorCount = logs.filter(l => l.EventType === 'Error').length;

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
          {logs.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {successCount} success
              </span>
              <span className="flex items-center gap-1.5 font-medium text-rail">
                <span className="h-2 w-2 rounded-full bg-rail" />
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Filter bar */}
        {logs.length > 0 && (
          <div className="px-6 py-3 border-b border-navy-100 bg-navy-50/50 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Search
              </label>
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Transaction ID, service, message…"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
                Event
              </label>
              <select
                value={logEventFilter}
                onChange={e => setLogEventFilter(e.target.value as typeof logEventFilter)}
                className="input min-w-[120px]"
              >
                <option value="ALL">All events</option>
                <option value="Success">Success</option>
                <option value="Error">Error</option>
              </select>
            </div>
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
            {hasLogFilters && (
              <button onClick={clearLogFilters} className="btn-ghost self-end">
                Clear
              </button>
            )}
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
                  {filteredLogs.map(log => {
                    const isError = log.EventType === 'Error';
                    const isExpanded = expandedLog === log.ID;

                    return (
                      <>
                        <tr
                          key={log.ID}
                          onClick={() => setExpandedLog(isExpanded ? null : log.ID)}
                          className={`cursor-pointer select-none transition-colors ${
                            isError
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
                            {isError && log.ErrorType !== 'NULL' && (
                              <span className="ml-2 text-xs text-rail font-medium">
                                [{log.ErrorType}]
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-navy-600 whitespace-nowrap">
                            {log.ServerName}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-navy-500 whitespace-nowrap">
                            {log.CreatedDate}
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
              {filteredLogs.map(log => {
                const isError = log.EventType === 'Error';
                const isExpanded = expandedLog === log.ID;

                return (
                  <div
                    key={log.ID}
                    onClick={() => setExpandedLog(isExpanded ? null : log.ID)}
                    className={`p-4 cursor-pointer select-none transition-colors ${
                      isError
                        ? isExpanded ? 'bg-red-50' : 'bg-red-50/40'
                        : isExpanded ? 'bg-navy-50' : 'hover:bg-navy-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <EventBadge type={log.EventType} />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-navy-400">{log.CreatedDate}</span>
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
                    {isError && log.ErrorType !== 'NULL' && (
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
  const isError = type === 'Error';
  return (
    <span
      className={`chip font-medium ${
        isError
          ? 'bg-red-100 text-red-700'
          : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'}`}
      />
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
    ['Service Name',  log.ServiceName, true],
    ['Server',        log.ServerName],
    ['Log Message',   log.LogMessage],
    ['Display Order', log.DisplayOrder],
    ['Auto Retry',    log.IsAutoRetry === '1' ? 'Yes' : 'No'],
    ['Active',        log.IsActive],
    ['Created By',    log.CreatedBy],
    ['Created Date',  log.CreatedDate],
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
            <span className="font-semibold uppercase tracking-wider text-navy-500 shrink-0">
              {label}
            </span>
            <span className={`text-navy-800 break-all ${mono ? 'font-mono' : ''}`}>
              {value || '—'}
            </span>
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
