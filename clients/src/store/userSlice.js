import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const getUser = createAsyncThunk(
  "user/getUser",
  async (_, { rejectWithValue }) => {
    // console.log("[UserSlice] getUser: Starting request");
    try {
      const res = await axiosInstance.get("/user/get-user", {
        withCredentials: true,
      });
      // console.log("[UserSlice] getUser: Response received", res.data);
      if (!res.data?.data) throw new Error("Invalid user data");
      // console.log("[UserSlice] getUser: Returning user data", res.data.data);
      return res.data.data;
    } catch (err) {
      console.error("[UserSlice] getUser: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch user"
      );
    }
  }
);

export const fetchFollowerLocations = createAsyncThunk(
  "user/fetchFollowerLocations",
  async (
    { page = 1, limit = 12, includeOffline = true },
    { rejectWithValue }
  ) => {
    // console.log("[UserSlice] fetchFollowerLocations: Starting request", {
    //   page,
    //   limit,
    //   includeOffline,
    // });
    try {
      const response = await axiosInstance.get(
        `/follow/follower-locations?page=${page}&limit=${limit}&includeOffline=${includeOffline}`,
        { withCredentials: true }
      );
      // console.log(
      //   "[UserSlice] fetchFollowerLocations: Response received",
      //   response.data
      // );
      if (!response.data) throw new Error("Invalid response");
      const result = {
        locations: response.data.list || [],
        page,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
      };
      // console.log("[UserSlice] fetchFollowerLocations: Returning data", result);
      return result;
    } catch (err) {
      console.error("[UserSlice] fetchFollowerLocations: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch follower locations"
      );
    }
  }
);

