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
  currentPostSlug: null,
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
  recentTitles: [],
};

// Simplified Blob URL check
const containsBlobUrl = (data) => {
  if (!data) return false;
  if (typeof data === "string") return data.startsWith("blob:");
  if (Array.isArray(data)) return data.some(containsBlobUrl);
  if (typeof data === "object" && data !== null)
    return Object.values(data).some(containsBlobUrl);
  return false;
};

// ✅ FIXED: Async retry with exponential backoff (removed for create/update to prevent loops)
const asyncRetry = async (
  fn,
  retries = 3,
  minTimeout = 1000,
  maxTimeout = 5000
) => {
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = Math.min(minTimeout * Math.pow(2, i), maxTimeout);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// ✅ ADDED: Estimate payload size before sending
const estimatePayloadSize = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return { sizeInBytes, sizeInMB };
  } catch (error) {
    console.error("[estimatePayloadSize] Error:", error);
    return { sizeInBytes: 0, sizeInMB: 0 };
  }
};

// ✅ ADDED: Validate payload before sending
const validatePayload = (postData, context = "create") => {
  const MAX_SIZE_MB = 15;
  const MAX_BLOCKS = 100;
  const MAX_IMAGES = 50;

  const { sizeInMB } = estimatePayloadSize(postData);

  // Size check
  if (sizeInMB > MAX_SIZE_MB) {
    throw new Error(
      `Post data is too large (${sizeInMB.toFixed(2)}MB). Maximum allowed: ${MAX_SIZE_MB}MB. ` +
      `Please compress images or reduce content.`
    );
  }

  // Blocks count check
  if (postData.blocks && postData.blocks.length > MAX_BLOCKS) {
    throw new Error(
      `Too many blocks (${postData.blocks.length}). Maximum allowed: ${MAX_BLOCKS}`
    );
  }

  // Images count check
  const imageBlocks = postData.blocks?.filter(b => b.type === 'image') || [];
  if (imageBlocks.length > MAX_IMAGES) {
    throw new Error(
      `Too many images (${imageBlocks.length}). Maximum allowed: ${MAX_IMAGES}`
    );
  }

  // console.log(`[${context}Post] Payload validated:`, {
  //   sizeMB: sizeInMB.toFixed(2),
  //   blocks: postData.blocks?.length || 0,
  //   images: imageBlocks.length
  // });

  return true;
};

