import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";
// Thunks
export const fetchPostAnalytics = createAsyncThunk(
  "analytics/fetchPostAnalytics",
  async (postId, { rejectWithValue }) => {
    try {
      console.log("Fetching post stats for postId:", postId);
      const response = await axiosInstance.get(`/post/analytics/post/${postId}`);
      console.log("API response for post stats:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching post stats:", error);
      return rejectWithValue(error.response?.data?.error || "Failed to fetch post stats");
    }
  }
);

export const fetchUserEngagementStats = createAsyncThunk(
  "analytics/fetchUserEngagementStats",
  async (_, { rejectWithValue }) => {
    try {
      console.log("Fetching user engagement stats");
      const response = await axiosInstance.get("/post/analytics/user-engagement");
      console.log("API response for user engagement stats:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching user engagement stats:", error);
      return rejectWithValue(error.response?.data?.error || "Failed to fetch user engagement stats");
    }
  }
);

// Slice
const analyticsSlice = createSlice({
  name: "analytics",
  initialState: {
    postStats: null,
    userEngagement: null,
    postStatsStatus: "idle",
    postStatsError: null,
    userEngagementStatus: "idle",
    userEngagementError: null,
    logs: [],
  },
  reducers: {
    clearLogs(state) {
      console.log("Clearing logs, previous logs:", state.logs);
      state.logs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Post stats
      .addCase(fetchPostAnalytics.pending, (state) => {
        state.postStatsStatus = "loading";
        state.postStatsError = null;
        state.logs.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: "FETCH_POST_PROPERTIES_PENDING",
          payload: { message: "Fetching post stats" },
        });
      })
      .addCase(fetchPostAnalytics.fulfilled, (state, action) => {
        state.postStatsStatus = "succeeded";
        state.postStats = action.payload;
        state.logs.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: "FETCH_POST_PROPERTIES",
          payload: { data: action.payload },
        });
      })
      .addCase(fetchPostAnalytics.rejected, (state, action) => {
        state.postStatsStatus = "failed";
        state.postStatsError = action.payload;
        state.logs.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: "FETCH_POST_PROPERTIES_FAILED",
          payload: { error: action.payload },
        });
      })

      // User engagement stats
      .addCase(fetchUserEngagementStats.pending, (state) => {
        state.userEngagementStatus = "loading";
        state.userEngagementError = null;
        state.logs.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: "FETCH_USER_PROFILE_PROPERTIES_PENDING",
          payload: { message: "Fetching user engagement stats" },
        });
      })
      .addCase(fetchUserEngagementStats.fulfilled, (state, action) => {
        state.userEngagementStatus = "succeeded";
        state.userEngagement = action.payload;
        state.logs.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: "FETCH_PROFILE_PROPERTIES",
          payload: { data: action.payload },
        });
      })
      .addCase(fetchUserEngagementStats.rejected, (state, action) => {
        state.userEngagementStatus = "failed";
        state.userEngagementError = action.payload;
        state.logs.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: "FETCH_PROFILE_PROPERTIES_FAILED",
          payload: { error: action.payload },
        });
      });
  },
});

// Actions
export const { clearLogs } = analyticsSlice.actions;

// Selectors
export const selectAnalytics = (state) => {
  console.log("Selecting analytics state:", state.analytics || {});
  return state.analytics || {};
};

export const selectPostAnalytics = (state) => {
  return selectAnalytics(state).postStats;
};

export const selectUserEngagement = (state) => {
  return selectAnalytics(state).userEngagement;
};

export const selectPostAnalyticsPropertiesStatus = (state) => {
  return selectAnalytics(state).postStatsStatus;
};

export const selectPostAnalyticsPropertiesError = (state) => {
  return selectAnalytics(state).postStatsError;
};

export const selectUserEngagementPropertiesStatus = (state) => {
  return selectAnalytics(state).userEngagementStatus;
};

export const selectUserEngagementPropertiesError = (state) => {
  return selectAnalytics(state).userEngagementError;
};

export const selectAnalyticsProperties = (state) => {
  return selectAnalytics(state).logs;
};

// Reducer
export default analyticsSlice.reducer;
