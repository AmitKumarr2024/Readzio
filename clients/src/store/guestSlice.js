// guestSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const initialState = {
  posts: [],
  singlePost: null,
  loading: false,
  error: null,
  viewTracked: false,
};

// 🔹 Fetch Public Posts
export const fetchPublicPosts = createAsyncThunk(
  "guest/fetchPublicPosts",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    console.log("[fetchPublicPosts] Called with page:", page, "limit:", limit);
    try {
      const res = await axiosInstance.get("/public/posts", {
        params: { page, limit },
      });
      console.log("[fetchPublicPosts] Raw API response:", res.data);

      const posts = res.data.posts.map((post, idx) => {
        console.log(`[fetchPublicPosts] Mapping post #${idx}:`, post);
        return {
          ...post,
          blocks: Array.isArray(post.blocks) ? post.blocks : [],
        };
      });

      console.log("[fetchPublicPosts] Final mapped posts:", posts);
      return { posts, total: res.data.total, page: res.data.page };
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
    // console.log("[fetchPublicPostBySlug] Called with slug:", slug);
    try {
      const normalizedSlug = slug.toLowerCase();
      // console.log("[fetchPublicPostBySlug] Normalized slug:", normalizedSlug);

      const res = await axiosInstance.get(`/public/post/${normalizedSlug}`);
      // console.log("[fetchPublicPostBySlug] Raw API response:", res.data);

      const post = {
        ...res.data.post,
        blocks: Array.isArray(res.data.post.blocks) ? res.data.post.blocks : [],
      };
      // console.log("[fetchPublicPostBySlug] Final mapped post:", post);

      return post;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Post not found";
      console.error("[guestSlice:fetchPublicPostBySlug] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Track Guest View
export const trackGuestView = createAsyncThunk(
  "guest/trackGuestView",
  async (slug, { rejectWithValue }) => {
    console.log("[trackGuestView] Called with slug:", slug);
    try {
      const res = await axiosInstance.post(`/public/post/${slug}/view`);
      console.log("[trackGuestView] API Response:", res.data);
      return res.data.message;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to track view";
      console.error("[guestSlice:trackGuestView] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Search Public Posts
export const searchPublicPosts = createAsyncThunk(
  "guest/searchPublicPosts",
  async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
    console.log(
      "[searchPublicPosts] Called with query:",
      query,
      "page:",
      page,
      "limit:",
      limit
    );
    try {
      const res = await axiosInstance.get("/public/search-posts", {
        params: { query, page, limit },
      });
      console.log("[searchPublicPosts] Raw API response:", res.data);

      const posts = res.data.posts.map((post, idx) => {
        console.log(`[searchPublicPosts] Mapping post #${idx}:`, post);
        return {
          ...post,
          blocks: Array.isArray(post.blocks) ? post.blocks : [],
        };
      });

      console.log("[searchPublicPosts] Final mapped posts:", posts);
      return { posts, total: res.data.total, page: res.data.page };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to search public posts";
      console.error("[guestSlice:searchPublicPosts] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Track Guest Visit
export const trackGuestVisit = createAsyncThunk(
  "guest/trackGuestVisit",
  async (_, { rejectWithValue }) => {
    console.log("[trackGuestVisit] Called");
    try {
      const res = await axiosInstance.post("/public/guest/visit");
      console.log("[trackGuestVisit] API Response:", res.data);

      if (res.data.guest?.guestId) {
        localStorage.setItem("guestId", res.data.guest.guestId);
        console.log(
          "[trackGuestVisit] guestId stored in localStorage:",
          res.data.guest.guestId
        );
      }
      return res.data.guest;
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
      console.log("[clearGuestState] Resetting guest state");
      state.posts = [];
      state.singlePost = null;
      state.loading = false;
      state.error = null;
      state.viewTracked = false;
    },
    clearGuestError(state) {
      console.log("[clearGuestError] Clearing guest error:", state.error);
      state.error = null;
    },
    clearSinglePost: (state) => {
      state.singlePost = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPublicPosts
      .addCase(fetchPublicPosts.pending, (state) => {
        // console.log("[fetchPublicPosts.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicPosts.fulfilled, (state, action) => {
        console.log("[fetchPublicPosts.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.posts = action.payload.posts;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchPublicPosts.rejected, (state, action) => {
        console.error("[fetchPublicPosts.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // fetchPublicPostBySlug
      .addCase(fetchPublicPostBySlug.pending, (state) => {
        // console.log("[fetchPublicPostBySlug.pending]");
        state.loading = true;
        state.error = null;
        state.singlePost = null;
      })
      .addCase(fetchPublicPostBySlug.fulfilled, (state, action) => {
        // console.log(
        //   "[fetchPublicPostBySlug.fulfilled] Payload:",
        //   action.payload
        // );
        state.loading = false;
        state.singlePost = action.payload;
      })
      .addCase(fetchPublicPostBySlug.rejected, (state, action) => {
        console.error(
          "[fetchPublicPostBySlug.rejected] Error:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })

      // trackGuestView
      .addCase(trackGuestView.pending, (state) => {
        // console.log("[trackGuestView.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(trackGuestView.fulfilled, (state) => {
        // console.log("[trackGuestView.fulfilled]");
        state.loading = false;
        state.viewTracked = true;
      })
      .addCase(trackGuestView.rejected, (state, action) => {
        console.error("[trackGuestView.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // searchPublicPosts
      .addCase(searchPublicPosts.pending, (state) => {
        // console.log("[searchPublicPosts.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPublicPosts.fulfilled, (state, action) => {
        // console.log("[searchPublicPosts.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.posts = action.payload.posts;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(searchPublicPosts.rejected, (state, action) => {
        console.error("[searchPublicPosts.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // trackGuestVisit
      .addCase(trackGuestVisit.pending, (state) => {
        // console.log("[trackGuestVisit.pending]");
        state.loading = true;
      })
      .addCase(trackGuestVisit.fulfilled, (state, action) => {
        // console.log("[trackGuestVisit.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.lastTrackedGuest = action.payload;
      })
      .addCase(trackGuestVisit.rejected, (state, action) => {
        console.error("[trackGuestVisit.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearGuestState, clearGuestError, clearSinglePost } =
  guestSlice.actions;
export default guestSlice.reducer;
