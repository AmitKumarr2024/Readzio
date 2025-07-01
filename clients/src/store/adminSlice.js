// store/adminSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const getAllUsers = createAsyncThunk(
  "admin/getAllUsers",
  async ({ page, limit, mode = "paged" }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/users?page=${page}&limit=${limit}`,
        { withCredentials: true }
      );
      return {
        users: response.data.users || [],
        totalUsers: response.data.totalUsers || 0,
        currentPage: page,
        totalPages: response.data.totalPages || 1,
        mode,
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch users"
      );
    }
  }
);

export const toggleBlockUser = createAsyncThunk(
  "admin/toggleBlockUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/users/block/${userId}`
      );
      return { userId, blocked: response.data.message.includes("blocked") };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle block user"
      );
    }
  }
);

export const toggleUserRole = createAsyncThunk(
  "admin/toggleUserRole",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/admin/users/role/${userId}`);
      return {
        userId,
        role: response.data.message.includes("admin") ? "admin" : "user",
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle user role"
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "admin/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      return { userId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete user"
      );
    }
  }
);

export const getAllPosts = createAsyncThunk(
  "admin/getAllPosts",
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/posts?page=${page}&limit=${limit}`
      );
      return {
        posts: response.data.posts,
        totalPosts: response.data.posts.length,
        currentPage: page,
        totalPages: Math.ceil(response.data.posts.length / limit),
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch posts"
      );
    }
  }
);

export const toggleBlockPost = createAsyncThunk(
  "admin/toggleBlockPost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/posts/block/${postId}`
      );
      return { postId, blocked: response.data.message.includes("blocked") };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle block post"
      );
    }
  }
);

export const deletePost = createAsyncThunk(
  "admin/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/admin/posts/${postId}`);
      return { postId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete post"
      );
    }
  }
);

export const createContactMessage = createAsyncThunk(
  "admin/createContactMessage",
  async ({ name, email, subject, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/admin/contact", {
        name,
        email,
        subject,
        message,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create contact message"
      );
    }
  }
);

export const fetchContactMessages = createAsyncThunk(
  "admin/fetchContactMessages",
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/contact-messages?page=${page}&limit=${limit}`
      );
      return {
        messages: response.data.messages,
        totalMessages: response.data.totalMessages,
        currentPage: page,
        totalPages: Math.ceil(response.data.totalMessages / limit),
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch contact messages"
      );
    }
  }
);

export const toggleContactMessageHandled = createAsyncThunk(
  "admin/toggleContactMessageHandled",
  async (messageId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/contact-messages/${messageId}/handled`
      );
      return { messageId, isHandled: response.data.isHandled };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle message status"
      );
    }
  }
);

export const replyContactMessage = createAsyncThunk(
  "admin/replyContactMessage",
  async ({ messageId, subject, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/admin/reply-contact/${messageId}`,
        { subject, message }
      );
      return { messageId, isHandled: true };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to reply to contact message"
      );
    }
  }
);

export const createReport = createAsyncThunk(
  "admin/createReport",
  async ({ postId, reason, details }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/admin/reports", {
        postId,
        reason,
        details,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create report"
      );
    }
  }
);

export const fetchReportedPosts = createAsyncThunk(
  "admin/fetchReportedPosts",
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/reports?page=${page}&limit=${limit}`
      );
      return {
        reports: response.data.reports,
        totalReports: response.data.reports.length,
        currentPage: page,
        totalPages: Math.ceil(response.data.reports.length / limit),
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch reported posts"
      );
    }
  }
);

export const reviewReport = createAsyncThunk(
  "admin/reviewReport",
  async ({ reportId, forwardToAuthor }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/admin/reports/${reportId}`, {
        forwardToAuthor,
      });
      return { reportId, forwardToAuthor, isReviewed: true };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to review report"
      );
    }
  }
);

export const sendReportNotification = createAsyncThunk(
  "admin/sendReportNotification",
  async ({ reportId, subject, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/replies/send-notification",
        { reportId, subject, message }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send notification"
      );
    }
  }
);

export const acknowledgeReport = createAsyncThunk(
  "admin/acknowledgeReport",
  async ({ reportId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/admin/acknowledge-report/${reportId}`
      );
      return { reportId, isAcknowledged: true };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to acknowledge report"
      );
    }
  }
);

export const getAllUsersEarnings = createAsyncThunk(
  "admin/getAllUsersEarnings",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[adminSlice:getAllUsersEarnings] 🚀 Fetching earnings");
      const response = await axiosInstance.get("/earning/admin/earnings", {
        withCredentials: true,
      });
      console.log("[adminSlice:getAllUsersEarnings] ✅ Success:", {
        dataLength: response.data?.length,
      });
      return response.data || [];
    } catch (error) {
      console.error(
        "[adminSlice:getAllUsersEarnings] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users' earnings"
      );
    }
  }
);

