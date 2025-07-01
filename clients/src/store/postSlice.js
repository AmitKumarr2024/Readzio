import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Utility to detect blob URLs
const containsBlobUrl = (data) => {
  if (!data) return false;
  if (typeof data === "string") return data.includes("blob:");
  if (Array.isArray(data)) return data.some(containsBlobUrl);
  if (typeof data === "object" && data !== null)
    return Object.values(data).some(containsBlobUrl);
  return false;
};

// Create Post
export const createPosts = createAsyncThunk(
  "post/createPost",
  async (postData, { rejectWithValue }) => {
    console.log(
      "[DEBUG] createPost called with:",
      JSON.stringify(postData, null, 2)
    );
    if (
      !postData.blocks ||
      !Array.isArray(postData.blocks) ||
      postData.blocks.length === 0
    ) {
      return rejectWithValue({ message: "Blocks are required" });
    }
    if (
      containsBlobUrl(postData.thumbnail) ||
      containsBlobUrl(postData.blocks)
    ) {
      return rejectWithValue({
        message:
          "Upload failed: Please convert Blob URLs to base64 or upload images properly before submitting.",
      });
    }
    try {
      const response = await axiosInstance.post("/post/post-create", postData);
      console.log("createPost response:", response.data);
      return response.data.data || response.data; // Adjust for potential data wrapper
    } catch (error) {
      const errMsg = error.response?.data || { message: error.message };
      console.error("createPost error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get all posts
export const getAllPosts = createAsyncThunk(
  "post/getAllPosts",
  async ({ userId } = {}, { rejectWithValue }) => {
    try {
      const query = userId ? `?authorId=${encodeURIComponent(userId)}` : "";
      const response = await axiosInstance.get(`/post/all-post${query}`);
      console.log("✅ getAllPosts response:", response.data);
      return response.data.data || response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error("❌ getAllPosts error:", errMsg);
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
      return response.data.data || response.data; // Adjust for potential data wrapper
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
      return response.data.data || response.data; // Adjust for potential data wrapper
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
  async ({ query, userId }, { rejectWithValue }) => {
    try {
      const queryParams = [
        `query=${encodeURIComponent(query)}`,
        userId ? `authorId=${encodeURIComponent(userId)}` : "",
      ]
        .filter(Boolean)
        .join("&");
      const response = await axiosInstance.get(
        `/post/search-post/search?${queryParams}`
      );
      console.log("getSearchPosts response:", response.data);
      return response.data.data || response.data; // Adjust for potential data wrapper
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error("getSearchPosts error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Get single post by slug
export const getSinglePost = createAsyncThunk(
  "post/getSinglePost",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/post/${slug}`);
      return response.data.post;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch post"
      );
    }
  }
);

// Update Post
export const updatePost = createAsyncThunk(
  "post/updatePost",
  async ({ slug, updateData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/post/update/${slug}`,
        updateData
      );
      const post = response.data?.data || response.data;
      console.log("[DEBUG] returned post:", post); // Add this
      return post; // ✅ must include slug and isPinned
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Delete Post
export const deletePost = createAsyncThunk(
  "post/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/post/delete/${postId}`);
      return { postId, message: response.data.message };
    } catch (error) {
      const errMsg = error.response?.data || { message: error.message };
      console.error("deletePost error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Fetch user posts
export const fetchUserPosts = createAsyncThunk(
  "post/fetchUserPosts",
  async ({ userId, page, limit, search, sort }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/post/user/${userId}/posts`, {
        params: { page, limit, search, sort },
      });
      console.log("fetchUserPosts response:", response.data);
      return response.data.data || response.data; // Adjust for potential data wrapper
    } catch (error) {
      console.error(
        "Error fetching user posts:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const startReading = createAsyncThunk(
  "post/startReading",
  async (postId, { rejectWithValue }) => {
    try {
      return { postId, startTime: Date.now() };
    } catch (error) {
      return rejectWithValue("Failed to start reading");
    }
  }
);

export const stopReading = createAsyncThunk(
  "post/stopReading",
  async (_, { rejectWithValue }) => {
    try {
      return null;
    } catch (error) {
      return rejectWithValue("Failed to stop reading");
    }
  }
);
// Submit reading time
export const submitReadingTime = createAsyncThunk(
  "post/submitReadingTime",
  async ({ postId, timeSpent }, { rejectWithValue }) => {
    try {
      if (!postId || typeof postId !== "string") {
        console.error("❌ submitReadingTime called without valid postId");
        return rejectWithValue("Invalid postId");
      }

      console.log(
        `⏱️ Submitting reading time for post: ${postId}, duration: ${timeSpent}s`
      );

      const response = await axiosInstance.post(`/post/time-spent/${postId}`, {
        duration: timeSpent,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit reading time"
      );
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
    updateSuccess: false,
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
    totalPosts: 0,
    searchQuery: "",
    sortOption: "newest",
    currentPage: 1,
    startTime: null,
    postId: null,
    isTracking: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.latestError = null;
      state.trendingError = null;
      state.searchError = null;
      state.updateSuccess = false;
    },
    setSearch: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    setSort: (state, action) => {
      state.sortOption = action.payload;
      state.currentPage = 1;
    },
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },
    resetFetch: (state) => {
      state.searchQuery = "";
      state.sortOption = "newest";
      state.currentPage = 1;
    },

    clearReadingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create
    builder
      .addCase(createPosts.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createPosts.fulfilled, (state, action) => {
        state.createLoading = false;
        state.posts.unshift(action.payload.post);
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
        const { posts, total, page } = action.payload;
        state.loading = false;
        state.posts = posts || [];
        state.total = total || 0;
        state.page = page || 1;
        console.log("✅ Posts stored in Redux:", posts?.length, posts);
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch posts";
      });

    // Read (Latest)
    builder
      .addCase(getLatestPosts.pending, (state) => {
        state.latestLoading = true;
        state.latestError = null;
      })
      .addCase(getLatestPosts.fulfilled, (state, action) => {
        state.latestLoading = false;
        state.latestPosts = action.payload.posts || [];
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
        state.trendingPosts = action.payload.posts || [];
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
        state.searchPosts = action.payload.posts || [];
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
        state.currentPost = action.payload;
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
        state.updateSuccess = false;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.updateMessage = action.payload.message;
        state.updateSuccess = true;
        const updatedPost = action.payload.post; // Backend returns post directly in { post }
        const idx = state.posts.findIndex((p) => p.slug === updatedPost.slug);
        if (idx !== -1) {
          state.posts[idx] = { ...state.posts[idx], ...updatedPost }; // Merge to preserve existing fields
        }
        if (state.currentPost?.slug === updatedPost.slug) {
          state.currentPost = { ...state.currentPost, ...updatedPost };
        }
        const latestIdx = state.latestPosts.findIndex(
          (p) => p.slug === updatedPost.slug
        );
        if (latestIdx !== -1) {
          state.latestPosts[latestIdx] = {
            ...state.latestPosts[latestIdx],
            ...updatedPost,
          };
        }
        const trendingIdx = state.trendingPosts.findIndex(
          (p) => p.slug === updatedPost.slug
        );
        if (trendingIdx !== -1) {
          state.trendingPosts[trendingIdx] = {
            ...state.trendingPosts[trendingIdx],
            ...updatedPost,
          };
        }
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload?.message || "Failed to update post";
        state.updateSuccess = false;
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
        state.posts = state.posts.filter(
          (p) => p._id !== action.payload.postId
        );
        state.latestPosts = state.latestPosts.filter(
          (p) => p._id !== action.payload.postId
        );
        state.trendingPosts = state.trendingPosts.filter(
          (p) => p._id !== action.payload.postId
        );
        state.searchPosts = state.searchPosts.filter(
          (p) => p._id !== action.payload.postId
        );
        if (state.currentPost?._id === action.payload.postId) {
          state.currentPost = null;
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload?.message || "Failed to delete post";
      });

    // Fetch User Posts
    builder
      .addCase(fetchUserPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts || [];
        state.totalPosts =
          action.payload.total ||
          action.payload.totalPosts ||
          action.payload.posts?.length ||
          0; // Fallback to posts.length
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch user posts";
      });

    // Submit Reading Time
    builder

      .addCase(startReading.fulfilled, (state, action) => {
        state.startTime = action.payload.startTime;
        state.postId = action.payload.postId; // 👈 add this
        state.isTracking = true;
      })
      .addCase(stopReading.fulfilled, (state) => {
        state.isTracking = false;
      })
      .addCase(submitReadingTime.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReadingTime.fulfilled, (state) => {
        state.loading = false;
        state.startTime = null;
        state.postId = null;
        state.isTracking = false;
        state.error = null;
      })
      .addCase(submitReadingTime.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to submit reading time";
      });
  },
});

export const {
  clearError,
  setSearch,
  setSort,
  setPage,
  resetFetch,
  clearReadingError,
} = postSlice.actions;
export default postSlice.reducer;
