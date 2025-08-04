import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
} from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const postsAdapter = createEntityAdapter({
  selectId: (post) => post._id,
});

const initialState = postsAdapter.getInitialState({
  loading: false,
  error: null,
  publicPosts: [],
  followingPosts: [],
  lastFetched: null,
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
  searchQuery: "",
  sortOption: "newest",
  reading: {
    isTracking: false,
    startTime: null,
    postId: null,
    loading: false,
    error: null,
  },
  appealLoading: false,
  appealError: null,
});

const containsBlobUrl = (data) => {
  if (!data) return false;
  if (typeof data === "string") return data.includes("blob:");
  if (Array.isArray(data)) return data.some(containsBlobUrl);
  if (typeof data === "object" && data !== null)
    return Object.values(data).some(containsBlobUrl);
  return false;
};

export const fetchFollowingPosts = createAsyncThunk(
  "post/fetchFollowingPosts",
  async ({ page = 1, limit = 50 } = {}, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated) {
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }
      const params = new URLSearchParams({ page, limit });
      const response = await axiosInstance.get(`/post/following?${params}`);
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
      };
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to fetch following posts",
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
      const response = await axiosInstance.get("/post/public/posts", {
        params,
      });
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        reset: !after,
      };
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to fetch public posts",
      });
    }
  }
);

export const createPosts = createAsyncThunk(
  "post/createPost",
  async (postData, { rejectWithValue, getState }) => {
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
          "Please upload images before submitting the post. Unsaved media cannot be published.",
      });
    }
    try {
      const { auth } = getState();
      const response = await axiosInstance.post("/post/post-create", postData);
      return { post: { ...response.data, authorId: auth.user?._id } };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to create post",
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
      if (!auth.isAuthenticated) {
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }
      const params = new URLSearchParams({ page, limit });
      if (after) params.append("after", after);
      if (userId) params.append("authorId", userId);
      if (authorIds.length)
        params.append("authorIds", authorIds.filter(Boolean).join(","));
      const response = await axiosInstance.get(`/post/all-post?${params}`);
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        isMyPosts: !!userId,
        reset: !after,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to fetch posts",
      });
    }
  }
);

export const getLatestPosts = createAsyncThunk(
  "post/getLatestPosts",
  async ({ after = null } = {}, { rejectWithValue }) => {
    try {
      const params = { limit: 12, ...(after && { after }) };
      const response = await axiosInstance.get("/post/latest-post/latest", {
        params,
      });
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        reset: !after,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load latest posts",
      });
    }
  }
);

export const getTrendingPosts = createAsyncThunk(
  "post/getTrendingPosts",
  async ({ after = null } = {}, { rejectWithValue }) => {
    try {
      const params = { limit: 12, ...(after && { after }) };
      const response = await axiosInstance.get("/post/trending-post/trending", {
        params,
      });
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        reset: !after,
      };
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to load trending posts",
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
      const response = await axiosInstance.get(
        `/post/search-post/search?${queryParams}`
      );
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        reset: !after,
      };
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to load search results",
      });
    }
  }
);

export const getSinglePost = createAsyncThunk(
  "post/getSinglePost",
  async ({ slug, isGuest = false }, { rejectWithValue }) => {
    try {
      if (!slug || typeof slug !== "string") {
        return rejectWithValue({ message: "Invalid post slug" });
      }
      const endpoint = isGuest ? `/post/public/${slug}` : `/post/${slug}`;
      const response = await axiosInstance.get(endpoint);
      if (!response.data.post) {
        return rejectWithValue({ message: "Post not found" });
      }
      return response.data.post;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to fetch post",
      });
    }
  }
);

export const updatePost = createAsyncThunk(
  "post/updatePost",
  async ({ slug, updateData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/post/update/${slug}`,
        updateData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to update post",
      });
    }
  }
);

export const deletePost = createAsyncThunk(
  "post/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/post/delete/${postId}`);
      return { postId, message: response.data.message };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to delete post",
      });
    }
  }
);

export const fetchUserPosts = createAsyncThunk(
  "post/fetchUserPosts",
  async ({ userId, after = null, search, sort }, { rejectWithValue }) => {
    try {
      const params = { limit: 12, ...(after && { after }), search, sort };
      const response = await axiosInstance.get(`/post/user/${userId}/posts`, {
        params,
      });
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        reset: !after,
      };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to fetch user posts",
      });
    }
  }
);

export const startReading = createAsyncThunk(
  "post/startReading",
  async (postId, { rejectWithValue }) => {
    try {
      return { postId, startTime: Date.now() };
    } catch (error) {
      return rejectWithValue({ message: "Failed to start reading" });
    }
  }
);

export const stopReading = createAsyncThunk(
  "post/stopReading",
  async (_, { rejectWithValue }) => {
    try {
      return null;
    } catch (error) {
      return rejectWithValue({ message: "Failed to stop reading" });
    }
  }
);

export const submitReadingTime = createAsyncThunk(
  "post/submitReadingTime",
  async ({ postId, timeSpent }, { rejectWithValue }) => {
    try {
      if (!postId || typeof postId !== "string") {
        return rejectWithValue({ message: "Invalid postId" });
      }
      const response = await axiosInstance.post(`/post/time-spent/${postId}`, {
        duration: timeSpent,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to submit reading time",
      });
    }
  }
);

