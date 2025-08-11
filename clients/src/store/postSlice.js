import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

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
  // console.log("[containsBlobUrl] Input data:", data);
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
    // console.log("[fetchFollowingPosts] Starting with params:", { page, limit });
    try {
      const { auth } = getState();
      // console.log("[fetchFollowingPosts] Auth state:", auth);
      if (!auth.isAuthenticated) {
        // console.log("[fetchFollowingPosts] Not authenticated");
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      // console.log("[fetchFollowingPosts] Query params:", params.toString());
      const response = await axiosInstance.get(
        `/post/following?${params.toString()}`
      );
      // console.log("[fetchFollowingPosts] Response:", response.data);
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
    // console.log("[fetchPublicPosts] Starting with params:", { tag, after });
    try {
      const params = {
        limit: 12,
        ...(tag && { tag }),
        ...(after && { after }),
      };
      // console.log("[fetchPublicPosts] Query params:", params);
      const response = await axiosInstance.get("/post/public/posts", {
        params,
      });
      // console.log("[fetchPublicPosts] Response:", response.data);
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
    // console.log("[createPosts] Starting with postData:", postData);
    if (
      !postData.blocks ||
      !Array.isArray(postData.blocks) ||
      postData.blocks.length === 0
    ) {
      // console.log("[createPosts] Invalid blocks");
      return rejectWithValue({ message: "Blocks are required" });
    }
    if (
      containsBlobUrl(postData.thumbnail) ||
      containsBlobUrl(postData.blocks)
    ) {
      // console.log("[createPosts] Blob URL detected");
      return rejectWithValue({
        message:
          "Upload failed: Please convert Blob URLs to base64 or upload images properly.",
      });
    }
    try {
      const { auth } = getState();
      // console.log("[createPosts] Auth state:", auth);
      const response = await axiosInstance.post("/post/post-create", postData);
      // console.log("[createPosts] Response:", response.data);
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
    // console.log("[getAllPosts] Starting with params:", {
    //   userId,
    //   authorIds,
    //   page,
    //   limit,
    //   after,
    // });
    try {
      const { auth } = getState();
      // console.log("[getAllPosts] Auth state:", auth);
      if (!auth.isAuthenticated) {
        // console.log("[getAllPosts] Not authenticated");
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (after) params.append("after", after);
      if (userId) params.append("authorId", userId);
      if (authorIds.length) {
        const validIds = authorIds.filter(Boolean);
        if (validIds.length) params.append("authorIds", validIds.join(","));
      }
      // console.log("[getAllPosts] Query params:", params.toString());
      const response = await axiosInstance.get(
        `/post/all-post?${params.toString()}`
      );
      // console.log("[getAllPosts] Response:", response.data);
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
      console.error("[getAllPosts] Error:", errMsg);
      return rejectWithValue({ message: errMsg });
    }
  }
);

export const getLatestPosts = createAsyncThunk(
  "post/getLatestPosts",
  async ({ after = null } = {}, { rejectWithValue }) => {
    // console.log("[getLatestPosts] Starting with params:", { after });
    try {
      const params = { limit: 12, ...(after && { after }) };
      // console.log("[getLatestPosts] Query params:", params);
      const response = await axiosInstance.get("/post/latest-post/latest", {
        params,
      });
      // console.log("[getLatestPosts] Response:", response.data);
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
    // console.log("[getTrendingPosts] Starting with params:", { after });
    try {
      const params = { limit: 12, ...(after && { after }) };
      // console.log("[getTrendingPosts] Query params:", params);
      const response = await axiosInstance.get("/post/trending-post/trending", {
        params,
      });
      // console.log("[getTrendingPosts] Response:", response.data);
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
    // console.log("[getSearchPosts] Starting with params:", {
    //   query,
    //   userId,
    //   after,
    // });
    try {
      const queryParams = [
        `query=${encodeURIComponent(query)}`,
        userId ? `authorId=${encodeURIComponent(userId)}` : "",
        `limit=12`,
        after ? `after=${after}` : "",
      ]
        .filter(Boolean)
        .join("&");
      // console.log("[getSearchPosts] Query params:", queryParams);
      const response = await axiosInstance.get(
        `/post/search-post/search?${queryParams}`
      );
      // console.log("[getSearchPosts] Response:", response.data);
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
    // console.log("[getSinglePost] Starting with params:", { slug, isGuest });
    try {
      if (!slug || typeof slug !== "string") {
        console.error("[getSinglePost] Invalid slug:", slug);
        return rejectWithValue({ message: "Invalid post slug" });
      }
      const endpoint = isGuest ? `/post/public/${slug}` : `/post/${slug}`;
      // console.log("[getSinglePost] Endpoint:", endpoint);
      const response = await axiosInstance.get(endpoint);
      // console.log("[getSinglePost] Response:", response.data);
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
    // console.log("[updatePost] Starting with params:", { slug, updateData });
    try {
      const response = await axiosInstance.patch(
        `/post/update/${slug}`,
        updateData
      );
      // console.log("[updatePost] Response:", response.data);
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
    // console.log("[deletePost] Starting with postId:", postId);
    try {
      const response = await axiosInstance.delete(`/post/delete/${postId}`);
      // console.log("[deletePost] Response:", response.data);
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
    // console.log("[fetchUserPosts] Starting with params:", {
    //   userId,
    //   after,
    //   search,
    //   sort,
    // });
    try {
      const params = { limit: 12, ...(after && { after }), search, sort };
      // console.log("[fetchUserPosts] Query params:", params);
      const response = await axiosInstance.get(`/post/user/${userId}/posts`, {
        params,
      });
      // console.log("[fetchUserPosts] Response:", response.data);
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
    // console.log("[startReading] Starting with postId:", postId);
    try {
      const result = { postId, startTime: Date.now() };
      // console.log("[startReading] Result:", result);
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
    // console.log("[stopReading] Starting");
    try {
      // console.log("[stopReading] Result: null");
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
    // console.log("[submitReadingTime] Starting with params:", {
    //   postId,
    //   timeSpent,
    // });
    try {
      if (!postId || typeof postId !== "string") {
        console.error("[submitReadingTime] Invalid postId:", postId);
        return rejectWithValue({ message: "Invalid postId" });
      }
      const response = await axiosInstance.post(`/post/time-spent/${postId}`, {
        duration: timeSpent,
      });
      // console.log("[submitReadingTime] Response:", response.data);
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
    // console.log("[sendAdminAppeal] Starting with params:", { postId, message });
    try {
      const response = await axiosInstance.post(`/post/appeal/${postId}`, {
        message,
      });
      // console.log("[sendAdminAppeal] Response:", response.data);
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
      // console.log("[clearAllPosts] Clearing all posts");
      state.posts = [];
      state.publicPosts = [];
      state.followingPosts = [];
      state.latestPosts = [];
      state.trendingPosts = [];
      state.searchPosts = [];
      state.lastFetched = null;
    },
    clearError: (state) => {
      // console.log("[clearError] Clearing errors");
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
      // console.log("[setSearch] Setting search query:", action.payload);
      state.searchQuery = action.payload;
    },
    setSort: (state, action) => {
      // console.log("[setSort] Setting sort option:", action.payload);
      state.sortOption = action.payload;
    },
    resetFetch: (state) => {
      // console.log("[resetFetch] Resetting fetch options");
      state.searchQuery = "";
      state.sortOption = "newest";
    },
    clearReadingError: (state) => {
      // console.log("[clearReadingError] Clearing reading error");
      state.error = null;
    },
    updateCurrentPostBlockedStatus: (state, action) => {
      // console.log(
      //   "[updateCurrentPostBlockedStatus] Updating with:",
      //   action.payload
      // );
      const { postId, blocked } = action.payload;
      if (state.currentPost && state.currentPost._id === postId) {
        state.currentPost.blocked = blocked;
      }
    },
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowingPosts.pending, (state) => {
        // console.log("[fetchFollowingPosts.pending] Setting loading state");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowingPosts.fulfilled, (state, action) => {
        // console.log("[fetchFollowingPosts.fulfilled] Payload:", action.payload);
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
        // console.log("[fetchFollowingPosts.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(getAllPosts.pending, (state) => {
        // console.log("[getAllPosts.pending] Setting loading state");
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPosts.fulfilled, (state, action) => {
        // console.log("[getAllPosts.fulfilled] Payload:", action.payload);
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
        // console.log("[getAllPosts.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(fetchPublicPosts.pending, (state) => {
        // console.log("[fetchPublicPosts.pending] Setting loading state");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicPosts.fulfilled, (state, action) => {
        // console.log("[fetchPublicPosts.fulfilled] Payload:", action.payload);
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
        // console.log("[fetchPublicPosts.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(createPosts.fulfilled, (state, action) => {
        // console.log("[createPosts.fulfilled] Payload:", action.payload);
        state.createLoading = false;
        state.posts.unshift(action.payload.post);
        state.followingPosts.unshift(action.payload.post);
      })
      .addCase(createPosts.rejected, (state, action) => {
        // console.log("[createPosts.rejected] Error:", action.payload);
        state.createLoading = false;
        state.createError = action.payload.message;
      })
      .addCase(getLatestPosts.pending, (state) => {
        // console.log("[getLatestPosts.pending] Setting loading state");
        state.latestLoading = true;
        state.latestError = null;
      })
      .addCase(getLatestPosts.fulfilled, (state, action) => {
        // console.log("[getLatestPosts.fulfilled] Payload:", action.payload);
        state.latestLoading = false;
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.latestPosts, ...newPosts];
        state.latestPosts = combinedPosts.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );
      })
      .addCase(getLatestPosts.rejected, (state, action) => {
        // console.log("[getLatestPosts.rejected] Error:", action.payload);
        state.latestLoading = false;
        state.latestError = action.payload.message;
      })
      .addCase(getTrendingPosts.pending, (state) => {
        // console.log("[getTrendingPosts.pending] Setting loading state");
        state.trendingLoading = true;
        state.trendingError = null;
      })
      .addCase(getTrendingPosts.fulfilled, (state, action) => {
        // console.log("[getTrendingPosts.fulfilled] Payload:", action.payload);
        state.trendingLoading = false;
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.trendingPosts, ...newPosts];
        state.trendingPosts = combinedPosts.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );
      })
      .addCase(getTrendingPosts.rejected, (state, action) => {
        // console.log("[getTrendingPosts.rejected] Error:", action.payload);
        state.trendingLoading = false;
        state.trendingError = action.payload.message;
      })
      .addCase(getSearchPosts.pending, (state) => {
        // console.log("[getSearchPosts.pending] Setting loading state");
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(getSearchPosts.fulfilled, (state, action) => {
        // console.log("[getSearchPosts.fulfilled] Payload:", action.payload);
        state.searchLoading = false;
        const newPosts = action.payload.posts;
        const combinedPosts = [...state.searchPosts, ...newPosts];
        state.searchPosts = combinedPosts.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );
      })
      .addCase(getSearchPosts.rejected, (state, action) => {
        // console.log("[getSearchPosts.rejected] Error:", action.payload);
        state.searchLoading = false;
        state.searchError = action.payload.message;
      })
      .addCase(getSinglePost.pending, (state) => {
        // console.log("[getSinglePost.pending] Setting loading state");
        state.loading = true;
        state.error = null;
      })
      .addCase(getSinglePost.fulfilled, (state, action) => {
        // console.log("[getSinglePost.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.currentPost = action.payload;
      })
      .addCase(getSinglePost.rejected, (state, action) => {
        // console.log("[getSinglePost.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload.message;
        state.currentPost = null;
      })
      .addCase(updatePost.pending, (state) => {
        // console.log("[updatePost.pending] Setting loading state");
        state.updateLoading = true;
        state.updateError = null;
        state.updateMessage = null;
        state.updateSuccess = false;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        // console.log("[updatePost.fulfilled] Payload:", action.payload);
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
        // console.log("[updatePost.rejected] Error:", action.payload);
        state.updateLoading = false;
        state.updateError = action.payload.message;
        state.updateSuccess = false;
      })
      .addCase(deletePost.pending, (state) => {
        // console.log("[deletePost.pending] Setting loading state");
        state.deleteLoading = true;
        state.deleteError = null;
        state.deleteMessage = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        // console.log("[deletePost.fulfilled] Payload:", action.payload);
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
        // console.log("[deletePost.rejected] Error:", action.payload);
        state.deleteLoading = false;
        state.deleteError = action.payload.message;
      })
      .addCase(fetchUserPosts.pending, (state) => {
        // console.log("[fetchUserPosts.pending] Setting loading state");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        // console.log("[fetchUserPosts.fulfilled] Payload:", action.payload);
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
        // console.log("[fetchUserPosts.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(startReading.fulfilled, (state, action) => {
        // console.log("[startReading.fulfilled] Payload:", action.payload);
        state.isTracking = true;
        state.postId = action.payload.postId;
        state.startTime = action.payload.startTime;
      })
      .addCase(startReading.rejected, (state, action) => {
        // console.log("[startReading.rejected] Error:", action.payload);
        state.isTracking = false;
        state.error = action.payload.message;
      })
      .addCase(stopReading.fulfilled, (state) => {
        // console.log("[stopReading.fulfilled] Resetting tracking state");
        state.isTracking = false;
        state.postId = null;
        state.startTime = null;
      })
      .addCase(stopReading.rejected, (state, action) => {
        // console.log("[stopReading.rejected] Error:", action.payload);
        state.error = action.payload.message;
      })
      .addCase(submitReadingTime.pending, (state) => {
        // console.log("[submitReadingTime.pending] Setting loading state");
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReadingTime.fulfilled, (state) => {
        // console.log("[submitReadingTime.fulfilled] Clearing tracking state");
        state.loading = false;
        state.isTracking = false;
        state.postId = null;
        state.startTime = null;
      })
      .addCase(submitReadingTime.rejected, (state, action) => {
        // console.log("[submitReadingTime.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload.message;
      })
      .addCase(sendAdminAppeal.pending, (state) => {
        // console.log("[sendAdminAppeal.pending] Setting loading state");
        state.appealLoading = true;
        state.appealError = null;
      })
      .addCase(sendAdminAppeal.fulfilled, (state) => {
        // console.log("[sendAdminAppeal.fulfilled] Appeal sent");
        state.appealLoading = false;
      })
      .addCase(sendAdminAppeal.rejected, (state, action) => {
        // console.log("[sendAdminAppeal.rejected] Error:", action.payload);
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
  clearCurrentPost,
} = postSlice.actions;

export default postSlice.reducer;
