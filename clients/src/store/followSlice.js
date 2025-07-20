
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const followUser = createAsyncThunk(
  "follow/followUser",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/follow/${targetUserId}`);
      return { targetUserId, message: response.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const unfollowUser = createAsyncThunk(
  "follow/unfollowUser",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/follow/unfollow/${targetUserId}`);
      return { targetUserId, message: response.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowers = createAsyncThunk(
  "follow/fetchFollowers",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/follow/followers?page=${page}&limit=${limit}`);
      return { ...response.data, page };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowing = createAsyncThunk(
  "follow/fetchFollowing",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/follow/following?page=${page}&limit=${limit}`);
      return { ...response.data, page };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const getFollowStatus = createAsyncThunk(
  "follow/getFollowStatus",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/follow/status/${targetUserId}`);
      return { targetUserId, isFollowing: response.data.isFollowing };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowerLocations = createAsyncThunk(
  "follow/fetchFollowerLocations",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/follow/follower-locations?page=${page}&limit=${limit}`, {
        withCredentials: true,
      });
      return { locations: response.data.list, page, total: response.data.total, totalPages: response.data.totalPages };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const followSlice = createSlice({
  name: "follow",
  initialState: {
    userId: null,
    followers: {
      list: [],
      count: 0,
      page: 1,
      totalPages: 1,
      loading: false,
      error: null,
    },
    following: {
      list: [],
      count: 0,
      page: 1,
      totalPages: 1,
      loading: false,
      error: null,
    },
    followerLocations: {
      list: [],
      count: 0,
      page: 1,
      totalPages: 1,
      loading: false,
      error: null,
    },
    loading: false,
    error: null,
  },
  reducers: {
    setUserId: (state, action) => {
      state.userId = action.payload;
    },
    clearErrors: (state) => {
      state.error = null;
      state.followers.error = null;
      state.following.error = null;
      state.followerLocations.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(followUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(followUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        const id = payload.targetUserId;
        if (!state.following.list.some((u) => u._id === id)) {
          state.following.list.unshift({ _id: id });
          state.following.count++;
        }
      })
      .addCase(followUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(unfollowUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unfollowUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        const id = payload.targetUserId;
        state.following.list = state.following.list.filter((u) => u._id !== id);
        if (state.following.count > 0) state.following.count--;
      })
      .addCase(unfollowUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(fetchFollowers.pending, (state) => {
        state.followers.loading = true;
        state.followers.error = null;
      })
      .addCase(fetchFollowers.fulfilled, (state, { payload }) => {
        state.followers.loading = false;
        state.followers.list = payload.list || payload.followers || [];
        state.followers.count = payload.count ?? state.followers.list.length;
        state.followers.page = payload.page;
        state.followers.totalPages = payload.totalPages ?? Math.ceil(payload.count / payload.limit);
      })
      .addCase(fetchFollowers.rejected, (state, { payload }) => {
        state.followers.loading = false;
        state.followers.error = payload;
      })
      .addCase(fetchFollowing.pending, (state) => {
        state.following.loading = true;
        state.following.error = null;
      })
      .addCase(fetchFollowing.fulfilled, (state, { payload }) => {
        state.following.loading = false;
        state.following.list = payload.list || payload.following || [];
        state.following.count = payload.count ?? state.following.list.length;
        state.following.page = payload.page;
        state.following.totalPages = payload.totalPages ?? Math.ceil(payload.count / payload.limit);
      })
      .addCase(fetchFollowing.rejected, (state, { payload }) => {
        state.following.loading = false;
        state.following.error = payload;
      })
      .addCase(getFollowStatus.fulfilled, (state, { payload }) => {
        const { targetUserId, isFollowing } = payload;
        const exists = state.following.list.some((u) => u._id === targetUserId);
        if (isFollowing && !exists) {
          state.following.list.push({ _id: targetUserId });
          state.following.count++;
        } else if (!isFollowing && exists) {
          state.following.list = state.following.list.filter((u) => u._id !== targetUserId);
          if (state.following.count > 0) state.following.count--;
        }
      })
      .addCase(fetchFollowerLocations.pending, (state) => {
        state.followerLocations.loading = true;
        state.followerLocations.error = null;
      })
      .addCase(fetchFollowerLocations.fulfilled, (state, { payload }) => {
        state.followerLocations.loading = false;
        state.followerLocations.list = payload.locations || [];
        state.followerLocations.count = payload.total ?? payload.locations.length;
        state.followerLocations.page = payload.page;
        state.followerLocations.totalPages = payload.totalPages;
      })
      .addCase(fetchFollowerLocations.rejected, (state, { payload }) => {
        state.followerLocations.loading = false;
        state.followerLocations.error = payload;
      });
  },
});

export const selectFollowState = (state) => state.follow;
export const selectFollowers = (state) => state.follow.followers;
export const selectFollowing = (state) => state.follow.following;
export const selectUserId = (state) => state.follow.userId;
export const selectFollowerLocations = (state) => state.follow.followerLocations;

export const { setUserId, clearErrors } = followSlice.actions;
export default followSlice.reducer;