export const fetchIndiaGeoJson = createAsyncThunk(
  "user/fetchIndiaGeoJson",
  async (_, { rejectWithValue }) => {
    try {
      const url = "/geojson/india-border";
      const res = await axiosInstance.get(url);
      // console.log("fetchIndiaGeoJsonnnnnnn", res);

      if (!res.data?.type || res.data.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON format");
      }
      return res.data;
    } catch (err) {
      console.error("[UserSlice] fetchIndiaGeoJson: Error", err.message);
      return rejectWithValue(err.message || "Failed to fetch GeoJSON");
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
    // console.log("[UserSlice] getAllUsers: Starting request", {
    //   page,
    //   limit,
    //   search,
    //   sortField,
    //   sortOrder,
    // });
    try {
      const response = await axiosInstance.get("/user/get-all-user", {
        params: { page, limit, search, sortField, sortOrder },
        withCredentials: true,
      });
      // console.log("[UserSlice] getAllUsers: Response received", response.data);
      return response.data;
    } catch (err) {
      console.error("[UserSlice] getAllUsers: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch users"
      );
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (formData, { rejectWithValue }) => {
    // console.log("[UserSlice] updateUser: Starting request", formData);
    try {
      const res = await axiosInstance.patch("/user/update-user", formData, {
        withCredentials: true,
      });
      // console.log("[UserSlice] updateUser: Response received", res.data);
      return res.data.data;
    } catch (err) {
      console.error("[UserSlice] updateUser: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to update user"
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId, { rejectWithValue }) => {
    // console.log("[UserSlice] deleteUser: Starting request", { userId });
    try {
      await axiosInstance.delete("/user/delete-user", {
        data: { userId },
        withCredentials: true,
      });
      // console.log("[UserSlice] deleteUser: User deleted", { userId });
      return userId;
    } catch (err) {
      console.error("[UserSlice] deleteUser: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to delete user"
      );
    }
  }
);

export const toggleBlockUser = createAsyncThunk(
  "user/toggleBlockUser",
  async (userId, { rejectWithValue, getState }) => {
    // console.log("[UserSlice] toggleBlockUser: Starting request", { userId });
    try {
      const response = await axiosInstance.patch(
        `/user/toggle-block/${userId}`,
        {},
        { withCredentials: true }
      );
      // console.log(
      //   "[UserSlice] toggleBlockUser: Response received",
      //   response.data
      // );
      const updatedUser = response.data.data || response.data;
      if (updatedUser.blocked === undefined) {
        const currentUser = getState().user.users.find((u) => u._id === userId);
        // console.log("[UserSlice] toggleBlockUser: Fallback to state", {
        //   currentUser,
        // });
        return { _id: userId, blocked: !currentUser?.blocked };
      }
      // console.log(
      //   "[UserSlice] toggleBlockUser: Returning updated user",
      //   updatedUser
      // );
      return updatedUser;
    } catch (err) {
      console.error("[UserSlice] toggleBlockUser: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to toggle block status"
      );
    }
  }
);

export const toggleUserRole = createAsyncThunk(
  "user/toggleUserRole",
  async (userId, { rejectWithValue }) => {
    // console.log("[UserSlice] toggleUserRole: Starting request", { userId });
    try {
      const response = await axiosInstance.patch(
        `/user/toggle-role/${userId}`,
        {},
        { withCredentials: true }
      );
      // console.log(
      //   "[UserSlice] toggleUserRole: Response received",
      //   response.data
      // );
      return response.data.data || response.data;
    } catch (err) {
      console.error("[UserSlice] toggleUserRole: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to toggle user role"
      );
    }
  }
);

export const getUserById = createAsyncThunk(
  "user/getUserById",
  async (userId, { rejectWithValue }) => {
    // console.log("[UserSlice] getUserById: Starting request", { userId });
    try {
      const res = await axiosInstance.get(`/user/get-single-user/${userId}`, {
        withCredentials: true,
      });
      // console.log("[UserSlice] getUserById: Response received", res.data);
      return res.data.data;
    } catch (err) {
      console.error("[UserSlice] getUserById: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch user by ID"
      );
    }
  }
);

export const fetchUserActivity = createAsyncThunk(
  "user/fetchUserActivity",
  async (userId, { rejectWithValue }) => {
    // console.log("[UserSlice] fetchUserActivity: Starting request", { userId });
    try {
      const response = await axiosInstance.get(`/user/activity/${userId}`, {
        withCredentials: true,
      });
      // console.log(
      //   "[UserSlice] fetchUserActivity: Response received",
      //   response.data
      // );
      return response.data.activity || [];
    } catch (err) {
      console.error("[UserSlice] fetchUserActivity: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch activity"
      );
    }
  }
);

export const clearUserActivity = createAsyncThunk(
  "user/clearUserActivity",
  async (_, { rejectWithValue }) => {
    // console.log("[UserSlice] clearUserActivity: Starting request");
    try {
      const res = await axiosInstance.delete("/user/activity/clear", {
        withCredentials: true,
      });
      // console.log("[UserSlice] clearUserActivity: Response received", res.data);
      return res.data;
    } catch (err) {
      console.error("[UserSlice] clearUserActivity: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to clear activity"
      );
    }
  }
);

export const clearOldActivity = createAsyncThunk(
  "user/clearOldActivity",
  async (_, { rejectWithValue }) => {
    // console.log("[UserSlice] clearOldActivity: Starting request");
    try {
      const res = await axiosInstance.delete("/user/activity/clear-old", {
        withCredentials: true,
      });
      // console.log("[UserSlice] clearOldActivity: Response received", res.data);
      return res.data;
    } catch (err) {
      console.error("[UserSlice] clearOldActivity: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to clear old activity"
      );
    }
  }
);

export const fetchAllUserLocations = createAsyncThunk(
  "user/fetchAllUserLocations",
  async ({ page = 1, limit = 12 }, { rejectWithValue, getState }) => {
    // console.log("[UserSlice] fetchAllUserLocations: Starting request", {
    //   page,
    //   limit,
    // });
    try {
      const state = getState();
      if (state.auth?.role !== "admin") {
        console.error(
          "[UserSlice] fetchAllUserLocations: Admin access required"
        );
        throw new Error("Admin access required");
      }
      const response = await axiosInstance.get(
        `/user/locations?page=${page}&limit=${limit}`,
        {
          withCredentials: true,
        }
      );
      // console.log(
      //   "[UserSlice] fetchAllUserLocations: Response received",
      //   response.data
      // );
      const result = {
        locations: response.data.list || response.data.locations || [],
        page,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
      };
      // console.log("[UserSlice] fetchAllUserLocations: Returning data", result);
      return result;
    } catch (err) {
      console.error("[UserSlice] fetchAllUserLocations: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch user locations"
      );
    }
  }
);

export const saveUserLocation = createAsyncThunk(
  "user/saveUserLocation",
  async ({ latitude, longitude, city, country }, { rejectWithValue }) => {
    // console.log("[UserSlice] saveUserLocation: Starting request", {
    //   latitude,
    //   longitude,
    //   city,
    //   country,
    // });
    try {
      const response = await axiosInstance.post(
        "/user/save-location",
        { coordinates: { lat: latitude, lon: longitude }, city, country },
        { withCredentials: true }
      );
      // console.log(
      //   "[UserSlice] saveUserLocation: Response received",
      //   response.data
      // );
      return response.data;
    } catch (err) {
      console.error("[UserSlice] saveUserLocation: Error", err.message);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to save location"
      );
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
      return rejectWithValue(
        err.response?.data?.message || "User search failed"
      );
    }
  }
);

export const saveUserConsent = createAsyncThunk(
  "user/saveUserConsent",
  async (consent, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        "/user/consent",
        { consent },
        { withCredentials: true }
      );
      return consent; // just return what was sent
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to save consent"
      );
    }
  }
);

// Fetches IP-based location (GET /user/ip-location)
export const getUserIPLocation = createAsyncThunk(
  "user/getUserIPLocation",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/user/ip-location", {
        withCredentials: true,
      });
      return res.data.location;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to get IP location"
      );
    }
  }
);

