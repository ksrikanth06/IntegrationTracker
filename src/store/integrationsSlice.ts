import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import staticData from '../data/interfaces.json';
import type { Interface } from '../types';
import { USE_API, MAINTAIN_CACHE } from '../config';
import { fetchIntegrations, postIntegration } from '../services/api';
import type { RootState } from './index';

interface IntegrationsState {
  items: Interface[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: IntegrationsState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
};

/** Respects MAINTAIN_CACHE — skips the network if data was already loaded this session. */
export const fetchIntegrationsThunk = createAsyncThunk<Interface[], void, { state: RootState }>(
  'integrations/fetch',
  async (_, { getState, rejectWithValue }) => {
    if (MAINTAIN_CACHE && getState().integrations.loaded) {
      return getState().integrations.items;
    }
    if (!USE_API) return staticData as Interface[];
    try {
      return await fetchIntegrations();
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

/** Always fetches fresh data regardless of cache state. */
export const syncIntegrationsThunk = createAsyncThunk<Interface[], void>(
  'integrations/sync',
  async (_, { rejectWithValue }) => {
    if (!USE_API) return staticData as Interface[];
    try {
      return await fetchIntegrations();
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

export const addIntegrationThunk = createAsyncThunk(
  'integrations/add',
  async (item: Interface, { rejectWithValue }) => {
    if (!USE_API) return item;
    try {
      return await postIntegration(item);
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

const integrationsSlice = createSlice({
  name: 'integrations',
  initialState,
  reducers: {
    /** Clear all cached data — call on logout. */
    clearCache: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchIntegrationsThunk.pending, state => {
        if (!state.loaded) state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntegrationsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload;
        state.loaded  = true;
      })
      .addCase(fetchIntegrationsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = (action.payload as string) ?? action.error.message ?? 'Failed to load';
      })

      .addCase(syncIntegrationsThunk.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(syncIntegrationsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload;
        state.loaded  = true;
      })
      .addCase(syncIntegrationsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = (action.payload as string) ?? action.error.message ?? 'Failed to sync';
      })

      .addCase(addIntegrationThunk.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { clearCache } = integrationsSlice.actions;
export default integrationsSlice.reducer;
