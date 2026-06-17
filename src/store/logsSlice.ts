import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import staticData from '../data/logs.json';
import type { Log } from '../types';
import { USE_API } from '../config';
import { fetchLogs } from '../services/api';

interface LogsState {
  items: Log[];
  loading: boolean;
  error: string | null;
}

const initialState: LogsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchLogsThunk = createAsyncThunk(
  'logs/fetch',
  async (_, { rejectWithValue }) => {
    if (!USE_API) return staticData as Log[];
    try {
      return await fetchLogs();
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLogsThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchLogsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load';
      });
  },
});

export default logsSlice.reducer;
