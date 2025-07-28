import {
  createAsyncThunk,
  createSlice,
  createSelector,
} from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Simplified logging for production
const logAction = (action, payload, label) => {
  if (action?.error) {
    console.error(`[${label}] ${action.type} failed`, {
      error: action.error,
      payload,
    });
  }
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/notification/notifications", {
        params: { page, limit },
      });
      const notifications = Array.isArray(response.data?.notifications)
        ? response.data.notifications
        : [];
      return {
        notifications,
        page,
        total: response.data?.total || notifications.length,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to fetch notifications";
      logAction(
        { type: "fetchNotifications/rejected" },
        { error: errorMsg },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/notification/unread-count");
      return Number(response.data?.count) || 0;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to fetch unread count";
      logAction(
        { type: "fetchCount/rejected" },
        { error: errorMsg },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (id, { rejectWithValue }) => {
    if (!id || id === "undefined") {
      const errorMsg = "Invalid notification ID";
      logAction(
        { type: "markAsRead/rejected" },
        { error: errorMsg, id },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
    try {
      const response = await axiosInstance.patch(
        `/notification/mark-as-read/${id}`
      );
      return { id, notification: response.data.notification };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to mark as read";
      logAction(
        { type: "markAsRead/rejected" },
        { error: errorMsg, id },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.patch("/notification/mark-all-as-read");
      return true;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to mark all as read";
      logAction(
        { type: "markAllAsRead/rejected" },
        { error: errorMsg },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const sendAdminNotification = createAsyncThunk(
  "notifications/sendAdminNotification",
  async ({ userId, content, navigateTo }, { rejectWithValue, getState }) => {
    if (!userId || !content) {
      return rejectWithValue("Missing userId or content");
    }
    try {
      const defaultNavigateTo = `/author-profile/${userId}?tab=bank-details`;
      const finalNavigateTo = navigateTo || defaultNavigateTo;
      const { auth } = getState();
      const currentUserId = auth?.user?._id;
      const response = await axiosInstance.post("/notification/admin", {
        userId,
        content,
        navigateTo: finalNavigateTo,
      });
      return currentUserId === userId ? response.data.notification : null;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to send notification";
      logAction(
        { type: "sendAdminNotification/rejected" },
        { error: errorMsg, userId },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const broadcastNotification = createAsyncThunk(
  "notifications/broadcastNotification",
  async ({ content }, { rejectWithValue }) => {
    if (!content) {
      return rejectWithValue("Content is required");
    }
    try {
      await axiosInstance.post("/notification/broadcast", { content });
      return null; // Handled via socket
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to broadcast notification";
      logAction(
        { type: "broadcastNotification/rejected" },
        { error: errorMsg },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const replyToAdminNotification = createAsyncThunk(
  "notifications/reply",
  async ({ notificationId, content }, { rejectWithValue }) => {
    if (!notificationId || !content) {
      return rejectWithValue("Missing notificationId or content");
    }
    try {
      const response = await axiosInstance.post("/notification/reply", {
        notificationId,
        content,
      });
      return response.data.notification;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to reply to notification";
      logAction(
        { type: "replyToAdminNotification/rejected" },
        { error: errorMsg, notificationId },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/delete",
  async (id, { rejectWithValue }) => {
    if (!id || id === "undefined") {
      const errorMsg = "Invalid notification ID";
      logAction(
        { type: "deleteNotification/rejected" },
        { error: errorMsg, id },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
    try {
      await axiosInstance.delete(`/notification/${id}`);
      return id;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to delete notification";
      logAction(
        { type: "deleteNotification/rejected" },
        { error: errorMsg, id },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

export const getUserNotificationHistory = createAsyncThunk(
  "notifications/getUserNotificationHistory",
  async (userId, { rejectWithValue }) => {
    if (!userId) {
      return rejectWithValue("Missing userId");
    }
    try {
      const response = await axiosInstance.get(`/notification/user/${userId}`);
      return Array.isArray(response.data?.notifications)
        ? response.data.notifications
        : [];
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to fetch user history";
      logAction(
        { type: "getUserNotificationHistory/rejected" },
        { error: errorMsg, userId },
        "NotificationSlice"
      );
      return rejectWithValue(errorMsg);
    }
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    unreadCount: 0,
    userNotificationHistory: [],
    loading: false,
    error: null,
    page: 1,
    total: 0,
  },
  reducers: {
    resetNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.userNotificationHistory = [];
      state.loading = false;
      state.error = null;
      state.page = 1;
      state.total = 0;
    },
    addNotification: (state, action) => {
      if (!Array.isArray(state.notifications)) {
        state.notifications = [];
      }
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
      // Trim notifications to prevent memory bloat
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = Number(action.payload) || 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.page = action.payload.page;
        state.total = action.payload.total;
        state.loading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUnreadCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
        state.loading = false;
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(
          (n) => n._id === action.payload.id
        );
        if (index !== -1) {
          state.notifications[index] = {
            ...state.notifications[index],
            ...action.payload.notification,
          };
          if (action.payload.notification.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
        state.loading = false;
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAllAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          read: true,
        }));
        state.unreadCount = 0;
        state.loading = false;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(sendAdminNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendAdminNotification.fulfilled, (state, action) => {
        if (action.payload) {
          if (!Array.isArray(state.notifications)) {
            state.notifications = [];
          }
          state.notifications.unshift(action.payload);
          if (!action.payload.read) {
            state.unreadCount += 1;
          }
        }
        state.loading = false;
      })
      .addCase(sendAdminNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(broadcastNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(broadcastNotification.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(broadcastNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(replyToAdminNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(replyToAdminNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.read) {
          state.unreadCount += 1;
        }
        state.loading = false;
      })
      .addCase(replyToAdminNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(
          (n) => n._id !== action.payload
        );
        state.unreadCount = state.notifications.filter((n) => !n.read).length;
        state.loading = false;
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserNotificationHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserNotificationHistory.fulfilled, (state, action) => {
        state.userNotificationHistory = action.payload;
        state.loading = false;
      })
      .addCase(getUserNotificationHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetNotifications, addNotification, updateUnreadCount } =
  notificationSlice.actions;

const selectNotificationState = (state) => state.notifications || {};

export const selectNotifications = createSelector(
  [selectNotificationState],
  (notifications) => notifications.notifications || []
);

export const selectUnreadCount = createSelector(
  [selectNotificationState],
  (notifications) => notifications.unreadCount || 0
);

export const selectNotificationPage = createSelector(
  [selectNotificationState],
  (notifications) => notifications.page || 1
);

export const selectNotificationTotal = createSelector(
  [selectNotificationState],
  (notifications) => notifications.total || 0
);

export default notificationSlice.reducer;
