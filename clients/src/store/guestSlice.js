// guestSlice.js (added logs to thunks and reducers)
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// --- Logger ---
const log = (level, message, ...optionalParams) => {
  if (process.env.NODE_ENV !== "production") {
    if (level === "error") console.error(message, ...optionalParams);
    else if (level === "warn") console.warn(message, ...optionalParams);
    else console.log(message, ...optionalParams);
  }
};

// --- Error handler ---
const handleAxiosError = (err, thunkAPI, defaultMsg) => {
  // console.log("handleAxiosError: Processing error", err);
  if (err.code === "ECONNABORTED") {
    return thunkAPI.rejectWithValue("Request timed out. Please try again.");
  }
  if (
    err.message &&
    (err.message.includes("Network Error") || err.message.includes("CORS"))
  ) {
    return thunkAPI.rejectWithValue(
      "Network error. Please check your connection."
    );
  }

  const errMsg = err.response?.data?.message || defaultMsg;

  log(
    "error",
    `[guestSlice:${thunkAPI.action?.type || "unknown"}] Error:`,
    errMsg,
    err.response?.status
  );

  return thunkAPI.rejectWithValue(errMsg);
};

// --- Initial State ---
const initialState = {
  posts: [],
  totalPosts: 0,
  currentPage: 1,
  singlePost: null,
  loading: false,
  error: null,
  isEmpty: false,
  viewTracked: false,
  lastTrackedGuest: null,
  hasInitialized: false,
  lastFetchedPage: null,
};

// --- Async Thunks ---

export const fetchPublicPosts = createAsyncThunk(
  "guest/fetchPublicPosts",
  async ({ page = 1, limit = 20, signal } = {}, thunkAPI) => {
    // console.log("fetchPublicPosts thunk: Starting for page", page, limit);
    try {
      const res = await axiosInstance.get("/public/posts", {
        params: { page, limit },
        timeout: 15000,
        signal,
      });
      // console.log("fetchPublicPosts thunk: Response received", res.data);

      const receivedPosts = res.data?.posts || [];
      const posts = receivedPosts.map((post) => ({
        ...post,
        blocks: Array.isArray(post.blocks) ? post.blocks : [],
      }));

      const total = res.data?.total ?? posts.length;

      // console.log(
      //   "fetchPublicPosts thunk: Processed",
      //   posts.length,
      //   "posts, total:",
      //   total
      // );
      return {
        posts,
        total,
        page: res.data?.page ?? page,
        isEmpty: posts.length === 0 && page === 1,
      };
    } catch (err) {
      // console.log("fetchPublicPosts thunk: Error", err);
      return handleAxiosError(err, thunkAPI, "Failed to fetch public posts");
    }
  },
  {
    condition: ({ page }, { getState }) => {
      const { guest } = getState();
      // console.log("fetchPublicPosts condition: Checking", {
      //   page,
      //   loading: guest.loading,
      //   lastFetched: guest.lastFetchedPage,
      //   initialized: guest.hasInitialized,
      // });
      // Prevent repeated calls for the same page
      if (guest.loading) return false;
      if (guest.lastFetchedPage === page && guest.hasInitialized) return false;
      return true;
    },
  }
);

export const fetchPublicPostBySlug = createAsyncThunk(
  "guest/fetchPublicPostBySlug",
  async (slug, thunkAPI) => {
    // console.log("fetchPublicPostBySlug thunk: Starting for slug", slug);
    try {
      if (!slug) return thunkAPI.rejectWithValue("Post slug is required.");

      const normalizedSlug = String(slug).toLowerCase();
      const res = await axiosInstance.get(`/public/post/${normalizedSlug}`, {
        timeout: 10000,
      });
      // console.log("fetchPublicPostBySlug thunk: Response", res.data);

      const post = res.data?.post;
      if (!post) return thunkAPI.rejectWithValue("Post not found");

      return { ...post, blocks: Array.isArray(post.blocks) ? post.blocks : [] };
    } catch (err) {
      // console.log("fetchPublicPostBySlug thunk: Error", err);
      return handleAxiosError(
        err,
        thunkAPI,
        "Post not found or failed to load"
      );
    }
  }
);

export const trackGuestView = createAsyncThunk(
  "guest/trackGuestView",
  async (slug, thunkAPI) => {
    // console.log("trackGuestView thunk: Starting for slug", slug);
    try {
      if (!slug)
        return thunkAPI.rejectWithValue("Slug is required for view tracking.");
      await axiosInstance.post(
        `/public/post/${slug}/view`,
        {},
        { timeout: 5000 }
      );
      // console.log("trackGuestView thunk: Success");
      return true;
    } catch (err) {
      // console.log("trackGuestView thunk: Error", err);
      log("warn", `[guestSlice:trackGuestView] Failed: ${err.message}`);
      return thunkAPI.rejectWithValue(false);
    }
  }
);

