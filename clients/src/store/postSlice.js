import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Error Helper
const extractError = (err, fallback = "Request failed") =>
  err?.response?.data?.message || err.message || fallback;

// Post Merge Helper
const mergePosts = (existing, newPosts) =>
  [...existing, ...newPosts].filter(
    (post, index, self) => index === self.findIndex((p) => p._id === post._id)
  );

// State Handlers
const handlePending = (state, key) => {
  state[key].loading = true;
  state[key].error = null;
};
const handleFulfilled = (state, key, action, postKey) => {
  state[key].loading = false;
  state[postKey] = mergePosts(state[postKey], action.payload.posts);
  state.lastFetched = action.payload.lastFetched;
};
const handleRejected = (state, key, action) => {
  state[key].loading = false;
  state[key].error = action.payload.message;
};
const setLoading = (state) => {
  state.loading = true;
  state.error = null;
};

// Blob URL Check
const containsBlobUrl = (data) => {
  if (!data) return false;
  if (typeof data === "string") return data.includes("blob:");
  if (Array.isArray(data)) return data.some(containsBlobUrl);
  if (typeof data === "object")
    return Object.values(data).some(containsBlobUrl);
  return false;
};

// Thunks
export const fetchFollowingPosts = createAsyncThunk(
  "post/fetchFollowingPosts",
  async ({ page = 1, limit = 50 } = {}, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated)
        throw new Error("You must be signed in to access this feature.");
      const params = new URLSearchParams({ page, limit });
      const res = await axiosInstance.get(`/post/following?${params}`);
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to fetch following posts"),
      });
    }
  }
);

export const fetchPublicPosts = createAsyncThunk(
  "post/fetchPublicPosts",
  async ({ tag = null, after = null }, { rejectWithValue }) => {
    try {
      const params = {
        limit: 12,
        ...(tag && { tag }),
        ...(after && { after }),
      };
      const res = await axiosInstance.get("/post/public/posts", { params });
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to fetch public posts"),
      });
    }
  }
);

export const createPosts = createAsyncThunk(
  "post/createPost",
  async (postData, { rejectWithValue, getState }) => {
    try {
      if (
        !postData.blocks ||
        !Array.isArray(postData.blocks) ||
        postData.blocks.length === 0
      )
        throw new Error("Blocks are required");
      if (
        containsBlobUrl(postData.thumbnail) ||
        containsBlobUrl(postData.blocks)
      )
        throw new Error(
          "Upload failed: Please convert Blob URLs to base64 or upload images properly."
        );
      const { auth } = getState();
      const res = await axiosInstance.post("/post/post-create", postData);
      return { ...res.data, authorId: auth.user?._id };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to create post"),
      });
    }
  }
);

export const getAllPosts = createAsyncThunk(
  "post/getAllPosts",
  async (
    { userId, authorIds = [], page = 1, limit = 12, after = null } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated)
        throw new Error("You must be signed in to access this feature.");
      const params = new URLSearchParams({ page, limit });
      if (after) params.append("after", after);
      if (userId) params.append("authorId", userId);
      if (authorIds.length)
        params.append("authorIds", authorIds.filter(Boolean).join(","));
      const res = await axiosInstance.get(`/post/all-post?${params}`);
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
        isMyPosts: !!userId,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to fetch posts"),
      });
    }
  }
);

export const getLatestPosts = createAsyncThunk(
  "post/getLatestPosts",
  async ({ after = null } = {}, { rejectWithValue }) => {
    try {
      const params = { limit: 12, ...(after && { after }) };
      const res = await axiosInstance.get("/post/latest-post/latest", {
        params,
      });
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to load latest posts"),
      });
    }
  }
);

export const getTrendingPosts = createAsyncThunk(
  "post/getTrendingPosts",
  async ({ after = null } = {}, { rejectWithValue }) => {
    try {
      const params = { limit: 12, ...(after && { after }) };
      const res = await axiosInstance.get("/post/trending-post/trending", {
        params,
      });
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to load trending posts"),
      });
    }
  }
);

export const getSearchPosts = createAsyncThunk(
  "post/getSearchPosts",
  async ({ query, userId, after = null }, { rejectWithValue }) => {
    try {
      const queryParams = [
        `query=${encodeURIComponent(query)}`,
        userId ? `authorId=${encodeURIComponent(userId)}` : "",
        `limit=12`,
        after ? `after=${after}` : "",
      ]
        .filter(Boolean)
        .join("&");
      const res = await axiosInstance.get(
        `/post/search-post/search?${queryParams}`
      );
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to load search results"),
      });
    }
  }
);

