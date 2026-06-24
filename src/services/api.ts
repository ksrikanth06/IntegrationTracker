import { BASEURL, USE_MOCK } from '../config';
import type { Interface, Log, InterfaceInsights } from '../types';
import staticInterfaces from '../data/interfaces.json';
import staticLogs from '../data/logs.json';

interface ApiEnvelope<T> {
  response: { results: T[] };
}

// ── Mock response builder ─────────────────────────────────────────────────────

function mockEnvelope<T>(path: string): ApiEnvelope<T> {
  if (path === '/getInterfaceList') {
    return { response: { results: staticInterfaces as unknown as T[] } };
  }

  if (path === '/getRecentLogs') {
    return { response: { results: staticLogs as unknown as T[] } };
  }

  if (path.startsWith('/getLogsByInterfaceID/')) {
    const interfaceID = decodeURIComponent(path.slice('/getLogsByInterfaceID/'.length));
    const filtered = (staticLogs as unknown as Log[]).filter(
      l => l.InterfaceID === interfaceID,
    );
    return { response: { results: filtered as unknown as T[] } };
  }

  if (path.startsWith('/getInsightsByInterfaceID/')) {
    const interfaceID = decodeURIComponent(path.slice('/getInsightsByInterfaceID/'.length));
    const ifLogs = (staticLogs as unknown as Log[]).filter(l => l.InterfaceID === interfaceID);
    const txOutcomes: Record<string, string> = {};
    for (const l of ifLogs) {
      if (l.EventType === 'Success' || l.EventType === 'Failure') {
        txOutcomes[l.TransactionID] = l.EventType;
      }
    }
    const txVals  = Object.values(txOutcomes);
    const total   = txVals.length;
    const success = txVals.filter(v => v === 'Success').length;
    const failure = total - success;
    const sorted  = [...ifLogs].sort(
      (a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime(),
    );
    const insights: InterfaceInsights = {
      SuccessCount:        success,
      FailureCount:        failure,
      TotalTransactions:   total,
      SuccessRate:         total > 0 ? Math.round((success / total) * 10000) / 100 : 0,
      FailureRate:         total > 0 ? Math.round((failure / total) * 10000) / 100 : 0,
      LastTransactionTime: sorted[0]?.CreatedDate ?? null,
    };
    return { response: { results: [insights] as unknown as T[] } };
  }

  return { response: { results: [] } };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T[]> {
  if (USE_MOCK) {
    return mockEnvelope<T>(path).response.results;
  }

  const res = await fetch(`${BASEURL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const data: ApiEnvelope<T> = await res.json();
  return data.response.results;
}

async function post<TBody, TResult>(path: string, body: TBody): Promise<TResult> {
  if (USE_MOCK) {
    // Simulate a successful write by echoing the posted body back
    return body as unknown as TResult;
  }

  const res = await fetch(`${BASEURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const data: ApiEnvelope<TResult> = await res.json();
  return data.response.results[0];
}

// ── Public API surface ────────────────────────────────────────────────────────

export function fetchIntegrations(): Promise<Interface[]> {
  return get<Interface>('/getInterfaceList');
}

export function postIntegration(item: Interface): Promise<Interface> {
  return post<Interface, Interface>('/integrations', item);
}

/** Fetch recent logs across all interfaces — used by LogsExplorer. */
export function fetchRecentLogs(): Promise<Log[]> {
  return get<Log>('/getRecentLogs');
}

/** Fetch all logs for a specific interface — used by ProjectDetails. */
export function fetchLogsByInterfaceID(interfaceID: string): Promise<Log[]> {
  return get<Log>(`/getLogsByInterfaceID/${encodeURIComponent(interfaceID)}`);
}

/** Fetch aggregated insights for a specific interface — used by ProjectDetails. */
export function fetchInsightsByInterfaceID(interfaceID: string): Promise<InterfaceInsights[]> {
  return get<InterfaceInsights>(`/getInsightsByInterfaceID/${encodeURIComponent(interfaceID)}`);
}
