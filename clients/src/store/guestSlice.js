// guestSlice.js - Fixed Version
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Utility function to safely handle localStorage
const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error.message);
    }
    return null;
  },

  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error.message);
    }
    return false;
  },
};

// Enhanced error handling
const handleAsyncError = (error, fallbackMessage) => {
  const message =
    error.response?.data?.message || error.message || fallbackMessage;

  const statusCode = error.response?.status;
  const errorCode = error.response?.data?.code;

  if (process.env.NODE_ENV === "development") {
    console.error("API Error:", { message, statusCode, errorCode, error });
  }

  return { message, statusCode, errorCode };
};

// Request deduplication cache
const pendingRequests = new Map();

// Enhanced initial state
const initialState = {
  // Posts data
  posts: [],
  singlePost: null,
  total: 0,
  page: 1,
  hasMore: false,
  lastFetched: null,

  // Loading states
  loading: false,
  postsLoading: false,
  singlePostLoading: false,
  viewTrackingLoading: false,
  visitTrackingLoading: false,
  searchLoading: false,

  // Error states
  error: null,
  postsError: null,
  singlePostError: null,

  // Tracking states
  viewTracked: false,
  lastTrackedGuest: null,

  // Search state
  searchQuery: "",
  searchResults: [],
  searchTotal: 0,

  // Cache timestamps
  lastPostsFetch: null,
  lastSearchFetch: null,
};