export const fetchFollowingPosts = createAsyncThunk(
  "post/fetchFollowingPosts",
  async ({ page = 1, limit = null } = {}, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated || !auth.token) {
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }
      const params = new URLSearchParams();
      params.append("page", page);
      if (limit) params.append("limit", limit);
      const response = await asyncRetry(() =>
        axiosInstance.get(`/post/following?${params.toString()}`, {
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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
  async ({ tag = null, after = null, limit = null }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (tag) params.append("tag", tag);
      if (after) params.append("after", after);
      if (limit) params.append("limit", limit);
      const response = await asyncRetry(() =>
        axiosInstance.get("/post/public/posts", {
          params,
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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

// ✅ FIXED: createPosts with better large content handling
export const createPosts = createAsyncThunk(
  "post/createPost",
  async (postData, { rejectWithValue, getState }) => {
    const { post } = getState();
    const title = postData.title?.trim();

    // Check for recent title in state
    const recentTitle = post.recentTitles.find(
      (rt) => rt.title === title && Date.now() - rt.timestamp < 60 * 1000
    );
    if (recentTitle) {
      return rejectWithValue({
        message: "A post with this title was recently created",
      });
    }

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
      // ✅ ADDED: Validate payload size before sending
      validatePayload(postData, "create");

      const { auth } = getState();

      // ✅ FIXED: Increased timeout to 90 seconds for large posts
      // ✅ FIXED: Added progress tracking capability
      const response = await axiosInstance.post("/post/post-create", postData, {
        timeout: 90000, // 90 seconds for very large posts
        headers: {
          "Content-Type": "application/json",
        },
        // ✅ ADDED: Track upload progress (if needed in UI)
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // console.log(`[createPost] Upload progress: ${percentCompleted}%`);
        },
      });

      if (!response.data || !response.data.post) {
        throw new Error("Invalid server response format");
      }

      return {
        ...response.data,
        authorId: auth.user?._id,
        title,
      };
    } catch (error) {
      console.error("[createPosts] Full error:", error);
      console.error("[createPosts] Response:", error.response?.data);
      console.error("[createPosts] Status:", error.response?.status);

      // ✅ IMPROVED: Better error messages for large content
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return rejectWithValue({
          message:
            "Upload timed out. Your post may be too large or connection is slow. " +
            "Try: 1) Compress images, 2) Reduce content size, 3) Check your internet connection.",
          isTimeout: true,
        });
      }

      if (error.response?.status === 413) {
        const suggestions = error.response?.data?.meta?.suggestions || [];
        return rejectWithValue({
          message: 
            error.response?.data?.message || 
            "Post data too large. Please reduce image sizes or split content into multiple posts.",
          suggestions,
        });
      }

      if (error.response?.status >= 500) {
        return rejectWithValue({
          message:
            "Server error occurred. Your post may have been created - please check your posts before trying again.",
          isServerError: true,
        });
      }

      // ✅ ADDED: Handle client-side validation errors
      if (error.message && !error.response) {
        return rejectWithValue({
          message: error.message,
          isValidationError: true,
        });
      }

      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create post";
      return rejectWithValue({ message: errMsg });
    }
  }
);

export const getAllPosts = createAsyncThunk(
  "post/getAllPosts",
  async (
    { userId, authorIds = [], page = 1, limit = null, after = null } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated || !auth.token) {
        return rejectWithValue({
          message: "You must be signed in to access this feature.",
        });
      }
      const params = new URLSearchParams();
      params.append("page", page);
      if (limit !== null) params.append("limit", limit);
      if (after) params.append("after", after);
      if (userId) params.append("authorId", userId);
      if (authorIds.length) {
        const validIds = authorIds.filter(Boolean);
        if (validIds.length) params.append("authorIds", validIds.join(","));
      }
      const response = await asyncRetry(() =>
        axiosInstance.get(`/post/all-post?${params.toString()}`, {
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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
  async ({ after = null, limit = 12 } = {}, { rejectWithValue }) => {
    try {
      const params = { limit, ...(after && { after }) };
      const response = await asyncRetry(() =>
        axiosInstance.get("/post/latest-post/latest", {
          params,
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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
  async ({ after = null, limit = 12 } = {}, { rejectWithValue }) => {
    try {
      const params = { limit, ...(after && { after }) };
      const response = await asyncRetry(() =>
        axiosInstance.get("/post/trending-post/trending", {
          params,
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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
  async ({ query, userId, after = null, limit = 12 }, { rejectWithValue }) => {
    try {
      const queryParams = [
        `query=${encodeURIComponent(query)}`,
        userId ? `authorId=${encodeURIComponent(userId)}` : "",
        `limit=${limit}`,
        after ? `after=${after}` : "",
      ]
        .filter(Boolean)
        .join("&");
      const response = await asyncRetry(() =>
        axiosInstance.get(`/post/search-post/search?${queryParams}`, {
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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

const activeRequests = new Map();

// ✅ FIXED: getSinglePost with better timeout for large posts
export const getSinglePost = createAsyncThunk(
  "post/getSinglePost",
  async ({ slug, isGuest = false }, { rejectWithValue }) => {
    try {
      if (!slug || typeof slug !== "string" || slug.trim() === "") {
        console.error("[getSinglePost] Invalid slug:", slug);
        return rejectWithValue({ message: "Invalid post slug" });
      }

      const cleanSlug = slug.trim();

      const requestKey = `${cleanSlug}-${isGuest}`;
      if (activeRequests.has(requestKey)) {
        console.warn("[getSinglePost] Duplicate request detected:", requestKey);
        return rejectWithValue({
          slug: cleanSlug,
          message: "Already loading this post",
        });
      }

      activeRequests.set(requestKey, true);

      const endpoint = isGuest
        ? `/post/public/${cleanSlug}`
        : `/post/${cleanSlug}`;

      try {
        // ✅ FIXED: Increased timeout to 30 seconds for large posts with many images
        const response = await axiosInstance.get(endpoint, {
          timeout: 30000, // 30 seconds for large posts
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!response.data.post) {
          console.error("[getSinglePost] Post not found for slug:", cleanSlug);
          return rejectWithValue({
            message: "Post not found",
            slug: cleanSlug,
          });
        }

        const receivedPost = response.data.post;

        if (receivedPost.slug.toLowerCase() !== cleanSlug.toLowerCase()) {
          console.warn("[getSinglePost] Slug mismatch:", {
            requested: cleanSlug,
            received: receivedPost.slug,
          });
        }

        // Normalize blocks
        if (receivedPost.blocks && Array.isArray(receivedPost.blocks)) {
          receivedPost.blocks = receivedPost.blocks.map((block) => {
            const id =
              block.id || block._id || `block-${Date.now()}-${Math.random()}`;
            const normalizedBlock = { ...block, id };

            if (normalizedBlock.type === "code") {
              normalizedBlock.language =
                normalizedBlock.language || "plaintext";
            }

            return normalizedBlock;
          });
        }

        return {
          post: receivedPost,
          slug: cleanSlug,
          timestamp: Date.now(),
        };
      } finally {
        activeRequests.delete(requestKey);
      }
    } catch (error) {
      activeRequests.delete(`${slug}-${isGuest}`);

      // ✅ ADDED: Better timeout error handling
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return rejectWithValue({
          message: "Post loading timed out. This post may be very large. Please try again.",
          slug,
          isTimeout: true,
        });
      }

      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch post";

      console.error("[getSinglePost] Error details:", {
        slug,
        message: errMsg,
        status: error.response?.status,
      });

      return rejectWithValue({
        message: errMsg,
        slug,
        status: error.response?.status,
      });
    }
  }
);

// ✅ FIXED: updatePost with better large content handling
export const updatePost = createAsyncThunk(
  "post/updatePost",
  async ({ slug, updateData }, { rejectWithValue }) => {
    try {
      // ✅ ADDED: Validate payload before update
      if (updateData.blocks) {
        validatePayload(updateData, "update");
      }

      // ✅ FIXED: Increased timeout and no retry to prevent loops
      const response = await axiosInstance.patch(
        `/post/update/${slug}`, 
        updateData, 
        {
          timeout: 90000, // 90 seconds for large updates
          headers: {
            "Content-Type": "application/json",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            // console.log(`[updatePost] Upload progress: ${percentCompleted}%`);
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("[updatePost] Error:", error);

      // ✅ IMPROVED: Better error messages
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return rejectWithValue({
          message:
            "Update timed out. Changes may be too large. Try compressing images or reducing content.",
          isTimeout: true,
        });
      }

      if (error.response?.status === 413) {
        const suggestions = error.response?.data?.meta?.suggestions || [];
        return rejectWithValue({
          message: 
            error.response?.data?.message || 
            "Updated data too large. Please reduce image sizes or content.",
          suggestions,
        });
      }

      // Handle client-side validation errors
      if (error.message && !error.response) {
        return rejectWithValue({
          message: error.message,
          isValidationError: true,
        });
      }

      const errMsg = error.response?.data?.message || "Failed to update post";
      return rejectWithValue({ message: errMsg });
    }
  }
);

export const deletePost = createAsyncThunk(
  "post/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await asyncRetry(() =>
        axiosInstance.delete(`/post/delete/${postId}`, { timeout: 10000 })
      );
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
      const params = { ...(after && { after }), search, sort };
      const response = await asyncRetry(() =>
        axiosInstance.get(`/post/user/${userId}/posts`, {
          params,
          timeout: 10000,
        })
      );
      return {
        posts: response.data.posts || [],
        total: response.data.total || 0,
        lastFetched: response.data.posts?.length
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
      return { postId, startTime: Date.now() };
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

      const response = await asyncRetry(
        async () => {
          return axiosInstance.post(
            `/post/time-spent/${postId}`,
            { duration: timeSpent },
            { timeout: 8000 }
          );
        },
        {
          retries: 3,
          minTimeout: 500,
          maxTimeout: 2000,
        }
      );

      return response.data;
    } catch (error) {
      console.error("[submitReadingTime] Error:", error.message);
      const errMsg =
        error.response?.data?.message || "Failed to submit reading time";
      return rejectWithValue({ message: errMsg });
    }
  }
);

export const sendAdminAppeal = createAsyncThunk(
  "post/sendAdminAppeal",
  async ({ postId, message }, { rejectWithValue }) => {
    try {
      const response = await asyncRetry(() =>
        axiosInstance.post(
          `/post/appeal/${postId}`,
          { message },
          { timeout: 10000 }
        )
      );
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
      state.recentTitles = [];
    },
    clearError: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.latestError = null;
      state.trendingError = null;
      state.searchError = null;
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
      state.error = null;
    },
    updateCurrentPostBlockedStatus: (state, action) => {
      const { postId, blocked } = action.payload;
      if (state.currentPost && state.currentPost._id === postId) {
        state.currentPost.blocked = blocked;
      }
    },
    clearCurrentPost: (state) => {
      state.currentPost = null;
      state.currentPostSlug = null;
      state.error = null;
      state.loading = false;
    },
    setLoadingSlug: (state, action) => {
      state.currentPostSlug = action.payload;
      state.error = null;
    },
    clearActiveRequests: (state) => {
      activeRequests.clear();
      state.loading = false;
      state.currentPostSlug = null;
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
      .addCase(createPosts.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createPosts.fulfilled, (state, action) => {
        state.createLoading = false;
        state.posts.unshift(action.payload.post);
        state.followingPosts.unshift(action.payload.post);
        state.recentTitles.push({
          title: action.payload.title,
          timestamp: Date.now(),
        });
        state.recentTitles = state.recentTitles.filter(
          (rt) => Date.now() - rt.timestamp < 60 * 1000
        );
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
      // FIXED: Better getSinglePost state handling
      .addCase(getSinglePost.pending, (state, action) => {
        const slug = action.meta.arg?.slug;
        // console.log("[getSinglePost.pending] Loading post:", slug);

        // Only set loading if we're not already loading this slug
        if (state.currentPostSlug !== slug) {
          state.loading = true;
          state.error = null;
          state.currentPostSlug = slug || null;

          // Clear previous post if loading a different slug
          if (state.currentPost && state.currentPost.slug !== slug) {
            // console.log("[getSinglePost.pending] Clearing previous post");
            state.currentPost = null;
          }
        }
      })
      .addCase(getSinglePost.fulfilled, (state, action) => {
        // console.log("[getSinglePost.fulfilled] Post loaded:", {
        //   slug: action.payload.slug,
        //   title: action.payload.post?.title,
        // });

        // FIXED: Always update state regardless of slug check
        state.loading = false;
        state.error = null;
        state.currentPost = action.payload.post;
        state.currentPostSlug = action.payload.slug;
      })
      .addCase(getSinglePost.rejected, (state, action) => {
        // console.log("[getSinglePost.rejected] Failed to load post:", {
        //   slug: action.payload?.slug,
        //   message: action.payload?.message,
        // });

        state.loading = false;
        state.error = action.payload?.message || "Failed to load post";

        // FIXED: Always clear state on error to prevent stuck states
        state.currentPost = null;
        state.currentPostSlug = null;
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

        // Update in all relevant arrays
        const updatePostInArray = (array) => {
          const idx = array.findIndex(
            (p) => p.slug === updatedPost.slug || p._id === updatedPost._id
          );
          if (idx !== -1) {
            array[idx] = { ...array[idx], ...updatedPost };
          }
        };

        // Update posts in all arrays
        updatePostInArray(state.posts);
        updatePostInArray(state.latestPosts);
        updatePostInArray(state.trendingPosts);
        updatePostInArray(state.followingPosts);
        updatePostInArray(state.publicPosts);
        updatePostInArray(state.searchPosts);

        // Update currentPost if it matches
        if (
          state.currentPost &&
          (state.currentPost.slug === updatedPost.slug ||
            state.currentPost._id === updatedPost._id)
        ) {
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

        // Remove from all arrays
        const filterPosts = (array) =>
          array.filter((p) => p._id !== action.payload.postId);

        state.posts = filterPosts(state.posts);
        state.publicPosts = filterPosts(state.publicPosts);
        state.followingPosts = filterPosts(state.followingPosts);
        state.latestPosts = filterPosts(state.latestPosts);
        state.trendingPosts = filterPosts(state.trendingPosts);
        state.searchPosts = filterPosts(state.searchPosts);

        // Clear currentPost if it was deleted
        if (state.currentPost?._id === action.payload.postId) {
          state.currentPost = null;
          state.currentPostSlug = null;
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
  clearCurrentPost,
  setLoadingSlug,
  clearActiveRequests,
} = postSlice.actions;

export default postSlice.reducer;