export const processBulkPayouts = createAsyncThunk(
  "admin/processBulkPayouts",
  async ({ users }, { rejectWithValue }) => {
    try {
      console.log("[adminSlice:processBulkPayouts] 🚀 Processing payouts:", {
        users,
      });
      const response = await axiosInstance.post(
        "/earning/admin/payouts",
        { users },
        { withCredentials: true }
      );
      console.log("[adminSlice:processBulkPayouts] ✅ Success:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "[adminSlice:processBulkPayouts] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to process bulk payouts"
      );
    }
  }
);

export const fetchSiteAnalytics = createAsyncThunk(
  "admin/fetchSiteAnalytics",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/analytics?startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch site analytics"
      );
    }
  }
);

export const clearError = createAsyncThunk("admin/clearError", async () => {
  return null;
});

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    users: [],
    totalUsers: 0,
    posts: [],
    totalPosts: 0,
    contactMessages: [],
    totalMessages: 0,
    reports: [],
    totalReports: 0,
    userEarnings: [],
    currentPageUsers: 1,
    totalPagesUsers: 1,
    currentPagePosts: 1,
    totalPagesPosts: 1,
    currentPageMessages: 1,
    totalPagesMessages: 1,
    currentPageReports: 1,
    totalPagesReports: 1,
    analytics: {
      traffic: {
        totalVisits: 0,
        totalTimeSpent: 0,
        uniqueUsersCount: 0,
        uniquePostsCount: 0,
      },
      topPosts: [],
      topUsers: [],
    },
    loading: false,
    error: null,
    notificationStatus: null,
    analyticsLoading: false,
    analyticsError: null,
  },
  reducers: {
    clearNotificationStatus: (state) => {
      console.log(
        "[adminSlice:clearNotificationStatus] 🗑️ Clearing notification status"
      );
      state.notificationStatus = null;
    },
    socketNewContactMessage: (state, action) => {
      console.log(
        "[adminSlice:socketNewContactMessage] 📬 New contact message:",
        action.payload
      );
      const newMessage = action.payload;
      state.contactMessages = [newMessage, ...state.contactMessages].slice(
        0,
        10
      );
      state.totalMessages += 1;
      state.totalPagesMessages = Math.ceil(state.totalMessages / 10);
    },
    socketNewReport: (state, action) => {
      console.log(
        "[adminSlice:socketNewReport] 🚨 New report:",
        action.payload
      );
      const newReport = action.payload;
      state.reports = [newReport, ...state.reports].slice(0, 10);
      state.totalReports += 1;
      state.totalPagesReports = Math.ceil(state.totalReports / 10);
    },
    socketReportReviewed: (state, action) => {
      console.log(
        "[adminSlice:socketReportReviewed] ✅ Report reviewed:",
        action.payload
      );
      const { reportId, forwardToAuthor } = action.payload;
      state.reports = state.reports.map((report) =>
        report._id === reportId
          ? { ...report, isReviewed: true, forwardedToAuthor: forwardToAuthor }
          : report
      );
    },
    socketReportAcknowledged: (state, action) => {
      console.log(
        "[adminSlice:socketReportAcknowledged] ✅ Report acknowledged:",
        action.payload
      );
      const { reportId } = action.payload;
      state.reports = state.reports.map((report) =>
        report._id === reportId ? { ...report, isAcknowledged: true } : report
      );
    },
    socketContactMessageReplied: (state, action) => {
      console.log(
        "[adminSlice:socketContactMessageReplied] ✅ Message replied:",
        action.payload
      );
      const { messageId } = action.payload;
      state.contactMessages = state.contactMessages.map((msg) =>
        msg._id === messageId ? { ...msg, isHandled: true } : msg
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllUsers.pending, (state) => {
        console.log("[adminSlice:getAllUsers] ⏳ Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        console.log("[adminSlice:getAllUsers] ✅ Fulfilled:", action.payload);
        const { users, totalUsers, currentPage, totalPages, mode } =
          action.payload;
        if (mode === "full") {
          state.allUsers = users;
        } else {
          state.users = users;
          state.totalUsers = totalUsers;
          state.currentPageUsers = currentPage;
          state.totalPagesUsers = totalPages;
        }
        state.loading = false;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        console.log("[adminSlice:getAllUsers] 🔥 Rejected:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleBlockUser.fulfilled, (state, action) => {
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, blocked: action.payload.blocked }
            : user
        );
      })
      .addCase(toggleUserRole.fulfilled, (state, action) => {
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, role: action.payload.role }
            : user
        );
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(
          (user) => user._id !== action.payload.userId
        );
        state.totalUsers -= 1;
        state.totalPagesUsers = Math.ceil(state.totalUsers / 10);
      })
      .addCase(getAllPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.totalPosts = action.payload.totalPosts;
        state.currentPagePosts = action.payload.currentPage;
        state.totalPagesPosts = action.payload.totalPages;
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleBlockPost.fulfilled, (state, action) => {
        state.posts = state.posts.map((post) =>
          post._id === action.payload.postId
            ? { ...post, blocked: action.payload.blocked }
            : post
        );
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(
          (post) => post._id !== action.payload.postId
        );
        state.totalPosts -= 1;
        state.totalPagesPosts = Math.ceil(state.totalPosts / 10);
      })
      .addCase(createContactMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContactMessage.fulfilled, (state) => {
        state.loading = false;
        state.notificationStatus = "Contact message created successfully";
      })
      .addCase(createContactMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContactMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContactMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.contactMessages = action.payload.messages;
        state.totalMessages = action.payload.totalMessages;
        state.currentPageMessages = action.payload.currentPage;
        state.totalPagesMessages = action.payload.totalPages;
      })
      .addCase(fetchContactMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleContactMessageHandled.fulfilled, (state, action) => {
        state.contactMessages = state.contactMessages.map((msg) =>
          msg._id === action.payload.messageId
            ? { ...msg, isHandled: action.payload.isHandled }
            : msg
        );
      })
      .addCase(replyContactMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(replyContactMessage.fulfilled, (state, action) => {
        state.contactMessages = state.contactMessages.map((msg) =>
          msg._id === action.payload.messageId
            ? { ...msg, isHandled: true }
            : msg
        );
        state.notificationStatus = "Reply sent successfully";
        // Do NOT set loading = false here — let the modal handle it
      })
      .addCase(replyContactMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReport.fulfilled, (state) => {
        state.loading = false;
        state.notificationStatus = "Report submitted successfully";
      })
      .addCase(createReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchReportedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportedPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports;
        state.totalReports = action.payload.totalReports;
        state.currentPageReports = action.payload.currentPage;
        state.totalPagesReports = action.payload.totalPages;
      })
      .addCase(fetchReportedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(reviewReport.fulfilled, (state, action) => {
        state.reports = state.reports.map((report) =>
          report._id === action.payload.reportId
            ? {
                ...report,
                isReviewed: true,
                forwardedToAuthor: action.payload.forwardToAuthor,
              }
            : report
        );
      })
      .addCase(sendReportNotification.fulfilled, (state) => {
        state.notificationStatus = "Notification sent successfully";
      })
      .addCase(acknowledgeReport.fulfilled, (state, action) => {
        state.reports = state.reports.map((report) =>
          report._id === action.payload.reportId
            ? { ...report, isAcknowledged: true }
            : report
        );
      })
      .addCase(getAllUsersEarnings.pending, (state) => {
        console.log("[adminSlice:getAllUsersEarnings] ⏳ Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsersEarnings.fulfilled, (state, action) => {
        console.log("[adminSlice:getAllUsersEarnings] ✅ Fulfilled:", {
          payload: action.payload,
        });
        state.loading = false;
        state.userEarnings = action.payload || [];
      })
      .addCase(getAllUsersEarnings.rejected, (state, action) => {
        console.log(
          "[adminSlice:getAllUsersEarnings] 🔥 Rejected:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(processBulkPayouts.pending, (state) => {
        console.log("[adminSlice:processBulkPayouts] ⏳ Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(processBulkPayouts.fulfilled, (state, action) => {
        console.log(
          "[adminSlice:processBulkPayouts] ✅ Fulfilled:",
          action.payload
        );
        state.loading = false;
        state.notificationStatus = "Bulk payouts processed successfully";
      })
      .addCase(processBulkPayouts.rejected, (state, action) => {
        console.log(
          "[adminSlice:processBulkPayouts] 🔥 Rejected:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSiteAnalytics.pending, (state) => {
        console.log("[adminSlice:fetchSiteAnalytics] ⏳ Pending");
        state.analyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchSiteAnalytics.fulfilled, (state, action) => {
        console.log(
          "[adminSlice:fetchSiteAnalytics] ✅ Fulfilled:",
          action.payload
        );
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchSiteAnalytics.rejected, (state, action) => {
        console.log(
          "[adminSlice:fetchSiteAnalytics] 🔥 Rejected:",
          action.payload
        );
        state.analyticsLoading = false;
        state.analyticsError = action.payload;
      })
      .addCase(clearError.fulfilled, (state) => {
        console.log("[adminSlice:clearError] ✅ Fulfilled");
        state.error = null;
        state.analyticsError = null;
      });
  },
});

export const {
  clearNotificationStatus,
  socketNewContactMessage,
  socketNewReport,
  socketReportReviewed,
  socketReportAcknowledged,
  socketContactMessageReplied,
} = adminSlice.actions;

export default adminSlice.reducer;