// 🔹 Fetch Public Posts with enhanced error handling and deduplication
export const fetchPublicPosts = createAsyncThunk(
  "guest/fetchPublicPosts",
  async (
    { page = 1, limit = 12, tag, after, blocked = false } = {},
    { rejectWithValue, signal }
  ) => {
    const requestKey = `posts-${page}-${limit}-${tag || ""}-${
      after || ""
    }-${blocked}`;

    // Check for pending request
    if (pendingRequests.has(requestKey)) {
      try {
        return await pendingRequests.get(requestKey);
      } catch (error) {
        // If pending request failed, continue with new request
      }
    }

    const requestPromise = (async () => {
      try {
        const params = {
          page: Math.max(1, parseInt(page) || 1),
          limit: Math.min(Math.max(1, parseInt(limit) || 12), 100),
        };

        if (tag && typeof tag === "string" && tag.trim()) {
          params.tag = tag.trim();
        }
        if (after && !isNaN(Date.parse(after))) {
          params.after = after;
        }
        if (typeof blocked === "boolean") {
          params.blocked = blocked;
        }

        const res = await axiosInstance.get("/public/posts", {
          params,
          signal,
          timeout: 10000,
        });

        if (!res.data || typeof res.data !== "object") {
          throw new Error("Invalid response format");
        }

        const posts = Array.isArray(res.data.posts)
          ? res.data.posts
              .map((post, index) => {
                if (!post || typeof post !== "object") {
                  console.warn(`Invalid post at index ${index}:`, post);
                  return null;
                }

                return {
                  ...post,
                  blocks: Array.isArray(post.blocks) ? post.blocks : [],
                  _id: post._id || `temp-${index}`,
                  title: post.title || "Untitled",
                  slug: post.slug || `post-${index}`,
                };
              })
              .filter(Boolean)
          : [];

        const result = {
          posts,
          total: Math.max(0, parseInt(res.data.total) || posts.length),
          page: Math.max(1, parseInt(res.data.page) || params.page),
          lastFetched: res.data.lastFetched || null,
          hasMore: posts.length === params.limit,
          requestParams: params,
        };

        return result;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error("Request was cancelled");
        }

        const errorInfo = handleAsyncError(
          error,
          "Failed to fetch public posts"
        );
        throw errorInfo;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, requestPromise);

    try {
      return await requestPromise;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// 🔹 Fetch Public Post by Slug with enhanced validation
export const fetchPublicPostBySlug = createAsyncThunk(
  "guest/fetchPublicPostBySlug",
  async (slug, { rejectWithValue, signal }) => {
    if (!slug || typeof slug !== "string") {
      return rejectWithValue({
        message: "Invalid slug parameter",
        statusCode: 400,
      });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    if (!normalizedSlug) {
      return rejectWithValue({
        message: "Empty slug parameter",
        statusCode: 400,
      });
    }

    const requestKey = `post-${normalizedSlug}`;

    if (pendingRequests.has(requestKey)) {
      try {
        return await pendingRequests.get(requestKey);
      } catch (error) {
        // Continue with new request if pending failed
      }
    }

    const requestPromise = (async () => {
      try {
        const res = await axiosInstance.get(
          `/public/post/${encodeURIComponent(normalizedSlug)}`,
          {
            signal,
            timeout: 10000,
          }
        );

        if (!res.data?.post || typeof res.data.post !== "object") {
          throw new Error("Invalid post data received");
        }

        const post = {
          ...res.data.post,
          blocks: Array.isArray(res.data.post.blocks)
            ? res.data.post.blocks
            : [],
          slug: res.data.post.slug || normalizedSlug,
          title: res.data.post.title || "Untitled",
          _id: res.data.post._id,
        };

        if (!post._id) {
          console.warn("Post missing _id:", post);
        }

        return post;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error("Request was cancelled");
        }

        const errorInfo = handleAsyncError(error, "Post not found");
        throw errorInfo;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, requestPromise);

    try {
      return await requestPromise;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// 🔹 Track Guest View with improved error handling
export const trackGuestView = createAsyncThunk(
  "guest/trackGuestView",
  async (slug, { rejectWithValue, signal }) => {
    if (!slug || typeof slug !== "string") {
      return rejectWithValue({
        message: "Invalid slug parameter",
        statusCode: 400,
      });
    }

    const normalizedSlug = slug.toLowerCase().trim();

    try {
      const res = await axiosInstance.post(
        `/public/post/${encodeURIComponent(normalizedSlug)}/view`,
        {},
        {
          signal,
          timeout: 5000,
        }
      );

      return {
        message: res.data.message || "View tracked successfully",
        slug: normalizedSlug,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error.name === "AbortError") {
        return rejectWithValue({ message: "Request was cancelled" });
      }

      const errorInfo = handleAsyncError(error, "Failed to track view");
      return rejectWithValue(errorInfo);
    }
  }
);

// 🔹 Search Public Posts with enhanced validation
export const searchPublicPosts = createAsyncThunk(
  "guest/searchPublicPosts",
  async ({ query, page = 1, limit = 12 }, { rejectWithValue, signal }) => {
    if (!query || typeof query !== "string") {
      return rejectWithValue({
        message: "Search query is required",
        statusCode: 400,
      });
    }

    const searchTerm = query.trim();
    if (!searchTerm || searchTerm.length === 0) {
      return rejectWithValue({
        message: "Empty search query",
        statusCode: 400,
      });
    }

    if (searchTerm.length > 100) {
      return rejectWithValue({
        message: "Search query too long",
        statusCode: 400,
      });
    }

    const requestKey = `search-${searchTerm}-${page}-${limit}`;

    if (pendingRequests.has(requestKey)) {
      try {
        return await pendingRequests.get(requestKey);
      } catch (error) {
        // Continue with new request if pending failed
      }
    }

    const requestPromise = (async () => {
      try {
        const params = {
          query: searchTerm,
          page: Math.max(1, parseInt(page) || 1),
          limit: Math.min(Math.max(1, parseInt(limit) || 12), 100),
        };

        const res = await axiosInstance.get("/public/search-posts", {
          params,
          signal,
          timeout: 10000,
        });

        if (!res.data || typeof res.data !== "object") {
          throw new Error("Invalid response format");
        }

        const posts = Array.isArray(res.data.posts)
          ? res.data.posts
              .map((post, index) => {
                if (!post || typeof post !== "object") {
                  console.warn(
                    `Invalid search result at index ${index}:`,
                    post
                  );
                  return null;
                }

                return {
                  ...post,
                  blocks: Array.isArray(post.blocks) ? post.blocks : [],
                  _id: post._id || `search-${index}`,
                  title: post.title || "Untitled",
                  slug: post.slug || `post-${index}`,
                };
              })
              .filter(Boolean)
          : [];

        return {
          posts,
          total: Math.max(0, parseInt(res.data.total) || posts.length),
          page: Math.max(1, parseInt(res.data.page) || params.page),
          searchQuery: searchTerm,
          hasMore: posts.length === params.limit,
        };
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error("Request was cancelled");
        }

        const errorInfo = handleAsyncError(
          error,
          "Failed to search public posts"
        );
        throw errorInfo;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, requestPromise);

    try {
      return await requestPromise;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// 🔹 Track Guest Visit with localStorage handling moved to component level
export const trackGuestVisit = createAsyncThunk(
  "guest/trackGuestVisit",
  async (_, { rejectWithValue, signal }) => {
    try {
      const res = await axiosInstance.post(
        "/public/guest/visit",
        {},
        {
          signal,
          timeout: 5000,
        }
      );

      const result = {
        guest: res.data.guest || null,
        message: res.data.message || "Visit tracked successfully",
        timestamp: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      if (error.name === "AbortError") {
        return rejectWithValue({ message: "Request was cancelled" });
      }

      const errorInfo = handleAsyncError(error, "Failed to track guest visit");
      return rejectWithValue(errorInfo);
    }
  }
);

const guestSlice = createSlice({
  name: "guest",
  initialState,
  reducers: {
    clearGuestState(state) {
      return {
        ...initialState,
        // Preserve some data that shouldn't be cleared
        lastTrackedGuest: state.lastTrackedGuest,
      };
    },

    clearGuestError(state) {
      state.error = null;
      state.postsError = null;
      state.singlePostError = null;
    },

    clearSinglePost(state) {
      state.singlePost = null;
      state.singlePostError = null;
      state.singlePostLoading = false;
    },

    clearSearchResults(state) {
      state.searchResults = [];
      state.searchTotal = 0;
      state.searchQuery = "";
      state.searchLoading = false;
    },

    setViewTracked(state, action) {
      state.viewTracked = action.payload;
    },

    // Action to handle localStorage operations from components
    handleGuestIdStorage(state, action) {
      const { guestId, operation } = action.payload;

      if (operation === "store" && guestId) {
        const success = safeLocalStorage.setItem("guestId", guestId);
        if (!success && process.env.NODE_ENV === "development") {
          console.warn("Failed to store guestId in localStorage");
        }
      }
    },

    resetLoadingStates(state) {
      state.loading = false;
      state.postsLoading = false;
      state.singlePostLoading = false;
      state.viewTrackingLoading = false;
      state.visitTrackingLoading = false;
      state.searchLoading = false;
    },
  },

  extraReducers: (builder) => {
    builder
      // fetchPublicPosts
      .addCase(fetchPublicPosts.pending, (state) => {
        state.postsLoading = true;
        state.loading = true;
        state.postsError = null;
        state.error = null;
      })
      .addCase(fetchPublicPosts.fulfilled, (state, action) => {
        state.postsLoading = false;
        state.loading = false;
        state.posts = action.payload.posts;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.hasMore = action.payload.hasMore;
        state.lastFetched = action.payload.lastFetched;
        state.lastPostsFetch = new Date().toISOString();
      })
      .addCase(fetchPublicPosts.rejected, (state, action) => {
        state.postsLoading = false;
        state.loading = false;
        state.postsError = action.payload?.message || "Failed to fetch posts";
        state.error = action.payload?.message || "Failed to fetch posts";

        if (process.env.NODE_ENV === "development") {
          console.error("[fetchPublicPosts.rejected]", action.payload);
        }
      })

      // fetchPublicPostBySlug
      .addCase(fetchPublicPostBySlug.pending, (state) => {
        state.singlePostLoading = true;
        state.loading = true;
        state.singlePostError = null;
        state.error = null;
        state.singlePost = null;
      })
      .addCase(fetchPublicPostBySlug.fulfilled, (state, action) => {
        state.singlePostLoading = false;
        state.loading = false;
        state.singlePost = action.payload;
      })
      .addCase(fetchPublicPostBySlug.rejected, (state, action) => {
        state.singlePostLoading = false;
        state.loading = false;
        state.singlePostError = action.payload?.message || "Post not found";
        state.error = action.payload?.message || "Post not found";

        if (process.env.NODE_ENV === "development") {
          console.error("[fetchPublicPostBySlug.rejected]", action.payload);
        }
      })

      // trackGuestView
      .addCase(trackGuestView.pending, (state) => {
        state.viewTrackingLoading = true;
      })
      .addCase(trackGuestView.fulfilled, (state, action) => {
        state.viewTrackingLoading = false;
        state.viewTracked = true;
      })
      .addCase(trackGuestView.rejected, (state, action) => {
        state.viewTrackingLoading = false;
        // Don't set global error for view tracking failures
        if (process.env.NODE_ENV === "development") {
          console.error("[trackGuestView.rejected]", action.payload);
        }
      })

      // searchPublicPosts
      .addCase(searchPublicPosts.pending, (state) => {
        state.searchLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPublicPosts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.loading = false;
        state.searchResults = action.payload.posts;
        state.searchTotal = action.payload.total;
        state.searchQuery = action.payload.searchQuery;
        state.page = action.payload.page;
        state.hasMore = action.payload.hasMore;
        state.lastSearchFetch = new Date().toISOString();

        // Also update main posts if it's a search replacing main view
        state.posts = action.payload.posts;
        state.total = action.payload.total;
      })
      .addCase(searchPublicPosts.rejected, (state, action) => {
        state.searchLoading = false;
        state.loading = false;
        state.error = action.payload?.message || "Search failed";

        if (process.env.NODE_ENV === "development") {
          console.error("[searchPublicPosts.rejected]", action.payload);
        }
      })

      // trackGuestVisit
      .addCase(trackGuestVisit.pending, (state) => {
        state.visitTrackingLoading = true;
      })
      .addCase(trackGuestVisit.fulfilled, (state, action) => {
        state.visitTrackingLoading = false;
        state.lastTrackedGuest = action.payload.guest;
      })
      .addCase(trackGuestVisit.rejected, (state, action) => {
        state.visitTrackingLoading = false;
        // Don't set global error for visit tracking failures
        if (process.env.NODE_ENV === "development") {
          console.error("[trackGuestVisit.rejected]", action.payload);
        }
      });
  },
});

export const {
  clearGuestState,
  clearGuestError,
  clearSinglePost,
  clearSearchResults,
  setViewTracked,
  handleGuestIdStorage,
  resetLoadingStates,
} = guestSlice.actions;

export default guestSlice.reducer;