export const sendAdminAppeal = createAsyncThunk(
  "post/sendAdminAppeal",
  async ({ postId, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/post/appeal/${postId}`, {
        message,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to send appeal",
      });
    }
  }
);

const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {
    clearAllPosts: (state) => {
      postsAdapter.removeAll(state);
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
      state.reading.error = null;
      state.appealError = null;
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
      state.reading.error = null;
    },
    updateCurrentPostBlockedStatus: (state, action) => {
      const { postId, blocked } = action.payload;
      if (state.currentPost?._id === postId) {
        state.currentPost.blocked = blocked;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowingPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowingPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.followingPosts = action.payload.reset
          ? action.payload.posts
          : [...state.followingPosts, ...action.payload.posts].filter(
              (post, index, self) =>
                index === self.findIndex((p) => p._id === post._id)
            );
        state.lastFetched = action.payload.lastFetched;
      })
      .addCase(fetchFollowingPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(getAllPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPosts.fulfilled, (state, action) => {
        state.loading = false;
        postsAdapter.upsertMany(state, action.payload.posts);
        state.lastFetched = action.payload.lastFetched;
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(fetchPublicPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.publicPosts = action.payload.reset
          ? action.payload.posts
          : [...state.publicPosts, ...action.payload.posts].filter(
              (post, index, self) =>
                index === self.findIndex((p) => p._id === post._id)
            );
        state.lastFetched = action.payload.lastFetched;
      })
      .addCase(fetchPublicPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(createPosts.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createPosts.fulfilled, (state, action) => {
        state.createLoading = false;
        const newPost = action.payload.post;
        postsAdapter.addOne(state, newPost);
        state.followingPosts.unshift(newPost);
      })
      .addCase(createPosts.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload.message;
      })
      .addCase(getLatestPosts.pending, (state) => {
        state.latestLoading = true;
        state.latestError = null;
      })
      .addCase(getLatestPosts.fulfilled, (state, action) => {
        state.latestLoading = false;
        state.latestPosts = action.payload.reset
          ? action.payload.posts
          : [...state.latestPosts, ...action.payload.posts].filter(
              (post, index, self) =>
                index === self.findIndex((p) => p._id === post._id)
            );
      })
      .addCase(getLatestPosts.rejected, (state, action) => {
        state.latestLoading = false;
        state.latestError = action.payload.message;
      })
      .addCase(getTrendingPosts.pending, (state) => {
        state.trendingLoading = true;
        state.trendingError = null;
      })
      .addCase(getTrendingPosts.fulfilled, (state, action) => {
        state.trendingLoading = false;
        state.trendingPosts = action.payload.reset
          ? action.payload.posts
          : [...state.trendingPosts, ...action.payload.posts].filter(
              (post, index, self) =>
                index === self.findIndex((p) => p._id === post._id)
            );
      })
      .addCase(getTrendingPosts.rejected, (state, action) => {
        state.trendingLoading = false;
        state.trendingError = action.payload.message;
      })
      .addCase(getSearchPosts.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(getSearchPosts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchPosts = action.payload.reset
          ? action.payload.posts
          : [...state.searchPosts, ...action.payload.posts].filter(
              (post, index, self) =>
                index === self.findIndex((p) => p._id === post._id)
            );
      })
      .addCase(getSearchPosts.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload.message;
      })
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
        postsAdapter.upsertOne(state, updatedPost);
        if (state.currentPost?.slug === updatedPost.slug) {
          state.currentPost = { ...state.currentPost, ...updatedPost };
        }
        ["latestPosts", "trendingPosts", "followingPosts"].forEach((key) => {
          const idx = state[key].findIndex((p) => p.slug === updatedPost.slug);
          if (idx !== -1) {
            state[key][idx] = { ...state[key][idx], ...updatedPost };
          }
        });
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
        postsAdapter.removeOne(state, action.payload.postId);
        [
          "publicPosts",
          "followingPosts",
          "latestPosts",
          "trendingPosts",
          "searchPosts",
        ].forEach((key) => {
          state[key] = (state[key] || []).filter(
            (p) => p._id !== action.payload.postId
          );
        });
        if (state.currentPost?._id === action.payload.postId) {
          state.currentPost = null;
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload.message;
      })
      .addCase(fetchUserPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        postsAdapter.upsertMany(state, action.payload.posts);
        state.lastFetched = action.payload.lastFetched;
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(startReading.fulfilled, (state, action) => {
        state.reading.isTracking = true;
        state.reading.postId = action.payload.postId;
        state.reading.startTime = action.payload.startTime;
      })
      .addCase(startReading.rejected, (state, action) => {
        state.reading.isTracking = false;
        state.reading.error = action.payload.message;
      })
      .addCase(stopReading.fulfilled, (state) => {
        state.reading.isTracking = false;
        state.reading.postId = null;
        state.reading.startTime = null;
      })
      .addCase(stopReading.rejected, (state, action) => {
        state.reading.error = action.payload.message;
      })
      .addCase(submitReadingTime.pending, (state) => {
        state.reading.loading = true;
        state.reading.error = null;
      })
      .addCase(submitReadingTime.fulfilled, (state) => {
        state.reading.loading = false;
        state.reading.isTracking = false;
        state.reading.postId = null;
        state.reading.startTime = null;
      })
      .addCase(submitReadingTime.rejected, (state, action) => {
        state.reading.loading = false;
        state.reading.error = action.payload.message;
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
