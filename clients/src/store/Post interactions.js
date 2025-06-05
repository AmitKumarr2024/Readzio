import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../connection/axiosInstance';
import { setLikeInfo } from './Post/postMetaSlice';

// ─── LIKE ────────────────────────────────────────────────────────────────────────
export const togglePostLike = createAsyncThunk(
  'postInteraction/togglePostLike',
  async (postId, thunkAPI) => {
    try {
      const response = await axiosInstance.post(`/post/toggle-like/${postId}`);
      const data = { postId, ...response.data };

      // Dispatch update to postMetaSlice
      thunkAPI.dispatch(setLikeInfo({
        liked: data.liked,
        likesCount: data.likesCount,
      }));

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || 'Like failed');
    }
  }
);

// ─── BOOKMARK ─────────────────────────────────────────────────────────────────────
export const togglePostBookmark = createAsyncThunk(
  'postInteraction/togglePostBookmark',
  async (postId, thunkAPI) => {
    try {
      console.log(`Toggling bookmark for post: ${postId}`);
      const response = await axiosInstance.post(`/post/post-bookmark/${postId}`);
      console.log('Bookmark response:', response.data);
      return { postId, ...response.data };
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return thunkAPI.rejectWithValue(error.response?.data || 'Bookmark failed');
    }
  }
);

// ─── VIEW COUNT ──────────────────────────────────────────────────────────────────
export const incrementPostView = createAsyncThunk(
  'postInteraction/incrementPostView',
  async (postId, thunkAPI) => {
    try {
      console.log(`Incrementing view for post: ${postId}`);
      const response = await axiosInstance.post(`/post/view/${postId}`);
      console.log('View response:', response.data);
      return { postId, ...response.data };
    } catch (error) {
      console.error('Error incrementing view:', error);
      return thunkAPI.rejectWithValue(error.response?.data || 'View count failed');
    }
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────────
const postInteractionSlice = createSlice({
  name: 'postInteraction',
  initialState: {
    likes: {},
    bookmarks: {},
    views: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // LIKE
    builder
      .addCase(togglePostLike.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(togglePostLike.fulfilled, (state, action) => {
        const { postId, likesCount, liked } = action.payload;
        state.likes[postId] = { likesCount, liked };
        state.loading = false;
        console.log(`Liked: ${liked}, Count: ${likesCount}`);
      })
      .addCase(togglePostLike.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // BOOKMARK
    builder
      .addCase(togglePostBookmark.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(togglePostBookmark.fulfilled, (state, action) => {
        const { postId, bookmarksCount, bookmarked } = action.payload;
        state.bookmarks[postId] = { bookmarksCount, bookmarked };
        state.loading = false;
        console.log(`Bookmarked: ${bookmarked}, Count: ${bookmarksCount}`);
      })
      .addCase(togglePostBookmark.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // VIEW COUNT
    builder
      .addCase(incrementPostView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(incrementPostView.fulfilled, (state, action) => {
        const { postId, views } = action.payload;
        state.views[postId] = { views };  // <-- Fixed here
        state.loading = false;
        console.log(`Views for post ${postId}: ${views}`);
      })
      .addCase(incrementPostView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('View increment failed:', action.payload);
      });
  },
});

export default postInteractionSlice.reducer;