export const getSinglePost = createAsyncThunk(
  "post/getSinglePost",
  async ({ slug, isGuest = false }, { rejectWithValue }) => {
    try {
      if (!slug || typeof slug !== "string")
        throw new Error("Invalid post slug");
      const endpoint = isGuest ? `/post/public/${slug}` : `/post/${slug}`;
      const res = await axiosInstance.get(endpoint);
      if (!res.data.post) throw new Error("Post not found");
      return res.data.post;
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to fetch post"),
      });
    }
  }
);

export const updatePost = createAsyncThunk(
  "post/updatePost",
  async ({ slug, updateData }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch(`/post/update/${slug}`, updateData);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to update post"),
      });
    }
  }
);

export const deletePost = createAsyncThunk(
  "post/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete(`/post/delete/${postId}`);
      return { postId, message: res.data.message };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to delete post"),
      });
    }
  }
);

export const fetchUserPosts = createAsyncThunk(
  "post/fetchUserPosts",
  async ({ userId, after = null, search, sort }, { rejectWithValue }) => {
    try {
      const params = { limit: 12, ...(after && { after }), search, sort };
      const res = await axiosInstance.get(`/post/user/${userId}/posts`, {
        params,
      });
      return {
        posts: res.data.posts,
        total: res.data.total,
        lastFetched: res.data.posts.length
          ? res.data.posts[res.data.posts.length - 1].createdAt
          : null,
      };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to fetch user posts"),
      });
    }
  }
);

export const startReading = createAsyncThunk(
  "post/startReading",
  async (postId, { rejectWithValue }) => {
    try {
      return { postId, startTime: Date.now() };
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to start reading"),
      });
    }
  }
);

export const stopReading = createAsyncThunk(
  "post/stopReading",
  async (_, { rejectWithValue }) => {
    try {
      return null;
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to stop reading"),
      });
    }
  }
);

export const submitReadingTime = createAsyncThunk(
  "post/submitReadingTime",
  async ({ postId, timeSpent }, { rejectWithValue }) => {
    try {
      if (!postId || typeof postId !== "string")
        throw new Error("Invalid postId");
      const res = await axiosInstance.post(`/post/time-spent/${postId}`, {
        duration: timeSpent,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to submit reading time"),
      });
    }
  }
);

