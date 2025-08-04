import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";
import mongoose from "mongoose"; // Import mongoose for ObjectId validation

const initialState = {
  loading: false,
  error: null,
  posts: [],
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
  startTime: null,
  postId: null,
  isTracking: false,
  appealLoading: false,
  appealError: null,
};

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
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      const response = await axiosInstance.get(
        `/post/following?${params.toString()}`
      );
      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to fetch following posts";
      console.error("[fetchFollowingPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to fetch public posts";
      console.error("[fetchPublicPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
          "Upload failed: Please convert Blob URLs to base64 or upload images properly.",
      });
    }
    try {
      const { auth } = getState();
      const response = await axiosInstance.post("/post/post-create", postData);
      return { ...response.data, authorId: auth.user?._id };
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to create post";
      console.error("[createPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
        console.error("[getAllPosts] Not authenticated");
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }

      // Validate inputs
      if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
        console.error("[getAllPosts] Invalid userId:", userId);
        return rejectWithValue({ message: "Invalid userId" });
      }
      if (authorIds.some((id) => id && !mongoose.Types.ObjectId.isValid(id))) {
        console.error("[getAllPosts] Invalid authorIds:", authorIds);
        return rejectWithValue({ message: "Invalid authorIds" });
      }
      if (page < 1 || limit < 1) {
        console.error("[getAllPosts] Invalid pagination:", { page, limit });
        return rejectWithValue({ message: "Invalid page or limit" });
      }

      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (after) params.append("after", after);
      if (userId) params.append("authorId", userId);
      if (authorIds.length) {
        const validIds = authorIds.filter(
          (id) => id && mongoose.Types.ObjectId.isValid(id)
        );
        if (validIds.length) params.append("authorIds", validIds.join(","));
      }

      const response = await axiosInstance.get(
        `/post/all-post?${params.toString()}`
      );

      return {
        posts: response.data.posts,
        total: response.data.total,
        lastFetched: response.data.posts.length
          ? response.data.posts[response.data.posts.length - 1].createdAt
          : null,
        isMyPosts: !!userId,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to fetch posts";
      console.error("[getAllPosts] Detailed error:", {
        message: errMsg,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
      });
      return rejectWithValue({ message: errMsg });
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
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to load latest posts";
      console.error("[getLatestPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to load trending posts";
      console.error("[getTrendingPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to load search results";
      console.error("[getSearchPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
    }
  }
);

export const getSinglePost = createAsyncThunk(
  "post/getSinglePost",
  async ({ slug, isGuest = false }, { rejectWithValue }) => {
    try {
      if (!slug || typeof slug !== "string") {
        console.error("[getSinglePost] Invalid slug:", slug);
        return rejectWithValue({ message: "Invalid post slug" });
      }
      const endpoint = isGuest ? `/post/public/${slug}` : `/post/${slug}`;
      const response = await axiosInstance.get(endpoint);
      if (!response.data.post) {
        console.error("[getSinglePost] Post not found for slug:", slug);
        return rejectWithValue({ message: "Post not found" });
      }
      return response.data.post;
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to fetch post";
      console.error("[getSinglePost] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      const errMsg = error.response?.data?.message || "Failed to update post";
      console.error("[updatePost] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      const errMsg = error.response?.data?.message || "Failed to delete post";
      console.error("[deletePost] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to fetch user posts";
      console.error("[fetchUserPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
    }
  }
);

export const startReading = createAsyncThunk(
  "post/startReading",
  async (postId, { rejectWithValue }) => {
    try {
      const result = { postId, startTime: Date.now() };
      return result;
    } catch (error) {
      console.error("[startReading] Error:", error.message);
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
      console.error("[stopReading] Error:", error.message);
      return rejectWithValue({ message: "Failed to stop reading" });
    }
  }
);

export const submitReadingTime = createAsyncThunk(
  "post/submitReadingTime",
  async ({ postId, timeSpent }, { rejectWithValue }) => {
    try {
      if (!postId || typeof postId !== "string") {
        console.error("[submitReadingTime] Invalid postId:", postId);
        return rejectWithValue({ message: "Invalid postId" });
      }
      const response = await axiosInstance.post(`/post/time-spent/${postId}`, {
        duration: timeSpent,
      });
      return response.data;
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to submit reading time";
      console.error("[submitReadingTime] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
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
      const errMsg = error.response?.data?.message || "Failed to send appeal";
      console.error("[sendAdminAppeal] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
    }
  }
);

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
      .addCase(fetchFollowingPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowingPosts.fulfilled, (state, action) => {
        state.loading = false;
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.followingPosts, ...newPosts];
        state.followingPosts = combinedPosts.filter(
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
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.posts, ...newPosts];
        state.posts = combinedPosts.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );
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
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.publicPosts, ...newPosts];
        state.publicPosts = combinedPosts.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );
        state.lastFetched = action.payload.lastFetched;
      })
      .addCase(fetchPublicPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
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
      .addCase(getLatestPosts.pending, (state) => {
        state.latestLoading = true;
        state.latestError = null;
      })
      .addCase(getLatestPosts.fulfilled, (state, action) => {
        state.latestLoading = false;
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.latestPosts, ...newPosts];
        state.latestPosts = combinedPosts.filter(
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
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.trendingPosts, ...newPosts];
        state.trendingPosts = combinedPosts.filter(
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
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.searchPosts, ...newPosts];
        state.searchPosts = combinedPosts.filter(
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
        const idx = state.posts.findIndex((p) => p.slug === updatedPost.slug);
        if (idx !== -1) {
          state.posts[idx] = { ...state.posts[idx], ...updatedPost };
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
        const followingIdx = state.followingPosts.findIndex(
          (p) => p.slug === updatedPost.slug
        );
        if (followingIdx !== -1) {
          state.followingPosts[followingIdx] = {
            ...state.followingPosts[followingIdx],
            ...updatedPost,
          };
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
        state.posts = state.posts.filter(
          (p) => p._id !== action.payload.postId
        );
        state.publicPosts = state.publicPosts.filter(
          (p) => p._id !== action.payload.postId
        );
        state.followingPosts = state.followingPosts.filter(
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
        state.deleteError = action.payload.message;
      })
      .addCase(fetchUserPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.posts, ...newPosts];
        state.posts = combinedPosts.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );
        state.lastFetched = action.payload.lastFetched;
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(startReading.fulfilled, (state, action) => {
        state.isTracking = true;
        state.postId = action.payload.postId;
        state.startTime = action.payload.startTime;
      })
      .addCase(startReading.rejected, (state, action) => {
        state.isTracking = false;
        state.error = action.payload.message;
      })
      .addCase(stopReading.fulfilled, (state) => {
        state.isTracking = false;
        state.postId = null;
        state.startTime = null;
      })
      .addCase(stopReading.rejected, (state, action) => {
        state.error = action.payload.message;
      })
      .addCase(submitReadingTime.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReadingTime.fulfilled, (state) => {
        state.loading = false;
        state.isTracking = false;
        state.postId = null;
        state.startTime = null;
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
