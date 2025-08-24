import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Enhanced async thunk with better error handling and logging
export const fetchSuggestedPosts = createAsyncThunk(
  "suggestedPosts/fetchSuggestedPosts",
  async (
    { limit = 4, category = "", exclude = "" } = {},
    { rejectWithValue }
  ) => {
    try {
      console.log("[fetchSuggestedPosts] Starting request with params:", {
        limit,
        category,
        exclude,
      });
      console.log(
        "[fetchSuggestedPosts] Axios instance baseURL:",
        axiosInstance.defaults.baseURL
      );

      const response = await axiosInstance.get(
        "/post/suggested-post/suggested",
        {
          params: { limit, category, exclude },
          timeout: 30000, // 30 seconds
        }
      );

      console.log("[fetchSuggestedPosts] Response status:", response.status);
      console.log("[fetchSuggestedPosts] Response data:", response.data);

      // Check if response.data.posts exists
      if (!response.data.posts) {
        console.warn(
          "[fetchSuggestedPosts] No posts array in response:",
          response.data
        );
        return []; // Return empty array instead of undefined
      }

      return response.data.posts;
    } catch (error) {
      console.error("[fetchSuggestedPosts] Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        },
      });

      // More specific error messages
      if (error.code === "NETWORK_ERROR" || error.message === "Network Error") {
        return rejectWithValue(
          "Network connection failed. Please check your internet connection."
        );
      }

      if (error.response?.status === 404) {
        return rejectWithValue(
          "Suggested posts endpoint not found. Please check the API configuration."
        );
      }

      if (error.response?.status === 500) {
        return rejectWithValue(
          "Server error occurred. Please try again later."
        );
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch suggested posts"
      );
    }
  }
);

const suggestedPostsSlice = createSlice({
  name: "suggestedPosts",
  initialState: {
    posts: [],
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    lastFetch: null, // Track when last fetch occurred
  },
  reducers: {
    clearSuggestedPosts: (state) => {
      state.posts = [];
      state.status = "idle";
      state.error = null;
      state.lastFetch = null;
    },
    resetStatus: (state) => {
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuggestedPosts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSuggestedPosts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.posts = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchSuggestedPosts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error("[suggestedPostsSlice] Fetch failed:", action.payload);
      });
  },
});

export const { clearSuggestedPosts, resetStatus } = suggestedPostsSlice.actions;
export default suggestedPostsSlice.reducer;