export const sendAdminAppeal = createAsyncThunk(
  "post/sendAdminAppeal",
  async ({ postId, message }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/post/appeal/${postId}`, {
        message,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: extractError(err, "Failed to send appeal"),
      });
    }
  }
);

// Initial State
const initialState = {
  posts: [],
  publicPosts: [],
  followingPosts: [],
  latestPosts: [],
  trendingPosts: [],
  searchPosts: [],
  lastFetched: null,
  currentPost: null,
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
  updateMessage: null,
  updateSuccess: false,
  deleteLoading: false,
  deleteError: null,
  deleteMessage: null,
  latestLoading: false,
  latestError: null,
  trendingLoading: false,
  trendingError: null,
  searchLoading: false,
  searchError: null,
  searchQuery: "",
  sortOption: "newest",
  reading: { postId: null, startTime: null, isTracking: false },
  appealLoading: false,
  appealError: null,
};

// Slice
const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {
    clearAllPosts: (state) => {
      state.posts = [];
      state.publicPosts = [];
      state.followingPosts = [];
      state.latestPosts = [];
      state.trendingPosts = [];
      state.searchPosts = [];
      state.lastFetched = null;
    },
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
    },
    setSort: (state, action) => {
      state.sortOption = action.payload;
    },
    resetFetch: (state) => {
      state.searchQuery = "";
      state.sortOption = "newest";
    },
    clearReadingError: (state) => {
      state.error = null;
    },
    updateCurrentPostBlockedStatus: (state, action) => {
      const { postId, blocked } = action.payload;
      if (state.currentPost && state.currentPost._id === postId) {
        state.currentPost.blocked = blocked;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowingPosts.pending, setLoading)
      .addCase(fetchFollowingPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "loading", action, "followingPosts")
      )
      .addCase(fetchFollowingPosts.rejected, (state, action) =>
        handleRejected(state, "loading", action)
      )
      .addCase(getAllPosts.pending, setLoading)
      .addCase(getAllPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "loading", action, "posts")
      )
      .addCase(getAllPosts.rejected, (state, action) =>
        handleRejected(state, "loading", action)
      )
      .addCase(fetchPublicPosts.pending, setLoading)
      .addCase(fetchPublicPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "loading", action, "publicPosts")
      )
      .addCase(fetchPublicPosts.rejected, (state, action) =>
        handleRejected(state, "loading", action)
      )
      .addCase(createPosts.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createPosts.fulfilled, (state, action) => {
        state.createLoading = false;
        state.posts.unshift(action.payload.post);
        state.followingPosts.unshift(action.payload.post);
      })
      .addCase(createPosts.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload.message;
      })
      .addCase(getLatestPosts.pending, (state) =>
        handlePending(state, "latest")
      )
      .addCase(getLatestPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "latest", action, "latestPosts")
      )
      .addCase(getLatestPosts.rejected, (state, action) =>
        handleRejected(state, "latest", action)
      )
      .addCase(getTrendingPosts.pending, (state) =>
        handlePending(state, "trending")
      )
      .addCase(getTrendingPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "trending", action, "trendingPosts")
      )
      .addCase(getTrendingPosts.rejected, (state, action) =>
        handleRejected(state, "trending", action)
      )
      .addCase(getSearchPosts.pending, (state) =>
        handlePending(state, "search")
      )
      .addCase(getSearchPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "search", action, "searchPosts")
      )
      .addCase(getSearchPosts.rejected, (state, action) =>
        handleRejected(state, "search", action)
      )
      .addCase(getSinglePost.pending, setLoading)
      .addCase(getSinglePost.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload;
      })
      .addCase(getSinglePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
        state.currentPost = null;
      })
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
        const updatedPost = action.payload.post || action.payload;
        ["posts", "latestPosts", "trendingPosts", "followingPosts"].forEach(
          (key) => {
            const idx = state[key].findIndex(
              (p) => p.slug === updatedPost.slug
            );
            if (idx !== -1)
              state[key][idx] = { ...state[key][idx], ...updatedPost };
          }
        );
        if (state.currentPost?.slug === updatedPost.slug) {
          state.currentPost = { ...state.currentPost, ...updatedPost };
        }
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload.message;
        state.updateSuccess = false;
      })
      .addCase(deletePost.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
        state.deleteMessage = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.deleteMessage = action.payload.message;
        [
          "posts",
          "publicPosts",
          "followingPosts",
          "latestPosts",
          "trendingPosts",
          "searchPosts",
        ].forEach(
          (key) =>
            (state[key] = state[key].filter(
              (p) => p._id !== action.payload.postId
            ))
        );
        if (state.currentPost?._id === action.payload.postId)
          state.currentPost = null;
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload.message;
      })
      .addCase(fetchUserPosts.pending, setLoading)
      .addCase(fetchUserPosts.fulfilled, (state, action) =>
        handleFulfilled(state, "loading", action, "posts")
      )
      .addCase(fetchUserPosts.rejected, (state, action) =>
        handleRejected(state, "loading", action)
      )
      .addCase(startReading.fulfilled, (state, action) => {
        state.reading.isTracking = true;
        state.reading.postId = action.payload.postId;
        state.reading.startTime = action.payload.startTime;
      })
      .addCase(startReading.rejected, (state, action) => {
        state.reading.isTracking = false;
        state.error = action.payload.message;
      })
      .addCase(stopReading.fulfilled, (state) => {
        state.reading.isTracking = false;
        state.reading.postId = null;
        state.reading.startTime = null;
      })
      .addCase(stopReading.rejected, (state, action) => {
        state.error = action.payload.message;
      })
      .addCase(submitReadingTime.pending, setLoading)
      .addCase(submitReadingTime.fulfilled, (state) => {
        state.loading = false;
        state.reading.isTracking = false;
        state.reading.postId = null;
        state.reading.startTime = null;
      })
      .addCase(submitReadingTime.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(sendAdminAppeal.pending, (state) => {
        state.appealLoading = true;
        state.appealError = null;
      })
      .addCase(sendAdminAppeal.fulfilled, (state) => {
        state.appealLoading = false;
      })
      .addCase(sendAdminAppeal.rejected, (state, action) => {
        state.appealLoading = false;
        state.appealError = action.payload.message;
      });
  },
});

export const {
  clearAllPosts,
  clearError,
  setSearch,
  setSort,
  resetFetch,
  clearReadingError,
  updateCurrentPostBlockedStatus,
} = postSlice.actions;

export default postSlice.reducer;
