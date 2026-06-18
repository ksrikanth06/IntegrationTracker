import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import staticLogs from '../data/logs.json';
import type { Log } from '../types';
import { USE_API, MAINTAIN_CACHE } from '../config';
import { fetchRecentLogs, fetchLogsByInterfaceID } from '../services/api';
import type { RootState } from './index';

interface InterfaceLogEntry {
  items: Log[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

interface LogsState {
  /** Recent logs across all interfaces — for LogsExplorer. */
  items: Log[];
  loading: boolean;
  loaded: boolean;
  error: string | null;

  /** Per-interface log cache — for ProjectDetails. */
  byInterface: Record<string, InterfaceLogEntry>;
}

const initialState: LogsState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
  byInterface: {},
};

// ── LogsExplorer: recent logs ─────────────────────────────────────────────────

/** Respects MAINTAIN_CACHE — skips the network if already loaded this session. */
export const fetchRecentLogsThunk = createAsyncThunk<Log[], void, { state: RootState }>(
  'logs/fetchRecent',
  async (_, { getState, rejectWithValue }) => {
    if (MAINTAIN_CACHE && getState().logs.loaded) {
      return getState().logs.items;
    }
    if (!USE_API) return staticLogs as Log[];
    try {
      return await fetchRecentLogs();
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

/** Always fetches fresh data from the server. */
export const syncRecentLogsThunk = createAsyncThunk<Log[], void>(
  'logs/syncRecent',
  async (_, { rejectWithValue }) => {
    if (!USE_API) return staticLogs as Log[];
    try {
      return await fetchRecentLogs();
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

// ── ProjectDetails: per-interface logs ────────────────────────────────────────

/** Respects MAINTAIN_CACHE — skips the network if this interface was already loaded. */
export const fetchLogsByInterfaceIDThunk = createAsyncThunk<
  { id: string; logs: Log[] },
  string,
  { state: RootState }
>(
  'logs/fetchByInterface',
  async (interfaceID, { getState, rejectWithValue }) => {
    if (MAINTAIN_CACHE && getState().logs.byInterface[interfaceID]?.loaded) {
      return { id: interfaceID, logs: getState().logs.byInterface[interfaceID].items };
    }
    if (!USE_API) {
      const filtered = (staticLogs as Log[]).filter(l => l.InterfaceID === interfaceID);
      return { id: interfaceID, logs: filtered };
    }
    try {
      const logs = await fetchLogsByInterfaceID(interfaceID);
      return { id: interfaceID, logs };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

/** Always fetches fresh data for this interface. */
export const syncLogsByInterfaceIDThunk = createAsyncThunk<{ id: string; logs: Log[] }, string>(
  'logs/syncByInterface',
  async (interfaceID, { rejectWithValue }) => {
    if (!USE_API) {
      const filtered = (staticLogs as Log[]).filter(l => l.InterfaceID === interfaceID);
      return { id: interfaceID, logs: filtered };
    }
    try {
      const logs = await fetchLogsByInterfaceID(interfaceID);
      return { id: interfaceID, logs };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

/** Backward-compat alias used by any remaining callers. */
export const fetchLogsThunk = fetchRecentLogsThunk;

// ── Slice ─────────────────────────────────────────────────────────────────────

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    /** Wipe all cached log data — call on logout. */
    clearLogsCache: () => initialState,
  },
  extraReducers: builder => {
    // Recent logs (LogsExplorer)
    builder
      .addCase(fetchRecentLogsThunk.pending, state => {
        if (!state.loaded) state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentLogsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload;
        state.loaded  = true;
      })
      .addCase(fetchRecentLogsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = (action.payload as string) ?? action.error.message ?? 'Failed to load';
      })

      .addCase(syncRecentLogsThunk.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(syncRecentLogsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload;
        state.loaded  = true;
      })
      .addCase(syncRecentLogsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = (action.payload as string) ?? action.error.message ?? 'Failed to sync';
      });

    // Per-interface logs (ProjectDetails)
    builder
      .addCase(fetchLogsByInterfaceIDThunk.pending, (state, action) => {
        const id = action.meta.arg;
        if (!state.byInterface[id]?.loaded) {
          state.byInterface[id] = { items: [], loading: true, loaded: false, error: null };
        }
      })
      .addCase(fetchLogsByInterfaceIDThunk.fulfilled, (state, action) => {
        const { id, logs } = action.payload;
        state.byInterface[id] = { items: logs, loading: false, loaded: true, error: null };
      })
      .addCase(fetchLogsByInterfaceIDThunk.rejected, (state, action) => {
        const id = action.meta.arg;
        state.byInterface[id] = {
          items: state.byInterface[id]?.items ?? [],
          loading: false,
          loaded: false,
          error: (action.payload as string) ?? action.error.message ?? 'Failed to load',
        };
      })

      .addCase(syncLogsByInterfaceIDThunk.pending, (state, action) => {
        const id = action.meta.arg;
        const existing = state.byInterface[id];
        state.byInterface[id] = {
          items: existing?.items ?? [],
          loading: true,
          loaded: existing?.loaded ?? false,
          error: null,
        };
      })
      .addCase(syncLogsByInterfaceIDThunk.fulfilled, (state, action) => {
        const { id, logs } = action.payload;
        state.byInterface[id] = { items: logs, loading: false, loaded: true, error: null };
      })
      .addCase(syncLogsByInterfaceIDThunk.rejected, (state, action) => {
        const id = action.meta.arg;
        if (state.byInterface[id]) {
          state.byInterface[id].loading = false;
          state.byInterface[id].error =
            (action.payload as string) ?? action.error.message ?? 'Failed to sync';
        }
      });
  },
});

export const { clearLogsCache } = logsSlice.actions;
export default logsSlice.reducer;
