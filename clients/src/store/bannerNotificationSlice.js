import {
  createAsyncThunk,
  createSlice,
  createSelector,
} from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Simplified logging
const logAction = (action, payload, label) => {
  if (action?.error) {
    console.error(`[${label}] ${action.type} failed`, {
      error: action.error,
      payload,
    });
  }
};

// Fetch active banner notifications for authenticated user (excluding dismissed)
export const fetchActiveBannerNotifications = createAsyncThunk(
  "bannerNotifications/fetchActive",
  async ({ region } = {}, { rejectWithValue }) => {
    try {
      const params = region ? { region } : {};
      const response = await axiosInstance.get(
        "/bannerNotification/active-for-user",
        { params }
      );
      return Array.isArray(response.data?.notifications)
        ? response.data.notifications
        : [];
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to fetch banner notifications";
      logAction(
        { type: "fetchActiveBannerNotifications/rejected", error: errorMsg },
        { error: errorMsg },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Fetch all banner notifications (public route - for unauthenticated users)
export const fetchAllBannerNotifications = createAsyncThunk(
  "bannerNotifications/fetchAll",
  async ({ region } = {}, { rejectWithValue }) => {
    try {
      const params = region ? { region } : {};
      const response = await axiosInstance.get(
        "/bannerNotification/get-Notification",
        { params }
      );
      return Array.isArray(response.data?.notifications)
        ? response.data.notifications
        : [];
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to fetch banner notifications";
      logAction(
        { type: "fetchAllBannerNotifications/rejected", error: errorMsg },
        { error: errorMsg },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Create a new banner notification (admin only)
export const createBannerNotification = createAsyncThunk(
  "bannerNotifications/create",
  async (
    { message, title, type, link, region, expiresIn },
    { rejectWithValue }
  ) => {
    if (!message || !title) {
      return rejectWithValue("Message and title are required");
    }
    try {
      const response = await axiosInstance.post("/bannerNotification/create", {
        message,
        title,
        type,
        link,
        region,
        expiresIn,
      });
      return response.data.notification;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create banner notification";
      logAction(
        { type: "createBannerNotification/rejected", error: errorMsg },
        { error: errorMsg },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Dismiss a banner notification
export const dismissBannerNotification = createAsyncThunk(
  "bannerNotifications/dismiss",
  async (id, { rejectWithValue }) => {
    if (!id) {
      return rejectWithValue("Notification ID is required");
    }
    try {
      const response = await axiosInstance.patch(
        `/bannerNotification/dismiss/${id}`
      );
      return { id, ...response.data };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to dismiss banner notification";
      logAction(
        { type: "dismissBannerNotification/rejected", error: errorMsg },
        { error: errorMsg, id },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Check if notification is dismissed
export const checkDismissedBannerNotification = createAsyncThunk(
  "bannerNotifications/checkDismissed",
  async (id, { rejectWithValue }) => {
    if (!id) {
      return rejectWithValue("Notification ID is required");
    }
    try {
      const response = await axiosInstance.get(
        `/bannerNotification/dismissed/${id}`
      );
      return { id, dismissed: response.data.dismissed };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to check dismissal status";
      logAction(
        { type: "checkDismissedBannerNotification/rejected", error: errorMsg },
        { error: errorMsg, id },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Deactivate a banner notification (admin only)
export const deactivateBannerNotification = createAsyncThunk(
  "bannerNotifications/deactivate",
  async (id, { rejectWithValue }) => {
    if (!id) {
      return rejectWithValue("Notification ID is required");
    }
    try {
      const response = await axiosInstance.patch(
        `/bannerNotification/deactivate/${id}`
      );
      return { id, ...response.data };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to deactivate banner notification";
      logAction(
        { type: "deactivateBannerNotification/rejected", error: errorMsg },
        { error: errorMsg, id },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Delete all banner notifications (admin only)
export const deleteAllBannerNotifications = createAsyncThunk(
  "bannerNotifications/deleteAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        "/bannerNotification/delete-all"
      );
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to delete all banner notifications";
      logAction(
        { type: "deleteAllBannerNotifications/rejected", error: errorMsg },
        { error: errorMsg },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

// Cleanup expired banner notifications (admin only)
export const cleanupExpiredBannerNotifications = createAsyncThunk(
  "bannerNotifications/cleanupExpired",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/bannerNotification/cleanup-expired"
      );
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to cleanup expired notifications";
      logAction(
        {
          type: "cleanupExpiredBannerNotifications/rejected",
          error: errorMsg,
        },
        { error: errorMsg },
        "BannerNotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

const bannerNotificationSlice = createSlice({
  name: "bannerNotifications",
  initialState: {
    notifications: [],
    dismissedIds: [],
    loading: false,
    error: null,
    lastFetch: null,
  },
  reducers: {
    resetBannerNotifications: (state) => {
      state.notifications = [];
      state.dismissedIds = [];
      state.loading = false;
      state.error = null;
      state.lastFetch = null;
    },
    addBannerNotification: (state, action) => {
      if (!Array.isArray(state.notifications)) {
        state.notifications = [];
      }
      // Check if notification already exists
      const exists = state.notifications.some(
        (n) => n._id === action.payload._id
      );
      if (!exists) {
        state.notifications.unshift(action.payload);
      }
    },
    removeBannerNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n._id !== action.payload
      );
    },
    markAsDismissedLocal: (state, action) => {
      if (!state.dismissedIds.includes(action.payload)) {
        state.dismissedIds.push(action.payload);
      }
      state.notifications = state.notifications.filter(
        (n) => n._id !== action.payload
      );
    },
    clearBannerError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch active notifications
      .addCase(fetchActiveBannerNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveBannerNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.loading = false;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchActiveBannerNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch all notifications
      .addCase(fetchAllBannerNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllBannerNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.loading = false;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchAllBannerNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create notification
      .addCase(createBannerNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBannerNotification.fulfilled, (state, action) => {
        if (!Array.isArray(state.notifications)) {
          state.notifications = [];
        }
        state.notifications.unshift(action.payload);
        state.loading = false;
      })
      .addCase(createBannerNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Dismiss notification
      .addCase(dismissBannerNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(dismissBannerNotification.fulfilled, (state, action) => {
        const { id } = action.payload;
        if (!state.dismissedIds.includes(id)) {
          state.dismissedIds.push(id);
        }
        state.notifications = state.notifications.filter((n) => n._id !== id);
        state.loading = false;
      })
      .addCase(dismissBannerNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Check dismissed status
      .addCase(checkDismissedBannerNotification.fulfilled, (state, action) => {
        if (
          action.payload.dismissed &&
          !state.dismissedIds.includes(action.payload.id)
        ) {
          state.dismissedIds.push(action.payload.id);
        }
      })
      // Deactivate notification
      .addCase(deactivateBannerNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deactivateBannerNotification.fulfilled, (state, action) => {
        const { id } = action.payload;
        state.notifications = state.notifications.map((n) =>
          n._id === id ? { ...n, isActive: false } : n
        );
        state.loading = false;
      })
      .addCase(deactivateBannerNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete all notifications
      .addCase(deleteAllBannerNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAllBannerNotifications.fulfilled, (state) => {
        state.notifications = [];
        state.dismissedIds = [];
        state.loading = false;
      })
      .addCase(deleteAllBannerNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Cleanup expired notifications
      .addCase(cleanupExpiredBannerNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cleanupExpiredBannerNotifications.fulfilled, (state) => {
        state.loading = false;
        // Filter expired locally post-cleanup
        const now = new Date();
        state.notifications = state.notifications.filter(
          (n) => !n.expiresAt || new Date(n.expiresAt) >= now
        );
      })
      .addCase(cleanupExpiredBannerNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  resetBannerNotifications,
  addBannerNotification,
  removeBannerNotification,
  markAsDismissedLocal,
  clearBannerError,
} = bannerNotificationSlice.actions;

const selectBannerNotificationState = (state) =>
  state.bannerNotifications || {};

export const selectBannerNotifications = createSelector(
  [selectBannerNotificationState],
  (bannerNotifications) => {
    const now = new Date();
    return (bannerNotifications.notifications || []).filter(
      (n) => n.isActive && (!n.expiresAt || new Date(n.expiresAt) >= now)
    );
  }
);

export const selectAllBannerNotifications = createSelector(
  [selectBannerNotificationState],
  (bannerNotifications) => bannerNotifications.notifications || []
);

export const selectBannerNotificationLoading = createSelector(
  [selectBannerNotificationState],
  (bannerNotifications) => bannerNotifications.loading || false
);

export const selectBannerNotificationError = createSelector(
  [selectBannerNotificationState],
  (bannerNotifications) => bannerNotifications.error || null
);

export const selectDismissedBannerIds = createSelector(
  [selectBannerNotificationState],
  (bannerNotifications) => bannerNotifications.dismissedIds || []
);

export const selectLastFetch = createSelector(
  [selectBannerNotificationState],
  (bannerNotifications) => bannerNotifications.lastFetch || null
);

export default bannerNotificationSlice.reducer;
