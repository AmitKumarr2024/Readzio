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
  lastFetchedPage: null, // prevents infinite refetch
};

// --- Async Thunks ---

export const fetchPublicPosts = createAsyncThunk(
  "guest/fetchPublicPosts",
  async ({ page = 1, limit = 20 } = {}, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/public/posts", {
        params: { page, limit },
        timeout: 15000,
      });

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
      return handleAxiosError(err, thunkAPI, "Failed to fetch public posts");
    }
  },
  {
    condition: ({ page }, { getState }) => {
      const { guest } = getState();
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
    try {
      if (!slug) return thunkAPI.rejectWithValue("Post slug is required.");

      const normalizedSlug = String(slug).toLowerCase();
      const res = await axiosInstance.get(`/public/post/${normalizedSlug}`, {
        timeout: 10000,
      });

      const post = res.data?.post;
      if (!post) return thunkAPI.rejectWithValue("Post not found");

      return { ...post, blocks: Array.isArray(post.blocks) ? post.blocks : [] };
    } catch (err) {
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
    try {
      if (!slug)
        return thunkAPI.rejectWithValue("Slug is required for view tracking.");
      await axiosInstance.post(
        `/public/post/${slug}/view`,
        {},
        { timeout: 5000 }
      );
      return true;
    } catch (err) {
      log("warn", `[guestSlice:trackGuestView] Failed: ${err.message}`);
      return thunkAPI.rejectWithValue(false);
    }
  }
);

export const searchPublicPosts = createAsyncThunk(
  "guest/searchPublicPosts",
  async ({ query, page = 1, limit = 20 }, thunkAPI) => {
    try {
      if (!query) return thunkAPI.rejectWithValue("Search query is required.");

      const res = await axiosInstance.get("/public/search-posts", {
        params: { query, page, limit },
        timeout: 10000,
      });

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
      return handleAxiosError(err, thunkAPI, "Failed to search posts");
    }
  }
);

export const trackGuestVisit = createAsyncThunk(
  "guest/trackGuestVisit",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.post(
        "/public/guest/visit",
        {},
        { timeout: 5000 }
      );
      const guestData = res.data.guest;
      if (guestData?.guestId) {
        localStorage.setItem("guestId", guestData.guestId);
      }
      return guestData;
    } catch (err) {
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
      Object.assign(state, initialState);
    },
    clearGuestError(state) {
      state.error = null;
    },
    clearSinglePost(state) {
      state.singlePost = null;
      state.viewTracked = false;
    },
    resetGuestInitialization(state) {
      state.hasInitialized = false;
      state.isEmpty = false;
      state.error = null;
      state.lastFetchedPage = null;
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.loading = true;
      state.error = null;
    };

    const handleListFulfilled = (state, action) => {
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
        state.viewTracked = true;
      })
      .addCase(trackGuestVisit.fulfilled, (state, action) => {
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
