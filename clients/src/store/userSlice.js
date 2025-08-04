import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Error Helper
const extractError = (err, fallback = "Request failed") =>
  err?.response?.data?.message || err.message || fallback;

// Location Merge Helper
const mergeLocation = (list, newLoc) => [
  newLoc,
  ...list.filter((loc) => loc.userId !== newLoc.userId),
];

// Common State Handlers
const handlePending = (state, key) => {
  state[key].loading = true;
  state[key].error = null;
};
const handleFulfilled = (state, key, action) => {
  state[key].loading = false;
  state[key].data = action.payload;
};
const handleRejected = (state, key, action) => {
  state[key].loading = false;
  state[key].error = action.payload;
};
const setLoading = (state) => {
  state.loading = true;
  state.error = null;
};

// Toggle Thunk Factory
const createToggleThunk = (name, endpoint) =>
  createAsyncThunk(
    `user/${name}`,
    async (userId, { rejectWithValue, getState }) => {
      try {
        const res = await axiosInstance.patch(
          `/user/${endpoint}/${userId}`,
          {},
          { withCredentials: true }
        );
        const updated = res.data.data || res.data;
        if (name === "toggleBlockUser" && updated.blocked === undefined) {
          const currentUser = getState().user.users.find(
            (u) => u._id === userId
          );
          return { _id: userId, blocked: !currentUser?.blocked };
        }
        return updated;
      } catch (err) {
        return rejectWithValue(extractError(err, `Failed to ${name}`));
      }
    }
  );

// Thunks
export const getUser = createAsyncThunk(
  "user/getUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/user/get-user", {
        withCredentials: true,
      });
      if (!res.data?.data) throw new Error("Invalid user data");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch user"));
    }
  }
);

export const fetchFollowerLocations = createAsyncThunk(
  "user/fetchFollowerLocations",
  async (
    { page = 1, limit = 12, includeOffline = true },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get(
        `/follow/follower-locations?page=${page}&limit=${limit}&includeOffline=${includeOffline}`,
        { withCredentials: true }
      );
      if (!res.data) throw new Error("Invalid response");
      return {
        locations: res.data.list || [],
        page,
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
      };
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to fetch follower locations")
      );
    }
  }
);

export const fetchIndiaGeoJson = createAsyncThunk(
  "user/fetchIndiaGeoJson",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/geojson/india-border", {
        timeout: 30000,
      });
      if (!res.data?.type || res.data.type !== "FeatureCollection")
        throw new Error("Invalid GeoJSON format");
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "GeoJSON fetch failed"));
    }
  }
);

export const getAllUsers = createAsyncThunk(
  "user/getAllUsers",
  async (
    {
      page = 1,
      limit = 10,
      search = "",
      sortField = "name",
      sortOrder = "asc",
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get("/user/get-all-user", {
        params: { page, limit, search, sortField, sortOrder },
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch users"));
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch("/user/update-user", formData, {
        withCredentials: true,
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update user"));
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete("/user/delete-user", {
        data: { userId },
        withCredentials: true,
      });
      return userId;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete user"));
    }
  }
);

export const toggleBlockUser = createToggleThunk(
  "toggleBlockUser",
  "toggle-block"
);
export const toggleUserRole = createToggleThunk(
  "toggleUserRole",
  "toggle-role"
);

export const getUserById = createAsyncThunk(
  "user/getUserById",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/user/get-single-user/${userId}`, {
        withCredentials: true,
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch user by ID"));
    }
  }
);

export const fetchUserActivity = createAsyncThunk(
  "user/fetchUserActivity",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/user/activity/${userId}`, {
        withCredentials: true,
      });
      return res.data.activity || [];
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch activity"));
    }
  }
);

export const clearUserActivity = createAsyncThunk(
  "user/clearUserActivity",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete("/user/activity/clear", {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to clear activity"));
    }
  }
);

export const clearOldActivity = createAsyncThunk(
  "user/clearOldActivity",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete("/user/activity/clear-old", {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to clear old activity"));
    }
  }
);

export const fetchAllUserLocations = createAsyncThunk(
  "user/fetchAllUserLocations",
  async ({ page = 1, limit = 12 }, { rejectWithValue, getState }) => {
    try {
      if (getState().auth?.role !== "admin")
        throw new Error("Admin access required");
      const res = await axiosInstance.get(
        `/user/locations?page=${page}&limit=${limit}`,
        { withCredentials: true }
      );
      return {
        locations: res.data.list || res.data.locations || [],
        page,
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
      };
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to fetch user locations")
      );
    }
  }
);

