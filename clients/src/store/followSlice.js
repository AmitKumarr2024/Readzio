import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const followUser = createAsyncThunk(
  "follow/followUser",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/follow/${targetUserId}`);
      return {
        targetUserId,
        message: response.data.message,
        isFollowing: response.data.data.isFollowing,
        followingCount: response.data.data.followingCount,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const unfollowUser = createAsyncThunk(
  "follow/unfollowUser",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/follow/unfollow/${targetUserId}`
      );
      return {
        targetUserId,
        message: response.data.message,
        isFollowing: response.data.data.isFollowing,
        followingCount: response.data.data.followingCount,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowers = createAsyncThunk(
  "follow/fetchFollowers",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/follow/followers?page=${page}&limit=${limit}`
      );
      return {
        list: response.data.list,
        count: response.data.count,
        total: response.data.total,
        page: response.data.page,
        totalPages: response.data.totalPages,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowing = createAsyncThunk(
  "follow/fetchFollowing",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/follow/following?page=${page}&limit=${limit}`
      );
      return {
        list: response.data.list,
        count: response.data.count,
        total: response.data.total,
        page: response.data.page,
        totalPages: response.data.totalPages,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const getFollowStatus = createAsyncThunk(
  "follow/getFollowStatus",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/follow/status/${targetUserId}`
      );
      return {
        targetUserId,
        isFollowing: response.data.isFollowing,
        source: response.data.source,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowerLocations = createAsyncThunk(
  "follow/fetchFollowerLocations",
  async ({ page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/follow/follower-locations?page=${page}&limit=${limit}`,
        {
          withCredentials: true,
        }
      );
      return {
        list: response.data.list,
        page: response.data.page,
        total: response.data.total,
        totalPages: response.data.totalPages,
      };
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
      total: 0, // Added total field
      page: 1,
      totalPages: 1,
      loading: false,
      error: null,
    },
    following: {
      list: [],
      count: 0,
      total: 0, // Added total field
      page: 1,
      totalPages: 1,
      loading: false,
      error: null,
    },
    followerLocations: {
      list: [],
      count: 0,
      total: 0,
      page: 1,
      totalPages: 1,
      loading: false,
      error: null,
    },
    followStatus: {}, // Track follow status for multiple users
    followingCount: 0, // Track current user's following count
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
    // Reset pagination states
    resetFollowers: (state) => {
      state.followers = {
        list: [],
        count: 0,
        total: 0,
        page: 1,
        totalPages: 1,
        loading: false,
        error: null,
      };
    },
    resetFollowing: (state) => {
      state.following = {
        list: [],
        count: 0,
        total: 0,
        page: 1,
        totalPages: 1,
        loading: false,
        error: null,
      };
    },
    resetFollowerLocations: (state) => {
      state.followerLocations = {
        list: [],
        count: 0,
        total: 0,
        page: 1,
        totalPages: 1,
        loading: false,
        error: null,
      };
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
        const { targetUserId, isFollowing, followingCount } = payload;

        // Update follow status
        state.followStatus[targetUserId] = isFollowing;

        // Update following count
        if (followingCount !== undefined) {
          state.followingCount = followingCount;
        }

        // Update following list if not already present
        if (
          isFollowing &&
          !state.following.list.some((u) => u._id === targetUserId)
        ) {
          // Note: We only have the ID, not full user details
          // In a real app, you might want to fetch user details or store them differently
          state.following.list.unshift({ _id: targetUserId });
          state.following.count++;
          state.following.total++;
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
        const { targetUserId, isFollowing, followingCount } = payload;

        // Update follow status
        state.followStatus[targetUserId] = isFollowing;

        // Update following count
        if (followingCount !== undefined) {
          state.followingCount = followingCount;
        }

        // Remove from following list
        if (!isFollowing) {
          state.following.list = state.following.list.filter(
            (u) => u._id !== targetUserId
          );
          if (state.following.count > 0) state.following.count--;
          if (state.following.total > 0) state.following.total--;
        }
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
        state.followers.list = payload.list || [];
        state.followers.count = payload.count || 0;
        state.followers.total = payload.total || 0;
        state.followers.page = payload.page || 1;
        state.followers.totalPages = payload.totalPages || 1;
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
        state.following.list = payload.list || [];
        state.following.count = payload.count || 0;
        state.following.total = payload.total || 0;
        state.following.page = payload.page || 1;
        state.following.totalPages = payload.totalPages || 1;

        // Update following count from the fetched data
        state.followingCount = payload.total || 0;
      })
      .addCase(fetchFollowing.rejected, (state, { payload }) => {
        state.following.loading = false;
        state.following.error = payload;
      })
      .addCase(getFollowStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFollowStatus.fulfilled, (state, { payload }) => {
        state.loading = false;
        const { targetUserId, isFollowing, source } = payload;

        // Update follow status
        state.followStatus[targetUserId] = isFollowing;

        // Optionally store source info for debugging
        // state.followStatusSource = source;
      })
      .addCase(getFollowStatus.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(fetchFollowerLocations.pending, (state) => {
        state.followerLocations.loading = true;
        state.followerLocations.error = null;
      })
      .addCase(fetchFollowerLocations.fulfilled, (state, { payload }) => {
        state.followerLocations.loading = false;
        state.followerLocations.list = payload.list || [];
        state.followerLocations.count = payload.list?.length || 0;
        state.followerLocations.total = payload.total || 0;
        state.followerLocations.page = payload.page || 1;
        state.followerLocations.totalPages = payload.totalPages || 1;
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
export const selectFollowerLocations = (state) =>
  state.follow.followerLocations;
export const selectFollowStatus = (state) => state.follow.followStatus;
export const selectFollowingCount = (state) => state.follow.followingCount;

// Helper selector to get follow status for a specific user
export const selectIsFollowing = (targetUserId) => (state) =>
  state.follow.followStatus[targetUserId] || false;

export const {
  setUserId,
  clearErrors,
  resetFollowers,
  resetFollowing,
  resetFollowerLocations,
} = followSlice.actions;

export default followSlice.reducer;
