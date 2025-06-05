import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import axiosInstance from "../connection/axiosInstance";

// Thunks
export const subscribeToAuthor = createAsyncThunk(
  "subscribe/subscribeToAuthor",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/subscribe/author/subscribe/${authorId}`);
      return { authorId, ...response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const unsubscribeFromAuthor = createAsyncThunk(
  "subscribe/unsubscribeFromAuthor",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/subscribe/author/unsubscribe/${authorId}`);
      return { authorId, ...response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to unsubscribe");
    }
  }
);

export const fetchSubscribeStatus = createAsyncThunk(
  "subscribe/fetchSubscribeStatus",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscribe/status/${authorId}`);
      return { authorId, ...response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const followUser = createAsyncThunk(
  "subscribe/followUser",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/subscribe/follow/${targetUserId}`);
      return { targetUserId, message: response.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const unfollowUser = createAsyncThunk(
  "subscribe/unfollowUser",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/subscribe/unfollow/${targetUserId}`);
      return { targetUserId, message: response.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowers = createAsyncThunk(
  "subscribe/fetchFollowers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscribe/followers`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchFollowing = createAsyncThunk(
  "subscribe/fetchFollowing",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscribe/following`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const enableSubscriptionPlan = createAsyncThunk(
  "subscribe/enableSubscriptionPlan",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/subscribe/author/${authorId}/enable-subscription`);
      return { authorId, message: response.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// New Thunks for status fetching
export const getFollowStatus = createAsyncThunk(
  "subscribe/getFollowStatus",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscribe/follow/status/${targetUserId}`);
      return { targetUserId, isFollowing: response.data.isFollowing };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const getSubscriptionStatus = createAsyncThunk(
  "subscribe/getSubscriptionStatus",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscribe/subscription/status/${authorId}`);
      return {
        authorId,
        isSubscribed: response.data.isSubscribed,
        isSubscriptionPlanEnabled: response.data.isSubscriptionPlanEnabled,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Slice
const subscribeSlice = createSlice({
  name: "subscribe",
  initialState: {
    userId: null,
    followers: { list: [], count: 0, loading: false, error: null },
    following: { list: [], count: 0, loading: false, error: null },
    subscribedAuthors: [],
    enabledSubscriptionAuthors: [],
    subscribeStatus: {},
    loading: false,
    error: null,
  },
  reducers: {
    setSubscribeStatus: (state, action) => {
      const { authorId, isSubscribed, isSubscriptionPlanEnabled } = action.payload;
      state.subscribeStatus[authorId] = { isSubscribed, isSubscriptionPlanEnabled };
    },
    setUserId: (state, action) => {
      state.userId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Subscribe
      .addCase(subscribeToAuthor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(subscribeToAuthor.fulfilled, (state, action) => {
        state.loading = false;
        const { authorId, subscribedAuthors } = action.payload;
        if (subscribedAuthors) {
          state.subscribedAuthors = subscribedAuthors.map(id => id.toString());
        } else if (!state.subscribedAuthors.includes(authorId)) {
          state.subscribedAuthors.push(authorId);
        }
        state.subscribeStatus[authorId] = {
          isSubscribed: true,
          isSubscriptionPlanEnabled: state.subscribeStatus[authorId]?.isSubscriptionPlanEnabled || false,
        };
      })
      .addCase(subscribeToAuthor.rejected, (state, action) => {
        state.loading = false;
        const authorId = action.meta.arg;
        if (action.payload === "Already subscribed to this author") {
          state.subscribeStatus[authorId] = {
            isSubscribed: true,
            isSubscriptionPlanEnabled: state.subscribeStatus[authorId]?.isSubscriptionPlanEnabled || false,
          };
        } else {
          state.error = action.payload;
        }
      })

      // Unsubscribe
      .addCase(unsubscribeFromAuthor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unsubscribeFromAuthor.fulfilled, (state, action) => {
        state.loading = false;
        const { authorId } = action.payload;
        state.subscribedAuthors = state.subscribedAuthors.filter(id => id !== authorId);
        state.subscribeStatus[authorId] = {
          isSubscribed: false,
          isSubscriptionPlanEnabled: state.subscribeStatus[authorId]?.isSubscriptionPlanEnabled || false,
        };
      })
      .addCase(unsubscribeFromAuthor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch status
      .addCase(fetchSubscribeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscribeStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { authorId, isSubscribed, isSubscriptionPlanEnabled } = action.payload;
        state.subscribeStatus[authorId] = { isSubscribed, isSubscriptionPlanEnabled };
      })
      .addCase(fetchSubscribeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Follow
      .addCase(followUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(followUser.fulfilled, (state, action) => {
        state.loading = false;
        const userId = action.payload.targetUserId;
        if (!state.following.list.some(user => user._id === userId)) {
          state.following.list.push({ _id: userId });
          state.following.count += 1;
        }
      })
      .addCase(followUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Unfollow
      .addCase(unfollowUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        state.loading = false;
        const userId = action.payload.targetUserId;
        state.following.list = state.following.list.filter(user => user._id !== userId);
        state.following.count -= 1;
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Followers
      .addCase(fetchFollowers.pending, (state) => {
        state.followers.loading = true;
        state.followers.error = null;
      })
      .addCase(fetchFollowers.fulfilled, (state, action) => {
        state.followers.loading = false;
        state.followers.list = action.payload.list || [];
        state.followers.count = action.payload.count || 0;
      })
      .addCase(fetchFollowers.rejected, (state, action) => {
        state.followers.loading = false;
        state.followers.error = action.payload;
      })

      // Fetch Following
      .addCase(fetchFollowing.pending, (state) => {
        state.following.loading = true;
        state.following.error = null;
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.following.loading = false;
        state.following.list = action.payload.list || [];
        state.following.count = action.payload.count || 0;
      })
      .addCase(fetchFollowing.rejected, (state, action) => {
        state.following.loading = false;
        state.following.error = action.payload;
      })

      // Enable Subscription Plan
      .addCase(enableSubscriptionPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enableSubscriptionPlan.fulfilled, (state, action) => {
        state.loading = false;
        const { authorId } = action.payload;
        if (!state.enabledSubscriptionAuthors.includes(authorId)) {
          state.enabledSubscriptionAuthors.push(authorId);
        }
        state.subscribeStatus[authorId] = {
          isSubscribed: state.subscribeStatus[authorId]?.isSubscribed || false,
          isSubscriptionPlanEnabled: true,
        };
      })
      .addCase(enableSubscriptionPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Follow Status
      .addCase(getFollowStatus.fulfilled, (state, action) => {
        const { targetUserId, isFollowing } = action.payload;
        const alreadyFollowed = state.following.list.some(user => user._id === targetUserId);
        if (isFollowing && !alreadyFollowed) {
          state.following.list.push({ _id: targetUserId });
          state.following.count += 1;
        } else if (!isFollowing && alreadyFollowed) {
          state.following.list = state.following.list.filter(user => user._id !== targetUserId);
          state.following.count -= 1;
        }
      })

      // Get Subscription Status
      .addCase(getSubscriptionStatus.fulfilled, (state, action) => {
        const { authorId, isSubscribed, isSubscriptionPlanEnabled } = action.payload;
        state.subscribeStatus[authorId] = { isSubscribed, isSubscriptionPlanEnabled };
        if (isSubscribed && !state.subscribedAuthors.includes(authorId)) {
          state.subscribedAuthors.push(authorId);
        } else if (!isSubscribed) {
          state.subscribedAuthors = state.subscribedAuthors.filter(id => id !== authorId);
        }
        if (isSubscriptionPlanEnabled && !state.enabledSubscriptionAuthors.includes(authorId)) {
          state.enabledSubscriptionAuthors.push(authorId);
        }
      });
  },
});

// Selectors
export const selectSubscribeState = (state) => state.subscribe;
export const selectFollowers = (state) => state.subscribe.followers;
export const selectFollowing = (state) => state.subscribe.following;
export const selectSubscribedAuthors = (state) => state.subscribe.subscribedAuthors;
export const selectEnabledSubscriptionAuthors = (state) => state.subscribe.enabledSubscriptionAuthors;
export const selectSubscribeStatus = (state) => state.subscribe.subscribeStatus;
export const selectUserId = (state) => state.subscribe.userId;

export const makeSelectAuthorStatus = (authorId) =>
  createSelector(
    [selectSubscribeStatus],
    (status) => status[authorId] || { isSubscribed: false, isSubscriptionPlanEnabled: false }
  );

export const { setSubscribeStatus, setUserId } = subscribeSlice.actions;
export default subscribeSlice.reducer;