// Tracks IP-based location (POST /user/track-ip-location)
export const trackUserIPLocation = createAsyncThunk(
  "user/trackUserIPLocation",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post(
        "/user/track-ip-location",
        {},
        {
          withCredentials: true,
        }
      );
      return true;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to track IP location"
      );
    }
  }
);

// Check if user should see feedback prompt
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
        err.response?.data?.message || "Failed to check feedback prompt"
      );
    }
  }
);

// Submit feedback
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
      return rejectWithValue(
        err.response?.data?.message || "Failed to submit feedback"
      );
    }
  }
);

// Admin: Fetch all feedbacks
export const fetchAllUserFeedback = createAsyncThunk(
  "user/fetchAllUserFeedback",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/user/feedback/all", {
        withCredentials: true,
      });
      return res.data.feedbacks || [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch feedbacks"
      );
    }
  }
);

// Admin: Manually trigger feedback prompt to user
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
        err.response?.data?.message || "Failed to send feedback prompt"
      );
    }
  }
);

export const clearSearchedUsers = () => ({
  type: "user/clearSearchedUsers",
});

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
  feedback: {
    shouldPrompt: false,
    submitting: false,
    submitted: false,
    error: null,
    list: [],
    loadingList: false,
    errorList: null,
    prompting: false,
    promptError: null,
  },

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
  geoJson: {
    data: null,
    loading: false,
    error: null,
  },
  ipLocation: {
    data: null,
    loading: false,
    error: null,
    tracked: false,
  },
  cookieConsent: localStorage.getItem("userCookieConsent") || null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    resetFeedbackState: (state) => {
      state.feedback = {
        shouldPrompt: false,
        submitting: false,
        submitted: false,
        error: null,
        list: [],
        loadingList: false,
        errorList: null,
      };
    },

    clearGeoJson: (state) => {
      // console.log("[UserSlice] clearGeoJson: Clearing GeoJSON state");
      state.geoJson = { data: null, loading: false, error: null };
    },
    setUserId: (state, action) => {
      // console.log("[UserSlice] setUserId: Setting userId", action.payload);
      state.userId = action.payload;
    },
    addUserLocation: (state, action) => {
      // console.log(
      //   "[UserSlice] addUserLocation: Adding location",
      //   action.payload
      // );
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
      state.userLocations.list = [
        location,
        ...state.userLocations.list.filter(
          (loc) => loc.userId !== location.userId
        ),
      ];
      state.followerLocations.list = [
        location,
        ...state.followerLocations.list.filter(
          (loc) => loc.userId !== location.userId
        ),
      ];
      // console.log("[UserSlice] addUserLocation: Updated locations", {
      //   userLocations: state.userLocations.list.length,
      //   followerLocations: state.followerLocations.list.length,
      // });
    },
    clearUserError: (state) => {
      // console.log("[UserSlice] clearUserError: Clearing errors");
      state.error = null;
      state.updateError = null;
      state.activityError = null;
      state.userLocations.error = null;
      state.followerLocations.error = null;
    },

    clearUser: (state) => {
      // console.log("[UserSlice] clearUser: Resetting user state");
      return { ...initialState };
    },
    clearSelectedUser: (state) => {
      // console.log("[UserSlice] clearSelectedUser: Clearing selected user");
      state.selectedUser = null;
      state.selectedUserLoading = false;
      state.selectedUserError = null;
    },
    clearSearchedUsers: (state) => {
      // console.log("[UserSlice] clearSearchedUsers: Clearing search users");
      state.searchedUsers = [];
      state.searchedUsersLoading = false;
      state.searchedUsersError = null;
    },
    resetUpdateStatus: (state) => {
      // console.log("[UserSlice] resetUpdateStatus: Resetting update status");
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
      .addCase(getUser.pending, (state) => {
        // console.log("[UserSlice] getUser: Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        // console.log("[UserSlice] getUser: Fulfilled", action.payload);
        state.loading = false;
        state.user = action.payload;
        state.userId = action.payload?._id || null;
      })
      .addCase(getUser.rejected, (state, action) => {
        // console.log("[UserSlice] getUser: Rejected", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getAllUsers.pending, (state) => {
        // console.log("[UserSlice] getAllUsers: Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        // console.log("[UserSlice] getAllUsers: Fulfilled", action.payload);
        state.loading = false;
        state.users = action.payload.users || [];
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        // console.log("[UserSlice] getAllUsers: Rejected", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateUser.pending, (state) => {
        // console.log("[UserSlice] updateUser: Pending");
        state.updateLoading = true;
        state.updateSuccess = false;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        // console.log("[UserSlice] updateUser: Fulfilled", action.payload);
        state.updateLoading = false;
        state.updateSuccess = true;
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, ...action.payload } : u
        );
        if (state.user?._id === action.payload._id) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        // console.log("[UserSlice] updateUser: Rejected", action.payload);
        state.updateLoading = false;
        state.updateError = action.payload;
      })
      .addCase(deleteUser.pending, (state) => {
        // console.log("[UserSlice] deleteUser: Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        // console.log("[UserSlice] deleteUser: Fulfilled", action.payload);
        state.loading = false;
        state.users = state.users.filter((u) => u._id !== action.payload);
        if (state.user?._id === action.payload) {
          state.user = null;
          state.userId = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        // console.log("[UserSlice] deleteUser: Rejected", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleBlockUser.pending, (state) => {
        // console.log("[UserSlice] toggleBlockUser: Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleBlockUser.fulfilled, (state, action) => {
        // console.log("[UserSlice] toggleBlockUser: Fulfilled", action.payload);
        state.loading = false;
        state.users = state.users.map((u) =>
          u._id === action.payload._id
            ? { ...u, blocked: action.payload.blocked }
            : u
        );
        if (state.user?._id === action.payload._id) {
          state.user = { ...state.user, blocked: action.payload.blocked };
        }
      })
      .addCase(toggleBlockUser.rejected, (state, action) => {
        // console.log("[UserSlice] toggleBlockUser: Rejected", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleUserRole.pending, (state) => {
        // console.log("[UserSlice] toggleUserRole: Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleUserRole.fulfilled, (state, action) => {
        // console.log("[UserSlice] toggleUserRole: Fulfilled", action.payload);
        state.loading = false;
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, role: action.payload.role } : u
        );
        if (state.user?._id === action.payload._id) {
          state.user = { ...state.user, role: action.payload.role };
        }
      })
      .addCase(toggleUserRole.rejected, (state, action) => {
        // console.log("[UserSlice] toggleUserRole: Rejected", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserById.pending, (state) => {
        // console.log("[UserSlice] getUserById: Pending");
        state.selectedUserLoading = true;
        state.selectedUserError = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        // console.log("[UserSlice] getUserById: Fulfilled", action.payload);
        state.selectedUserLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserById.rejected, (state, action) => {
        // console.log("[UserSlice] getUserById: Rejected", action.payload);
        state.selectedUserLoading = false;
        state.selectedUserError = action.payload;
      })
      .addCase(fetchUserActivity.pending, (state) => {
        // console.log("[UserSlice] fetchUserActivity: Pending");
        state.activityLoading = true;
        state.activityError = null;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        // console.log("[UserSlice] fetchUserActivity: Fulfilled", action.payload);
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        // console.log("[UserSlice] fetchUserActivity: Rejected", action.payload);
        state.activityLoading = false;
        state.activityError = action.payload;
      })
      .addCase(clearUserActivity.fulfilled, (state) => {
        // console.log("[UserSlice] clearUserActivity: Fulfilled");
        state.activity = [];
        state.activityLoading = false;
      })
      .addCase(clearOldActivity.fulfilled, (state) => {
        // console.log("[UserSlice] clearOldActivity: Fulfilled");
        state.activity = state.activity.filter(
          (item) =>
            new Date(item.createdAt) >=
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        state.activityLoading = false;
      })
      .addCase(fetchAllUserLocations.pending, (state) => {
        // console.log("[UserSlice] fetchAllUserLocations: Pending");
        state.userLocations.loading = true;
        state.userLocations.error = null;
      })
      .addCase(fetchAllUserLocations.fulfilled, (state, { payload }) => {
        // console.log("[UserSlice] fetchAllUserLocations: Fulfilled", payload);
        state.userLocations.loading = false;
        state.userLocations.list = payload.locations || [];
        state.userLocations.count =
          payload.total ?? payload.locations?.length ?? 0;
        state.userLocations.page = payload.page;
        state.userLocations.totalPages = payload.totalPages;
      })
      .addCase(fetchAllUserLocations.rejected, (state, { payload }) => {
        // console.log("[UserSlice] fetchAllUserLocations: Rejected", payload);
        state.userLocations.loading = false;
        state.userLocations.error = payload;
      })
      .addCase(fetchFollowerLocations.pending, (state) => {
        // console.log("[UserSlice] fetchFollowerLocations: Pending");
        state.followerLocations.loading = true;
        state.followerLocations.error = null;
      })
      .addCase(fetchFollowerLocations.fulfilled, (state, action) => {
        // console.log(
        //   "[UserSlice] fetchFollowerLocations: Fulfilled",
        //   action.payload
        // );
        state.followerLocations.loading = false;
        state.followerLocations.list = action.payload.locations;
        state.followerLocations.count =
          action.payload.total ?? action.payload.locations?.length ?? 0;
        state.followerLocations.page = action.payload.page;
        state.followerLocations.totalPages = action.payload.totalPages;
      })
      .addCase(fetchFollowerLocations.rejected, (state, action) => {
        // console.log(
        //   "[UserSlice] fetchFollowerLocations: Rejected",
        //   action.payload
        // );
        state.followerLocations.loading = false;
        state.followerLocations.error = action.payload;
      })
      .addCase(saveUserLocation.pending, (state) => {
        // console.log("[UserSlice] saveUserLocation: Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(saveUserLocation.fulfilled, (state, { payload }) => {
        // console.log("[UserSlice] saveUserLocation: Fulfilled", payload);
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
        state.userLocations.list = [
          location,
          ...state.userLocations.list.filter(
            (loc) => loc.userId !== location.userId
          ),
        ];
        state.followerLocations.list = [
          location,
          ...state.followerLocations.list.filter(
            (loc) => loc.userId !== location.userId
          ),
        ];
        // console.log("[UserSlice] saveUserLocation: Updated locations", {
        //   userLocations: state.userLocations.list.length,
        //   followerLocations: state.followerLocations.list.length,
        // });
      })
      .addCase(saveUserLocation.rejected, (state, { payload }) => {
        // console.log("[UserSlice] saveUserLocation: Rejected", payload);
        state.loading = false;
        state.error = payload;
      })
      .addCase(fetchIndiaGeoJson.pending, (state) => {
        // console.log("[UserSlice] fetchIndiaGeoJson: Pending");
        state.geoJson.loading = true;
        state.geoJson.error = null;
      })
      .addCase(fetchIndiaGeoJson.fulfilled, (state, { payload }) => {
        // console.log("[UserSlice] fetchIndiaGeoJson: Fulfilled", payload);
        state.geoJson.loading = false;
        if (!payload?.features?.length) {
          // console.log("[UserSlice] fetchIndiaGeoJson: No features found");
          state.geoJson.error = "No features found";
          state.geoJson.data = null;
        } else {
          state.geoJson.data = payload;
        }
      })
      .addCase(fetchIndiaGeoJson.rejected, (state, { payload }) => {
        // console.log("[UserSlice] fetchIndiaGeoJson: Rejected", payload);
        state.geoJson.loading = false;
        state.geoJson.error = payload;
      })
      .addCase(searchUsers.pending, (state) => {
        // console.log("[UserSlice] searchUsers: Pending");
        state.searchedUsersLoading = true;
        state.searchedUsersError = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        // console.log("[UserSlice] searchUsers: Fulfilled", action.payload);
        state.searchedUsers = action.payload;
        state.searchedUsersLoading = false;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        // console.log("[UserSlice] searchUsers: Rejected", action.payload);
        state.searchedUsersLoading = false;
        state.searchedUsersError = action.payload;
      })
      .addCase(saveUserConsent.fulfilled, (state, action) => {
        // console.log("[UserSlice] saveUserConsent: Fulfilled", action.payload);
        state.cookieConsent = action.payload;
      })
      .addCase(saveUserConsent.rejected, (state, action) => {
        console.error("[UserSlice] saveUserConsent: Error", action.payload);
      })
      // getUserIPLocation
      .addCase(getUserIPLocation.pending, (state) => {
        state.ipLocation.loading = true;
        state.ipLocation.error = null;
      })
      .addCase(getUserIPLocation.fulfilled, (state, action) => {
        state.ipLocation.loading = false;
        state.ipLocation.data = action.payload;
      })
      .addCase(getUserIPLocation.rejected, (state, action) => {
        state.ipLocation.loading = false;
        state.ipLocation.error = action.payload;
      })

      // trackUserIPLocation
      .addCase(trackUserIPLocation.pending, (state) => {
        state.ipLocation.tracked = false;
      })
      .addCase(trackUserIPLocation.fulfilled, (state) => {
        state.ipLocation.tracked = true;
      })
      .addCase(trackUserIPLocation.rejected, (state) => {
        state.ipLocation.tracked = false;
      })
      // Check feedback prompt
      .addCase(shouldShowFeedbackPrompt.pending, (state) => {
        state.feedback.shouldPrompt = false;
      })
      .addCase(shouldShowFeedbackPrompt.fulfilled, (state, action) => {
        state.feedback.shouldPrompt = action.payload;
      })
      .addCase(shouldShowFeedbackPrompt.rejected, (state) => {
        state.feedback.shouldPrompt = false;
      })

      // Submit feedback
      .addCase(submitUserFeedback.pending, (state) => {
        state.feedback.submitting = true;
        state.feedback.error = null;
      })
      .addCase(submitUserFeedback.fulfilled, (state) => {
        state.feedback.submitting = false;
        state.feedback.submitted = true;
      })
      .addCase(submitUserFeedback.rejected, (state, action) => {
        state.feedback.submitting = false;
        state.feedback.error = action.payload;
      })

      // Admin: Get all feedback
      .addCase(fetchAllUserFeedback.pending, (state) => {
        state.feedback.loadingList = true;
        state.feedback.errorList = null;
      })
      .addCase(fetchAllUserFeedback.fulfilled, (state, action) => {
        state.feedback.loadingList = false;
        state.feedback.list = action.payload;
      })
      .addCase(fetchAllUserFeedback.rejected, (state, action) => {
        state.feedback.loadingList = false;
        state.feedback.errorList = action.payload;
      })
      // Admin: Manually send feedback prompt
      .addCase(sendManualFeedbackPrompt.pending, (state) => {
        state.feedback.prompting = true;
        state.feedback.promptError = null;
      })
      .addCase(sendManualFeedbackPrompt.fulfilled, (state) => {
        state.feedback.prompting = false;
      })
      .addCase(sendManualFeedbackPrompt.rejected, (state, action) => {
        state.feedback.prompting = false;
        state.feedback.promptError = action.payload;
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
