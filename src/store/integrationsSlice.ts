import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import staticData from '../data/interfaces.json';
import type { Interface } from '../types';
import { USE_API } from '../config';
import { fetchIntegrations, postIntegration } from '../services/api';

interface IntegrationsState {
  items: Interface[];
  loading: boolean;
  error: string | null;
}

const initialState: IntegrationsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchIntegrationsThunk = createAsyncThunk(
  'integrations/fetch',
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
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchIntegrationsThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntegrationsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIntegrationsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load';
      })
      .addCase(addIntegrationThunk.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export default integrationsSlice.reducer;
