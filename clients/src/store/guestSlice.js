// guestSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const initialState = {
  posts: [],
  singlePost: null,
  loading: false,
  error: null,
  viewTracked: false,
  total: 0,
  page: 1,
  hasMore: true,
};

// 🔹 Fetch Public Posts
export const fetchPublicPosts = createAsyncThunk(
  "guest/fetchPublicPosts",
  async ({ page = 1, limit = 0 } = {}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/public/posts", {
        params: { page, limit },
      });

      const posts = (res.data?.posts || []).map((post) => ({
        ...post,
        blocks: Array.isArray(post.blocks) ? post.blocks : [],
      }));

      return {
        posts,
        total: res.data?.total ?? posts.length,
        page: res.data?.page ?? 1,
        lastFetched: res.data?.lastFetched ?? null,
        limit, // 👈 keep track of what we requested
      };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch public posts";
      console.error("[guestSlice:fetchPublicPosts] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);
// 🔹 Fetch Public Post by Slug
export const fetchPublicPostBySlug = createAsyncThunk(
  "guest/fetchPublicPostBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const normalizedSlug = slug.toLowerCase();
      const res = await axiosInstance.get(`/public/post/${normalizedSlug}`);
      const post = {
        ...post,
        blocks: Array.isArray(res.data.post.blocks) ? res.data.post.blocks : [],
      };
      return post;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Post not found";
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Track Guest View
export const trackGuestView = createAsyncThunk(
  "guest/trackGuestView",
  async (slug, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/public/post/${slug}/view`);
      return res.data.message;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to track view";
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Search Public Posts
export const searchPublicPosts = createAsyncThunk(
  "guest/searchPublicPosts",
  async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/public/search-posts", {
        params: { query, page, limit },
      });
      const posts = res.data.posts.map((post) => ({
        ...post,
        blocks: Array.isArray(post.blocks) ? post.blocks : [],
      }));
      return { posts, total: res.data.total, page: res.data.page };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to search public posts";
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Track Guest Visit
export const trackGuestVisit = createAsyncThunk(
  "guest/trackGuestVisit",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/public/guest/visit");
      if (res.data.guest?.guestId) {
        localStorage.setItem("guestId", res.data.guest.guestId);
      }
      return res.data.guest;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to track guest visit";
      return rejectWithValue(errMsg);
    }
  }
);

const guestSlice = createSlice({
  name: "guest",
  initialState,
  reducers: {
    clearGuestState(state) {
      state.posts = [];
      state.singlePost = null;
      state.loading = false;
      state.error = null;
      state.viewTracked = false;
      state.total = 0;
      state.page = 1;
      state.hasMore = true;
    },
    clearGuestError(state) {
      state.error = null;
    },
    clearSinglePost(state) {
      state.singlePost = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPublicPosts
      .addCase(fetchPublicPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.total = action.payload.total;
        state.page = action.payload.page;

        // 🟢 If limit=0 → replace with ALL posts
        if (action.payload.limit === 0) {
          state.posts = action.payload.posts;
        } else {
          // 🟢 If page=1 → reset, else append
          if (action.payload.page === 1) {
            state.posts = action.payload.posts;
          } else {
            state.posts = [...state.posts, ...action.payload.posts];
          }
        }
      })
      .addCase(fetchPublicPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchPublicPostBySlug
      .addCase(fetchPublicPostBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.singlePost = null;
      })
      .addCase(fetchPublicPostBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.singlePost = action.payload;
      })
      .addCase(fetchPublicPostBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // trackGuestView
      .addCase(trackGuestView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(trackGuestView.fulfilled, (state) => {
        state.loading = false;
        state.viewTracked = true;
      })
      .addCase(trackGuestView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // searchPublicPosts
      .addCase(searchPublicPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPublicPosts.fulfilled, (state, action) => {
        state.loading = false;
        const newPosts = action.payload.posts.filter(
          (newPost) => !state.posts.some((post) => post._id === newPost._id)
        );
        state.posts =
          action.payload.page === 1 ? newPosts : [...state.posts, ...newPosts];
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.hasMore = state.posts.length < action.payload.total;
      })
      .addCase(searchPublicPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // trackGuestVisit
      .addCase(trackGuestVisit.pending, (state) => {
        state.loading = true;
      })
      .addCase(trackGuestVisit.fulfilled, (state, action) => {
        state.loading = false;
        state.lastTrackedGuest = action.payload;
      })
      .addCase(trackGuestVisit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearGuestState, clearGuestError, clearSinglePost } =
  guestSlice.actions;
export default guestSlice.reducer;
