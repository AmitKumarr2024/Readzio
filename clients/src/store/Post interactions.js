
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";
import { setLikeInfo, setBookmarkInfo, setViewCount } from "./Post/postMetaSlice";

export const togglePostLike = createAsyncThunk(
  "postInteraction/togglePostLike",
  async (postId, { dispatch, rejectWithValue }) => {
    console.log(`[togglePostLike] PostId: ${postId}`); // Debug
    try {
      console.log(`🔄 Sending LIKE toggle request for post: ${postId}`);
      const response = await axiosInstance.post(`/post/like/${postId}`);
      const data = { postId, ...response.data };
      dispatch(setLikeInfo({ liked: data.liked, likesCount: data.likesCount }));
      console.log(`✅ LIKE response:`, data);
      return data;
    } catch (error) {
      console.error(`❌ LIKE failed:`, error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Like failed");
    }
  }
);

export const togglePostBookmark = createAsyncThunk(
  "postInteraction/togglePostBookmark",
  async (postId, { rejectWithValue }) => {
    console.log(`[togglePostBookmark] PostId: ${postId}`); // Debug
    try {
      console.log(`🔄 Sending BOOKMARK toggle request for post: ${postId}`);
      const response = await axiosInstance.post(`/post/bookmark/${postId}`);
      console.log(`✅ BOOKMARK response:`, response.data);
      dispatch(setBookmarkInfo({
        bookmarked: response.data.bookmarked,
        bookmarksCount: response.data.bookmarksCount,
      }));
      return { postId, ...response.data };
    } catch (error) {
      console.error(`❌ BOOKMARK failed:`, error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Bookmark failed");
    }
  }
);

export const incrementPostView = createAsyncThunk(
  "postInteraction/incrementPostView",
  async (slug, { dispatch, rejectWithValue }) => {
    console.log(`[incrementPostView] Slug: ${slug}`); // Debug
    try {
      console.log(`📈 Incrementing view for post: ${slug}`);
      const response = await axiosInstance.post(`/post/view/${slug}`);
      console.log(`✅ VIEW response:`, response.data);
      dispatch(setViewCount(response.data.views));
      return { slug, ...response.data };
    } catch (error) {
      console.error(`❌ VIEW increment failed:`, error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "View count failed");
    }
  }
);

export const fetchBookmarkedPosts = createAsyncThunk(
  "postInteraction/fetchBookmarkedPosts",
  async (_, { rejectWithValue }) => {
    console.log(`[fetchBookmarkedPosts] Fetching...`); // Debug
    try {
      console.log(`📥 Fetching bookmarked posts...`);
      const response = await axiosInstance.get("/post/get-post/bookmarks");
      console.log(`✅ Bookmarked posts fetched:`, response.data);
      return response.data.posts;
    } catch (error) {
      console.error(`❌ Failed to fetch bookmarked posts:`, error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch bookmarked posts");
    }
  }
);

export const trackTimeSpent = createAsyncThunk(
  "postInteraction/trackTimeSpent",
  async ({ postId, duration }, { rejectWithValue }) => {
    console.log(`[trackTimeSpent] PostId: ${postId}, Duration: ${duration}`); // Debug
    try {
      console.log(`⏱️ Tracking time spent for post: ${postId}, duration: ${duration}s`);
      const response = await axiosInstance.post(`/post/time-spent/${postId}`, { duration });
      console.log(`✅ TIME SPENT response:`, response.data);
      return { postId, duration, ...response.data };
    } catch (error) {
      console.error(`❌ TIME SPENT failed:`, error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Time tracking failed");
    }
  }
);

export const fetchBookmarkAndLikeStatus = createAsyncThunk(
  "postInteraction/fetchBookmarkAndLikeStatus",
  async (postId, { rejectWithValue }) => {
    console.log(`[fetchBookmarkAndLikeStatus] PostId: ${postId}`); // Debug
    try {
      console.log(`📥 Fetching bookmark and like status for post: ${postId}`);
      const response = await axiosInstance.get(`/post/bookmark-status/${postId}`);
      console.log(`✅ Status fetched:`, response.data);
      return { postId, ...response.data };
    } catch (error) {
      console.error(`❌ Failed to fetch status:`, error.response?.data?.error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch status");
    }
  }
);

// Rest of the slice remains unchanged
const postInteractionSlice = createSlice({
  name: "postInteraction",
  initialState: {
    likes: {},
    bookmarks: {},
    views: {},
    bookmarkedPosts: [],
    timeSpent: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(togglePostLike.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(togglePostLike.fulfilled, (state, action) => {
        const { postId, likesCount, liked } = action.payload;
        state.likes[postId] = { likesCount, liked };
        state.loading = false;
      })
      .addCase(togglePostLike.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(togglePostBookmark.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(togglePostBookmark.fulfilled, (state, action) => {
        const { postId, bookmarksCount, bookmarked } = action.payload;
        state.bookmarks[postId] = { bookmarksCount, bookmarked };
        if (bookmarked) {
          if (!state.bookmarkedPosts.some((p) => p._id === postId)) {
            state.bookmarkedPosts.push({ _id: postId });
          }
        } else {
          state.bookmarkedPosts = state.bookmarkedPosts.filter((p) => p._id !== postId);
        }
        state.loading = false;
      })
      .addCase(togglePostBookmark.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(incrementPostView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(incrementPostView.fulfilled, (state, action) => {
        const { slug, views } = action.payload;
        state.views[slug] = { views };
        state.loading = false;
      })
      .addCase(incrementPostView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBookmarkedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkedPosts.fulfilled, (state, action) => {
        state.bookmarkedPosts = action.payload;
        state.loading = false;
      })
      .addCase(fetchBookmarkedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(trackTimeSpent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(trackTimeSpent.fulfilled, (state, action) => {
        const { postId, duration } = action.payload;
        state.timeSpent[postId] = { duration, updatedAt: Date.now() };
        state.loading = false;
      })
      .addCase(trackTimeSpent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBookmarkAndLikeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkAndLikeStatus.fulfilled, (state, action) => {
        const { postId, liked, likesCount, bookmarked, bookmarksCount } = action.payload;
        state.likes[postId] = { liked, likesCount };
        state.bookmarks[postId] = { bookmarked, bookmarksCount };
        state.loading = false;
      })
      .addCase(fetchBookmarkAndLikeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = postInteractionSlice.actions;
export default postInteractionSlice.reducer;
