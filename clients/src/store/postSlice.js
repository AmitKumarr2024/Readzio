import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Utility to detect blob URLs
const containsBlobUrl = (data) => {
  if (!data) return false;
  if (typeof data === "string") return data.includes("blob:");
  if (Array.isArray(data)) return data.some(containsBlobUrl);
  if (typeof data === "object") return Object.values(data).some(containsBlobUrl);
  return false;
};

// Create Post
export const createPosts = createAsyncThunk(
  "post/createPost",
  async (postData, { rejectWithValue }) => {
    console.log("createPost called with:", postData);

    if (containsBlobUrl(postData.thumbnail) || containsBlobUrl(postData.blocks)) {
      return rejectWithValue({
        message:
          "Upload failed: Please convert Blob URLs to base64 or upload images properly before submitting.",
      });
    }

    try {
      const response = await axiosInstance.post("/post/post-create", postData);
      console.log("createPost response:", response.data);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data || { message: error.message };
      console.error("createPost error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get all posts
export const getAllPosts = createAsyncThunk(
  "post/getPosts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/post/all-post");
      console.log("getAllPosts response:", response.data);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error("getAllPosts error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get latest posts
export const getLatestPosts = createAsyncThunk(
  "post/getLatestPosts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/post/latest-post/latest");
      console.log("getLatestPosts response:", response.data);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error("getLatestPosts error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get trending posts
export const getTrendingPosts = createAsyncThunk(
  "post/getTrendingPosts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/post/trending-post/trending");
      console.log("getTrendingPosts response:", response.data);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error("getTrendingPosts error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get search posts
export const getSearchPosts = createAsyncThunk(
  "post/getSearchPosts",
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/post/search-post/search?query=${encodeURIComponent(query)}`);
      console.log("getSearchPosts response:", response.data);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error("getSearchPosts error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get single post by ID
export const getSinglePost = createAsyncThunk(
  "post/getSinglePost",
  async (id, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const existing = state.post.posts.find((p) => p._id === id);
      if (existing) return { post: existing };

      const response = await axiosInstance.get(`/post/${id}`);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data || { message: error.message };
      console.error("getSinglePost error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Update Post
export const updatePost = createAsyncThunk(
  "post/updatePost",
  async ({ postId, updateData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/post/post-update/${postId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data || { message: error.message };
      console.error("updatePost error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Delete Post
export const deletePost = createAsyncThunk(
  "post/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/post/post-delete/${postId}`);
      return { postId, message: response.data.message };
    } catch (error) {
      const errMsg = error.response?.data || { message: error.message };
      console.error("deletePost error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Slice
const postSlice = createSlice({
  name: "post",
  initialState: {
    loading: false,
    error: null,
    posts: [],
    total: 0,
    page: 1,
    currentPost: null,

    createLoading: false,
    createError: null,

    updateLoading: false,
    updateError: null,
    updateMessage: null,

    deleteLoading: false,
    deleteError: null,
    deleteMessage: null,

    latestPosts: [],
    latestLoading: false,
    latestError: null,

    trendingPosts: [],
    trendingLoading: false,
    trendingError: null,

    searchPosts: [],
    searchLoading: false,
    searchError: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Create
    builder
      .addCase(createPosts.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createPosts.fulfilled, (state, action) => {
        state.createLoading = false;
        state.posts.unshift(action.payload.post); // Assuming API returns { post }
      })
      .addCase(createPosts.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload?.message || "Failed to create post";
      });

    // Read (All)
    builder
      .addCase(getAllPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Read (Latest)
    builder
      .addCase(getLatestPosts.pending, (state) => {
        state.latestLoading = true;
        state.latestError = null;
      })
      .addCase(getLatestPosts.fulfilled, (state, action) => {
        state.latestLoading = false;
        state.latestPosts = action.payload.posts; // Store latest posts
      })
      .addCase(getLatestPosts.rejected, (state, action) => {
        state.latestLoading = false;
        state.latestError = action.payload || "Failed to load latest posts";
      });

    // Read (Trending)
    builder
      .addCase(getTrendingPosts.pending, (state) => {
        state.trendingLoading = true;
        state.trendingError = null;
      })
      .addCase(getTrendingPosts.fulfilled, (state, action) => {
        state.trendingLoading = false;
        state.trendingPosts = action.payload.posts; // Store trending posts
      })
      .addCase(getTrendingPosts.rejected, (state, action) => {
        state.trendingLoading = false;
        state.trendingError = action.payload || "Failed to load trending posts";
      });

    // Read (Search)
    builder
      .addCase(getSearchPosts.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(getSearchPosts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchPosts = action.payload.posts; // Store search posts
      })
      .addCase(getSearchPosts.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload || "Failed to load search results";
      });

    // Read (Single)
    builder
      .addCase(getSinglePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSinglePost.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload.post;
      })
      .addCase(getSinglePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update
    builder
      .addCase(updatePost.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
        state.updateMessage = null;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.updateMessage = action.payload.message;

        const idx = state.posts.findIndex((p) => p._id === action.payload.post._id);
        if (idx !== -1) state.posts[idx] = action.payload.post;
        if (state.currentPost?._id === action.payload.post._id) {
          state.currentPost = action.payload.post;
        }

        // Update latestPosts
        const latestIdx = state.latestPosts.findIndex((p) => p.post._id === action.payload.post._id);
        if (latestIdx !== -1) state.latestPosts[latestIdx] = action.payload.post;

        // Update trendingPosts
        const trendingIdx = state.trendingPosts.findIndex((p) => p._id === action.payload.post._id);
        if (trendingIdx !== -1) state.trendingPosts[trendingIdx] = action.payload.post;

        // Update searchPosts
        const searchIdx = state.searchPosts.findIndex((p) => p._id === action.payload.post._id);
        if (searchIdx !== -1) state.searchPosts[searchIdx] = action.payload.post;
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload?.message || "Failed to update post";
      });

    // Delete
    builder
      .addCase(deletePost.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
        state.deleteMessage = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.deleteMessage = action.payload.message;
        state.posts = state.posts.filter((p) => p._id !== action.payload.postId);
        state.latestPosts = state.latestPosts.filter((p) => p._id !== action.payload.postId);
        state.trendingPosts = state.trendingPosts.filter((p) => p._id !== action.payload.postId);
        state.searchPosts = state.searchPosts.filter((p) => p._id !== action.payload.postId); // Remove from searchPosts
        if (state.currentPost?._id === action.payload.postId) {
          state.currentPost = null;
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload?.message || "Failed to delete post";
      });
  },
});

export default postSlice.reducer;