export const searchPublicPosts = createAsyncThunk(
  "guest/searchPublicPosts",
  async ({ query, page = 1, limit = 20 }, thunkAPI) => {
    // console.log("searchPublicPosts thunk: Starting", { query, page, limit });
    try {
      if (!query) return thunkAPI.rejectWithValue("Search query is required.");

      const res = await axiosInstance.get("/public/search-posts", {
        params: { query, page, limit },
        timeout: 10000,
      });
      // console.log("searchPublicPosts thunk: Response", res.data);

      const receivedPosts = res.data?.posts || [];
      const posts = receivedPosts.map((post) => ({
        ...post,
        blocks: Array.isArray(post.blocks) ? post.blocks : [],
      }));

      const total = res.data?.total ?? posts.length;

      return {
        posts,
        total,
        page: res.data?.page ?? page,
        isEmpty: posts.length === 0 && page === 1,
      };
    } catch (err) {
      // console.log("searchPublicPosts thunk: Error", err);
      return handleAxiosError(err, thunkAPI, "Failed to search posts");
    }
  }
);

export const trackGuestVisit = createAsyncThunk(
  "guest/trackGuestVisit",
  async (_, thunkAPI) => {
    // console.log("trackGuestVisit thunk: Starting");
    try {
      const res = await axiosInstance.post(
        "/public/guest/visit",
        {},
        { timeout: 5000 }
      );
      // console.log("trackGuestVisit thunk: Response", res.data);
      const guestData = res.data.guest;
      if (guestData?.guestId) {
        localStorage.setItem("guestId", guestData.guestId);
      }
      return guestData;
    } catch (err) {
      // console.log("trackGuestVisit thunk: Error", err);
      log("warn", `[guestSlice:trackGuestVisit] ${err.message}`);
      return null;
    }
  }
);

// --- Slice ---
const guestSlice = createSlice({
  name: "guest",
  initialState,
  reducers: {
    clearGuestState(state) {
      // console.log("clearGuestState reducer: Clearing state");
      Object.assign(state, initialState);
    },
    clearGuestError(state) {
      // console.log("clearGuestError reducer: Clearing error");
      state.error = null;
    },
    clearSinglePost(state) {
      // console.log("clearSinglePost reducer: Clearing single post");
      state.singlePost = null;
      state.viewTracked = false;
    },
    resetGuestInitialization(state) {
      // console.log("resetGuestInitialization reducer: Resetting init");
      state.hasInitialized = false;
      state.isEmpty = false;
      state.error = null;
      state.lastFetchedPage = null;
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      // console.log("handlePending reducer: Setting loading=true");
      state.loading = true;
      state.error = null;
    };

    const handleListFulfilled = (state, action) => {
      // console.log("handleListFulfilled reducer: Fulfilled", {
      //   page: action.payload.page,
      //   postsAdded: action.payload.posts.length,
      // });
      state.loading = false;
      state.lastFetchedPage = action.payload.page;

      if (action.payload.page === 1) {
        state.posts = action.payload.posts;
      } else {
        const existingIds = new Set(state.posts.map((p) => p._id));
        const newPosts = action.payload.posts.filter(
          (p) => !existingIds.has(p._id)
        );
        state.posts = [...state.posts, ...newPosts];
      }

      state.totalPosts = action.payload.total;
      state.currentPage = action.payload.page;
      state.isEmpty = action.payload.isEmpty;
      state.error = null;
      state.hasInitialized = true;
    };

    const handleRejected = (state, action, defaultMsg) => {
      // console.log(
      //   "handleRejected reducer: Rejected",
      //   action.payload || defaultMsg
      // );
      state.loading = false;
      state.error = action.payload || defaultMsg;
      state.hasInitialized = true;
    };

    builder
      .addCase(fetchPublicPosts.pending, handlePending)
      .addCase(fetchPublicPosts.fulfilled, handleListFulfilled)
      .addCase(fetchPublicPosts.rejected, (state, action) =>
        handleRejected(state, action, "Failed to load public posts")
      )

      .addCase(fetchPublicPostBySlug.pending, (state) => {
        handlePending(state);
        state.singlePost = null;
      })
      .addCase(fetchPublicPostBySlug.fulfilled, (state, action) => {
        // console.log("fetchPublicPostBySlug fulfilled reducer");
        state.loading = false;
        state.singlePost = action.payload;
        state.error = null;
      })
      .addCase(fetchPublicPostBySlug.rejected, (state, action) =>
        handleRejected(state, action, "Post not found")
      )

      .addCase(searchPublicPosts.pending, handlePending)
      .addCase(searchPublicPosts.fulfilled, handleListFulfilled)
      .addCase(searchPublicPosts.rejected, (state, action) =>
        handleRejected(state, action, "Search failed")
      )

      .addCase(trackGuestView.fulfilled, (state) => {
        // console.log("trackGuestView fulfilled reducer");
        state.viewTracked = true;
      })
      .addCase(trackGuestVisit.fulfilled, (state, action) => {
        // console.log("trackGuestVisit fulfilled reducer");
        state.lastTrackedGuest = action.payload || null;
      });
  },
});

export const {
  clearGuestState,
  clearGuestError,
  clearSinglePost,
  resetGuestInitialization,
} = guestSlice.actions;

export default guestSlice.reducer;