export const saveUserLocation = createAsyncThunk(
  "user/saveUserLocation",
  async ({ latitude, longitude, city, country }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        "/user/save-location",
        { coordinates: { lat: latitude, lon: longitude }, city, country },
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to save location"));
    }
  }
);

export const searchUsers = createAsyncThunk(
  "user/searchUsers",
  async (query, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/post/search-users?query=${query}`);
      return res.data.users || [];
    } catch (err) {
      return rejectWithValue(extractError(err, "User search failed"));
    }
  }
);

export const saveUserConsent = createAsyncThunk(
  "user/saveUserConsent",
  async (consent, { rejectWithValue }) => {
    try {
      await axiosInstance.post(
        "/user/consent",
        { consent },
        { withCredentials: true }
      );
      return consent;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to save consent"));
    }
  }
);

export const getUserIPLocation = createAsyncThunk(
  "user/getUserIPLocation",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/user/ip-location", {
        withCredentials: true,
      });
      return res.data.location;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to get IP location"));
    }
  }
);

export const trackUserIPLocation = createAsyncThunk(
  "user/trackUserIPLocation",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post(
        "/user/track-ip-location",
        {},
        { withCredentials: true }
      );
      return true;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to track IP location"));
    }
  }
);

export const shouldShowFeedbackPrompt = createAsyncThunk(
  "user/shouldShowFeedbackPrompt",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/user/feedback/check", {
        withCredentials: true,
      });
      return res.data.shouldPrompt;
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to check feedback prompt")
      );
    }
  }
);

export const submitUserFeedback = createAsyncThunk(
  "user/submitUserFeedback",
  async ({ rating, message }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        "/user/feedback/submit",
        { rating, message },
        { withCredentials: true }
      );
      return res.data.success;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to submit feedback"));
    }
  }
);

export const fetchAllUserFeedback = createAsyncThunk(
  "user/fetchAllUserFeedback",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/user/feedback/all", {
        withCredentials: true,
      });
      return res.data.feedbacks || [];
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch feedbacks"));
    }
  }
);

export const sendManualFeedbackPrompt = createAsyncThunk(
  "user/sendManualFeedbackPrompt",
  async ({ userId, message }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        `/user/feedback/manual/${userId}`,
        { message },
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to send feedback prompt")
      );
    }
  }
);

export const clearSearchedUsers = () => ({ type: "user/clearSearchedUsers" });

// Initial State
const initialState = {
  user: null,
  userId: null,
  users: [],
  loading: false,
  error: null,
  updateLoading: false,
  updateSuccess: false,
  updateError: null,
  selectedUser: null,
  selectedUserLoading: false,
  selectedUserError: null,
  searchedUsers: [],
  searchedUsersLoading: false,
  searchedUsersError: null,
  activity: [],
  activityLoading: false,
  activityError: null,
  feedbackList: [],
  feedbackListLoading: false,
  feedbackListError: null,
  feedbackSubmitting: false,
  feedbackSubmitted: false,
  feedbackError: null,
  feedbackPrompt: false,
  feedbackPrompting: false,
  feedbackPromptError: null,
  userLocations: {
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
  geoJson: { data: null, loading: false, error: null },
  ipLocation: { data: null, loading: false, error: null, tracked: false },
  cookieConsent: localStorage.getItem("userCookieConsent") || null,
};

// Slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    resetFeedbackState: (state) => {
      state.feedbackList = [];
      state.feedbackListLoading = false;
      state.feedbackListError = null;
      state.feedbackSubmitting = false;
      state.feedbackSubmitted = false;
      state.feedbackError = null;
      state.feedbackPrompt = false;
    },
    clearGeoJson: (state) => {
      state.geoJson = { data: null, loading: false, error: null };
    },
    setUserId: (state, action) => {
      state.userId = action.payload;
    },
    addUserLocation: (state, action) => {
      const location = {
        userId: action.payload.userId,
        coordinates: {
          lat: action.payload.coordinates?.lat || 0,
          lon: action.payload.coordinates?.lon || 0,
        },
        city: action.payload.city || "Unknown",
        country: action.payload.country || "Unknown",
        state: action.payload.state || "Unknown",
        pincode: action.payload.pincode || "Unknown",
        timestamp: action.payload.timestamp || Date.now(),
      };
      state.userLocations.list = mergeLocation(
        state.userLocations.list,
        location
      );
      state.followerLocations.list = mergeLocation(
        state.followerLocations.list,
        location
      );
    },
    clearUserError: (state) => {
      state.error = null;
      state.updateError = null;
      state.activityError = null;
      state.userLocations.error = null;
      state.followerLocations.error = null;
    },
    clearUser: (state) => ({ ...initialState }),
    clearSelectedUser: (state) => {
      state.selectedUser = null;
      state.selectedUserLoading = false;
      state.selectedUserError = null;
    },
    clearSearchedUsers: (state) => {
      state.searchedUsers = [];
      state.searchedUsersLoading = false;
      state.searchedUsersError = null;
    },
    resetUpdateStatus: (state) => {
      state.updateSuccess = false;
      state.updateError = null;
    },
    clearIPLocation: (state) => {
      state.ipLocation = {
        data: null,
        loading: false,
        error: null,
        tracked: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUser.pending, setLoading)
      .addCase(getUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.userId = action.payload?._id || null;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getAllUsers.pending, setLoading)
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users || [];
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateUser.pending, (state) => {
        state.updateLoading = true;
        state.updateSuccess = false;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.updateSuccess = true;
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, ...action.payload } : u
        );
        if (state.user?._id === action.payload._id)
          state.user = { ...state.user, ...action.payload };
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
      })
      .addCase(deleteUser.pending, setLoading)
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter((u) => u._id !== action.payload);
        if (state.user?._id === action.payload) {
          state.user = null;
          state.userId = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleBlockUser.pending, setLoading)
      .addCase(toggleBlockUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.map((u) =>
          u._id === action.payload._id
            ? { ...u, blocked: action.payload.blocked }
            : u
        );
        if (state.user?._id === action.payload._id)
          state.user = { ...state.user, blocked: action.payload.blocked };
      })
      .addCase(toggleBlockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleUserRole.pending, setLoading)
      .addCase(toggleUserRole.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, role: action.payload.role } : u
        );
        if (state.user?._id === action.payload._id)
          state.user = { ...state.user, role: action.payload.role };
      })
      .addCase(toggleUserRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserById.pending, (state) => {
        state.selectedUserLoading = true;
        state.selectedUserError = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.selectedUserLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.selectedUserLoading = false;
        state.selectedUserError = action.payload;
      })
      .addCase(fetchUserActivity.pending, (state) => {
        state.activityLoading = true;
        state.activityError = null;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        state.activityLoading = false;
        state.activityError = action.payload;
      })
      .addCase(clearUserActivity.fulfilled, (state) => {
        state.activity = [];
        state.activityLoading = false;
      })
      .addCase(clearOldActivity.fulfilled, (state) => {
        state.activity = state.activity.filter(
          (item) =>
            new Date(item.createdAt) >=
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        state.activityLoading = false;
      })
      .addCase(fetchAllUserLocations.pending, (state) =>
        handlePending(state, "userLocations")
      )
      .addCase(fetchAllUserLocations.fulfilled, (state, { payload }) => {
        state.userLocations.loading = false;
        state.userLocations.list = payload.locations || [];
        state.userLocations.count =
          payload.total ?? payload.locations?.length ?? 0;
        state.userLocations.page = payload.page;
        state.userLocations.totalPages = payload.totalPages;
      })
      .addCase(fetchAllUserLocations.rejected, (state, { payload }) =>
        handleRejected(state, "userLocations", { payload })
      )
      .addCase(fetchFollowerLocations.pending, (state) =>
        handlePending(state, "followerLocations")
      )
      .addCase(fetchFollowerLocations.fulfilled, (state, { payload }) => {
        state.followerLocations.loading = false;
        state.followerLocations.list = payload.locations;
        state.followerLocations.count =
          payload.total ?? payload.locations?.length ?? 0;
        state.followerLocations.page = payload.page;
        state.followerLocations.totalPages = payload.totalPages;
      })
      .addCase(fetchFollowerLocations.rejected, (state, { payload }) =>
        handleRejected(state, "followerLocations", { payload })
      )
      .addCase(saveUserLocation.pending, setLoading)
      .addCase(saveUserLocation.fulfilled, (state, { payload }) => {
        state.loading = false;
        const location = {
          userId: payload.location.userId,
          coordinates: payload.location.coordinates,
          city: payload.location.city,
          country: payload.location.country,
          state: payload.location.state,
          pincode: payload.location.pincode,
          timestamp: payload.location.timestamp,
        };
        state.userLocations.list = mergeLocation(
          state.userLocations.list,
          location
        );
        state.followerLocations.list = mergeLocation(
          state.followerLocations.list,
          location
        );
      })
      .addCase(saveUserLocation.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(fetchIndiaGeoJson.pending, (state) =>
        handlePending(state, "geoJson")
      )
      .addCase(fetchIndiaGeoJson.fulfilled, (state, { payload }) => {
        state.geoJson.loading = false;
        state.geoJson.data = payload?.features?.length ? payload : null;
        if (!payload?.features?.length)
          state.geoJson.error = "No features found";
      })
      .addCase(fetchIndiaGeoJson.rejected, (state, { payload }) =>
        handleRejected(state, "geoJson", { payload })
      )
      .addCase(searchUsers.pending, (state) => {
        state.searchedUsersLoading = true;
        state.searchedUsersError = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.searchedUsersLoading = false;
        state.searchedUsers = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.searchedUsersLoading = false;
        state.searchedUsersError = action.payload;
      })
      .addCase(saveUserConsent.fulfilled, (state, action) => {
        state.cookieConsent = action.payload;
      })
      .addCase(saveUserConsent.rejected, (state, action) => {
        console.error("[UserSlice] saveUserConsent: Error", action.payload);
      })
      .addCase(getUserIPLocation.pending, (state) =>
        handlePending(state, "ipLocation")
      )
      .addCase(getUserIPLocation.fulfilled, (state, action) =>
        handleFulfilled(state, "ipLocation", action)
      )
      .addCase(getUserIPLocation.rejected, (state, action) =>
        handleRejected(state, "ipLocation", action)
      )
      .addCase(trackUserIPLocation.pending, (state) => {
        state.ipLocation.tracked = false;
      })
      .addCase(trackUserIPLocation.fulfilled, (state) => {
        state.ipLocation.tracked = true;
      })
      .addCase(trackUserIPLocation.rejected, (state) => {
        state.ipLocation.tracked = false;
      })
      .addCase(shouldShowFeedbackPrompt.pending, (state) => {
        state.feedbackPrompt = false;
      })
      .addCase(shouldShowFeedbackPrompt.fulfilled, (state, action) => {
        state.feedbackPrompt = action.payload;
      })
      .addCase(shouldShowFeedbackPrompt.rejected, (state) => {
        state.feedbackPrompt = false;
      })
      .addCase(submitUserFeedback.pending, (state) => {
        state.feedbackSubmitting = true;
        state.feedbackError = null;
      })
      .addCase(submitUserFeedback.fulfilled, (state) => {
        state.feedbackSubmitting = false;
        state.feedbackSubmitted = true;
      })
      .addCase(submitUserFeedback.rejected, (state, action) => {
        state.feedbackSubmitting = false;
        state.feedbackError = action.payload;
      })
      .addCase(fetchAllUserFeedback.pending, (state) => {
        state.feedbackListLoading = true;
        state.feedbackListError = null;
      })
      .addCase(fetchAllUserFeedback.fulfilled, (state, action) => {
        state.feedbackListLoading = false;
        state.feedbackList = action.payload;
      })
      .addCase(fetchAllUserFeedback.rejected, (state, action) => {
        state.feedbackListLoading = false;
        state.feedbackListError = action.payload;
      })
      .addCase(sendManualFeedbackPrompt.pending, (state) => {
        state.feedbackPrompting = true;
        state.feedbackPromptError = null;
      })
      .addCase(sendManualFeedbackPrompt.fulfilled, (state) => {
        state.feedbackPrompting = false;
      })
      .addCase(sendManualFeedbackPrompt.rejected, (state, action) => {
        state.feedbackPrompting = false;
        state.feedbackPromptError = action.payload;
      });
  },
});

export const {
  clearGeoJson,
  setUserId,
  addUserLocation,
  clearUserError,
  clearUser,
  clearSelectedUser,
  resetUpdateStatus,
  clearIPLocation,
  resetFeedbackState,
} = userSlice.actions;

export default userSlice.reducer;
