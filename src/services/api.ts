import { API_BASE_URL } from '../config';
import type { Interface } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchIntegrations(): Promise<Interface[]> {
  return request<Interface[]>('/integrations');
}

export function postIntegration(item: Interface): Promise<Interface> {
  return request<Interface>('/integrations', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}
