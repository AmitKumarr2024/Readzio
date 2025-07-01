import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../connection/axiosInstance';

export const fetchSuggestedPosts = createAsyncThunk(
  'suggestedPosts/fetchSuggestedPosts',
  async ({ limit = 10 } = {}, { rejectWithValue }) => {
    try {
      console.log(`🔄 Sending FETCH SUGGESTED POSTS request with limit: ${limit}`);
      const response = await axiosInstance.get('/post/suggested-post/suggested', {
        params: { limit },
      });
      console.log(`✅ FETCH SUGGESTED POSTS response:`, response.data);
      return response.data.posts;
    } catch (error) {
      console.error(`❌ FETCH SUGGESTED POSTS failed:`, error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch suggested posts');
    }
  }
);

const suggestedPostsSlice = createSlice({
  name: 'suggestedPosts',
  initialState: {
    posts: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearSuggestedPosts: (state) => {
      state.posts = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuggestedPosts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSuggestedPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.posts = action.payload;
      })
      .addCase(fetchSuggestedPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearSuggestedPosts } = suggestedPostsSlice.actions;
export default suggestedPostsSlice.reducer;