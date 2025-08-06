import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const initialState = {
  posts: [],
  singlePost: null,
  loading: false,
  error: null,
  viewTracked: false,
};

export const fetchPublicPosts = createAsyncThunk(
  "guest/fetchPublicPosts",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      // console.log("[guestSlice:fetchPublicPosts] Fetching posts:", {
      //   page,
      //   limit,
      // });
      const res = await axiosInstance.get("/public/posts", {
        params: { page, limit },
      });
      const posts = res.data.posts.map((post) => ({
        ...post,
        blocks: Array.isArray(post.blocks) ? post.blocks : [],
      }));
      // console.log("[guestSlice:fetchPublicPosts] Fetched posts:", posts.length);
      return { posts, total: res.data.total, page: res.data.page };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch public posts";
      console.error("[guestSlice:fetchPublicPosts] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const fetchPublicPostBySlug = createAsyncThunk(
  "guest/fetchPublicPostBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      // console.log("[guestSlice:fetchPublicPostBySlug] Fetching post:", slug);
      const res = await axiosInstance.get(`/public/post/${slug}`);
      const post = {
        ...res.data.post,
        blocks: Array.isArray(res.data.post.blocks) ? res.data.post.blocks : [],
      };
      // console.log(
      //   "[guestSlice:fetchPublicPostBySlug] Fetched post:",
      //   post._id,
      //   "blocks:",
      //   post.blocks.length
      // );
      return post;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Post not found";
      console.error("[guestSlice:fetchPublicPostBySlug] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const trackGuestView = createAsyncThunk(
  "guest/trackGuestView",
  async (slug, { rejectWithValue }) => {
    try {
      // console.log("[guestSlice:trackGuestView] Tracking view:", slug);
      const res = await axiosInstance.post(`/public/post/${slug}/view`);
      // console.log(
      //   "[guestSlice:trackGuestView] View tracked:",
      //   res.data.message
      // );
      return res.data.message;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to track view";
      console.error("[guestSlice:trackGuestView] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const searchPublicPosts = createAsyncThunk(
  "guest/searchPublicPosts",
  async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      // console.log("[guestSlice:searchPublicPosts] Searching posts:", {
      //   query,
      //   page,
      //   limit,
      // });
      const res = await axiosInstance.get("/public/search-posts", {
        params: { query, page, limit },
      });
      const posts = res.data.posts.map((post) => ({
        ...post,
        blocks: Array.isArray(post.blocks) ? post.blocks : [],
      }));
      // console.log(
      //   "[guestSlice:searchPublicPosts] Fetched posts:",
      //   posts.length
      // );
      return { posts, total: res.data.total, page: res.data.page };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to search public posts";
      console.error("[guestSlice:searchPublicPosts] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const trackGuestVisit = createAsyncThunk(
  "guest/trackGuestVisit",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("[guestSlice:trackGuestVisit] Tracking guest visit");
      const res = await axiosInstance.post("/public/guest/visit");

      // console.log("[guestSlice:trackGuestVisit] Tracked:", res.data.message);

      // 🟢 Store correct guestId locally
      if (res.data.guest?.guestId) {
        localStorage.setItem("guestId", res.data.guest.guestId);
      }

      return res.data.guest; // <-- return full guest object
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to track guest visit";
      console.error("[guestSlice:trackGuestVisit] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

const guestSlice = createSlice({
  name: "guest",
  initialState,
  reducers: {
    clearGuestState(state) {
      // console.log("[guestSlice:clearGuestState]");
      state.posts = [];
      state.singlePost = null;
      state.loading = false;
      state.error = null;
      state.viewTracked = false;
    },
    clearGuestError(state) {
      // console.log("[guestSlice:clearGuestError]");
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicPosts.pending, (state) => {
        // console.log("[guestSlice:fetchPublicPosts] Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicPosts.fulfilled, (state, action) => {
        // console.log("[guestSlice:fetchPublicPosts] Fulfilled");
        state.loading = false;
        state.posts = action.payload.posts;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchPublicPosts.rejected, (state, action) => {
        console.error(
          "[guestSlice:fetchPublicPosts] Rejected:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPublicPostBySlug.pending, (state) => {
        // console.log("[guestSlice:fetchPublicPostBySlug] Pending");
        state.loading = true;
        state.error = null;
        state.singlePost = null;
      })
      .addCase(fetchPublicPostBySlug.fulfilled, (state, action) => {
        // console.log("[guestSlice:fetchPublicPostBySlug] Fulfilled");
        state.loading = false;
        state.singlePost = action.payload;
      })
      .addCase(fetchPublicPostBySlug.rejected, (state, action) => {
        console.error(
          "[guestSlice:fetchPublicPostBySlug] Rejected:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(trackGuestView.pending, (state) => {
        // console.log("[guestSlice:trackGuestView] Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(trackGuestView.fulfilled, (state) => {
        // console.log("[guestSlice:trackGuestView] Fulfilled");
        state.loading = false;
        state.viewTracked = true;
      })
      .addCase(trackGuestView.rejected, (state, action) => {
        console.error("[guestSlice:trackGuestView] Rejected:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(searchPublicPosts.pending, (state) => {
        // console.log("[guestSlice:searchPublicPosts] Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPublicPosts.fulfilled, (state, action) => {
        // console.log("[guestSlice:searchPublicPosts] Fulfilled");
        state.loading = false;
        state.posts = action.payload.posts;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(searchPublicPosts.rejected, (state, action) => {
        console.error(
          "[guestSlice:searchPublicPosts] Rejected:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(trackGuestVisit.pending, (state) => {
        // console.log("[guestSlice:trackGuestVisit] Pending");
        state.loading = true;
      })
      .addCase(trackGuestVisit.fulfilled, (state, action) => {
        state.loading = false;
        state.lastTrackedGuest = action.payload;
      })

      .addCase(trackGuestVisit.rejected, (state, action) => {
        console.error("[guestSlice:trackGuestVisit] Rejected:", action.payload);
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearGuestState, clearGuestError } = guestSlice.actions;
export default guestSlice.reducer;
