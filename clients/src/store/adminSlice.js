import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Configure axiosInstance with timeout
axiosInstance.defaults.timeout = 10000; // 10-second timeout

// Retry utility for handling transient errors
const retryRequest = async (fn, retries = 2, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ============== NEW EMAIL SENDING ACTIONS ==============

// Send verification email
export const sendVerificationEmail = createAsyncThunk(
  "admin/sendVerificationEmail",
  async ({ email, name }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/send-verification-email",
        { email, name },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[sendVerificationEmail] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send verification email"
      );
    }
  }
);

// Send welcome email
export const sendWelcomeEmail = createAsyncThunk(
  "admin/sendWelcomeEmail",
  async ({ email, name }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/send-welcome-email",
        { email, name },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[sendWelcomeEmail] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send welcome email"
      );
    }
  }
);

// Send password reset email
export const sendPasswordResetEmail = createAsyncThunk(
  "admin/sendPasswordResetEmail",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/send-reset-password-email",
        { email },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[sendPasswordResetEmail] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send password reset email"
      );
    }
  }
);

// Send invoice email
export const sendInvoiceEmail = createAsyncThunk(
  "admin/sendInvoiceEmail",
  async ({ email, name, invoiceData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/send-invoice-email",
        { email, name, invoiceData },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[sendInvoiceEmail] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send invoice email"
      );
    }
  }
);

// ============== EXISTING ACTIONS ==============

// Fetch all users
export const getAllUsers = createAsyncThunk(
  "admin/getAllUsers",
  async ({ page, limit, mode = "paged" }, { rejectWithValue }) => {
    try {
      const response = await retryRequest(() =>
        axiosInstance.get(`/admin/users?page=${page}&limit=${limit}`, {
          withCredentials: true,
        })
      );
      return {
        users: response.data.users || [],
        totalUsers: response.data.totalUsers || 0,
        currentPage: page,
        totalPages: response.data.totalPages || 1,
        mode,
      };
    } catch (err) {
      console.error("[getAllUsers] Error:", {
        message: err.response?.data?.message || err.message,
        status: err.response?.status,
        page,
        limit,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch users"
      );
    }
  }
);

// Toggle block user
export const toggleBlockUser = createAsyncThunk(
  "admin/toggleBlockUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/users/block/${userId}`,
        {},
        { withCredentials: true }
      );
      return { userId, blocked: response.data.message.includes("blocked") };
    } catch (error) {
      console.error("[toggleBlockUser] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle block user"
      );
    }
  }
);

// Toggle user role
export const toggleUserRole = createAsyncThunk(
  "admin/toggleUserRole",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/users/role/${userId}`,
        {},
        { withCredentials: true }
      );
      return {
        userId,
        role: response.data.message.includes("admin") ? "admin" : "user",
      };
    } catch (error) {
      console.error("[toggleUserRole] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle user role"
      );
    }
  }
);

// Delete user
export const deleteUser = createAsyncThunk(
  "admin/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`, {
        withCredentials: true,
      });
      return { userId };
    } catch (error) {
      console.error("[deleteUser] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete user"
      );
    }
  }
);

// Fetch all posts with retry and fallback
export const getAllPosts = createAsyncThunk(
  "admin/getAllPosts",
  async (
    {
      page = 1,
      limit = 10,
      search = "",
      sortField = "title",
      sortOrder = "asc",
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await retryRequest(() =>
        axiosInstance.get(
          `/admin/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(
            search
          )}&sortField=${sortField}&sortOrder=${sortOrder}`,
          { withCredentials: true }
        )
      );
      return {
        posts: response.data.posts || [],
        totalPosts: response.data.totalCount || 0,
        currentPage: page,
        totalPages: Math.ceil(response.data.totalCount / limit) || 1,
      };
    } catch (error) {
      console.error("[getAllPosts] Error:", {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        page,
        limit,
        search,
        sortField,
        sortOrder,
        timestamp: new Date().toISOString(),
      });
      if (error.response?.status === 502) {
        console.warn(
          "[getAllPosts] 502 Bad Gateway detected, returning fallback data"
        );
        return {
          posts: [],
          totalPosts: 0,
          currentPage: page,
          totalPages: 1,
          error: "Server unavailable, please try again later",
        };
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch posts"
      );
    }
  }
);

// Toggle block post
export const toggleBlockPost = createAsyncThunk(
  "admin/toggleBlockPost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/posts/block/${postId}`,
        {},
        { withCredentials: true }
      );
      return { postId, blocked: response.data.message.includes("blocked") };
    } catch (error) {
      console.error("[toggleBlockPost] Error:", {
        message: error.response?.data?.message || error.message,
        postId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle block post"
      );
    }
  }
);

// Delete post
export const deletePost = createAsyncThunk(
  "admin/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/admin/posts/${postId}`, {
        withCredentials: true,
      });
      return { postId };
    } catch (error) {
      console.error("[deletePost] Error:", {
        message: error.response?.data?.message || error.message,
        postId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete post"
      );
    }
  }
);

// Create contact message
export const createContactMessage = createAsyncThunk(
  "admin/createContactMessage",
  async ({ name, email, subject, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/contact",
        { name, email, subject, message },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[createContactMessage] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to create contact message"
      );
    }
  }
);

// Fetch contact messages
export const fetchContactMessages = createAsyncThunk(
  "admin/fetchContactMessages",
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/contact-messages?page=${page}&limit=${limit}`,
        { withCredentials: true }
      );
      return {
        messages: response.data.messages || [],
        totalMessages: response.data.totalMessages || 0,
        currentPage: page,
        totalPages: Math.ceil(response.data.totalMessages / limit) || 1,
      };
    } catch (error) {
      console.error("[fetchContactMessages] Error:", {
        message: error.response?.data?.message || error.message,
        page,
        limit,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch contact messages"
      );
    }
  }
);

// Toggle contact message handled status
export const toggleContactMessageHandled = createAsyncThunk(
  "admin/toggleContactMessageHandled",
  async (messageId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/contact-messages/${messageId}/handled`,
        {},
        { withCredentials: true }
      );
      return { messageId, isHandled: response.data.isHandled };
    } catch (error) {
      console.error("[toggleContactMessageHandled] Error:", {
        message: error.response?.data?.message || error.message,
        messageId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle message status"
      );
    }
  }
);

// Reply to contact message
export const replyContactMessage = createAsyncThunk(
  "admin/replyContactMessage",
  async ({ messageId, subject, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/admin/reply-contact/${messageId}`,
        { subject, message },
        { withCredentials: true }
      );
      return { messageId, isHandled: true };
    } catch (error) {
      console.error("[replyContactMessage] Error:", {
        message: error.response?.data?.message || error.message,
        messageId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to reply to contact message"
      );
    }
  }
);

// Create report
export const createReport = createAsyncThunk(
  "admin/createReport",
  async ({ postId, reason, details }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/reports",
        { postId, reason, details },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[createReport] Error:", {
        message: error.response?.data?.message || error.message,
        postId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to create report"
      );
    }
  }
);

// Fetch reported posts
export const fetchReportedPosts = createAsyncThunk(
  "admin/fetchReportedPosts",
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/reports?page=${page}&limit=${limit}`,
        { withCredentials: true }
      );
      return {
        reports: response.data.reports || [],
        totalReports: response.data.reports?.length || 0,
        currentPage: page,
        totalPages: Math.ceil(response.data.reports?.length / limit) || 1,
      };
    } catch (error) {
      console.error("[fetchReportedPosts] Error:", {
        message: error.response?.data?.message || error.message,
        page,
        limit,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch reported posts"
      );
    }
  }
);

// Review report
export const reviewReport = createAsyncThunk(
  "admin/reviewReport",
  async ({ reportId, forwardToAuthor }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/reports/${reportId}`,
        { forwardToAuthor },
        { withCredentials: true }
      );
      return { reportId, forwardToAuthor, isReviewed: true };
    } catch (error) {
      console.error("[reviewReport] Error:", {
        message: error.response?.data?.message || error.message,
        reportId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to review report"
      );
    }
  }
);

// Send report notification
export const sendReportNotification = createAsyncThunk(
  "admin/sendReportNotification",
  async ({ reportId, subject, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/replies/send-notification",
        { reportId, subject, message },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[sendReportNotification] Error:", {
        message: error.response?.data?.message || error.message,
        reportId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send notification"
      );
    }
  }
);

// Acknowledge report
export const acknowledgeReport = createAsyncThunk(
  "admin/acknowledgeReport",
  async ({ reportId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/admin/acknowledge-report/${reportId}`,
        {},
        { withCredentials: true }
      );
      return { reportId, isAcknowledged: true };
    } catch (error) {
      console.error("[acknowledgeReport] Error:", {
        message: error.response?.data?.message || error.message,
        reportId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to acknowledge report"
      );
    }
  }
);

// Fetch all users' earnings
export const getAllUsersEarnings = createAsyncThunk(
  "admin/getAllUsersEarnings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/earning/admin/earnings", {
        withCredentials: true,
      });
      return response.data || [];
    } catch (error) {
      console.error("[getAllUsersEarnings] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users' earnings"
      );
    }
  }
);

// Process bulk payouts
export const processBulkPayouts = createAsyncThunk(
  "admin/processBulkPayouts",
  async ({ users }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/earning/admin/payouts",
        { users },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[processBulkPayouts] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to process bulk payouts"
      );
    }
  }
);

// Fetch site analytics
export const fetchSiteAnalytics = createAsyncThunk(
  "admin/fetchSiteAnalytics",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/analytics?startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      );
      return response.data.data || {};
    } catch (error) {
      console.error("[fetchSiteAnalytics] Error:", {
        message: error.response?.data?.message || error.message,
        startDate,
        endDate,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch site analytics"
      );
    }
  }
);

// Clear error
export const clearError = createAsyncThunk("admin/clearError", async () => {
  return null;
});

// Send enhanced daily post email (updated path)
export const sendEnhancedDailyPostEmail = createAsyncThunk(
  "admin/sendEnhancedDailyPostEmail",
  async (
    {
      forceRun = false,
      testMode = false,
      maxUsers = null,
      skipEligibilityCheck = false,
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        "/dailyMail/daily-post",
        {
          forceRun,
          testMode,
          maxUsers,
          skipEligibilityCheck,
        },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[sendEnhancedDailyPostEmail] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to send enhanced daily post emails"
      );
    }
  }
);

// Check user eligibility for emails (NEW)
export const checkUserEmailEligibility = createAsyncThunk(
  "admin/checkUserEmailEligibility",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/dailyMail/check-user-eligibility/${userId}`,
        { withCredentials: true }
      );
      return {
        userId,
        ...response.data,
      };
    } catch (error) {
      console.error("[checkUserEmailEligibility] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to check user email eligibility"
      );
    }
  }
);

// Get bounce statistics (NEW)
export const getBounceStatistics = createAsyncThunk(
  "admin/getBounceStatistics",
  async ({ days = 30 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/dailyMail/bounce-stats?days=${days}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[getBounceStatistics] Error:", {
        message: error.response?.data?.message || error.message,
        days,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to get bounce statistics"
      );
    }
  }
);

// Remove email from suppression list (NEW)
export const removeEmailSuppression = createAsyncThunk(
  "admin/removeEmailSuppression",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/dailyMail/remove-suppression",
        { email },
        { withCredentials: true }
      );
      return {
        email,
        ...response.data,
      };
    } catch (error) {
      console.error("[removeEmailSuppression] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove email suppression"
      );
    }
  }
);

// Test single email functionality (NEW)
export const testSingleEmail = createAsyncThunk(
  "admin/testSingleEmail",
  async ({ email, type = "test" }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/dailyMail/test-email",
        { email, type },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[testSingleEmail] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        type,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send test email"
      );
    }
  }
);

// Get email system health (NEW)
export const getEmailSystemHealth = createAsyncThunk(
  "admin/getEmailSystemHealth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/dailyMail/email-health", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("[getEmailSystemHealth] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to get email system health"
      );
    }
  }
);

// Enhanced daily post email report (UPDATED to use new path)
export const getDailyPostEmailReport = createAsyncThunk(
  "admin/getDailyPostEmailReport",
  async (
    { page = 1, limit = 10, date, status, includeStats = true },
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        includeStats: includeStats.toString(),
      });

      if (date) queryParams.append("date", date);
      if (status) queryParams.append("status", status);

      const response = await axiosInstance.get(
        `/dailyMail/daily-post-report?${queryParams.toString()}`,
        { withCredentials: true }
      );
      return {
        emailReports: response.data.logs || [],
        totalEmails: response.data.pagination?.total || 0,
        currentPage: page,
        totalPages: response.data.pagination?.totalPages || 1,
        stats: response.data.stats || {},
        dailyStats: response.data.dailyStats || null,
      };
    } catch (error) {
      console.error("[getDailyPostEmailReport] Error:", {
        message: error.response?.data?.message || error.message,
        page,
        limit,
        date,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch daily post email report"
      );
    }
  }
);

// Batch check user eligibility (NEW)
export const batchCheckEmailEligibility = createAsyncThunk(
  "admin/batchCheckEmailEligibility",
  async ({ userIds, eligibilityType = "dailyEmail" }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/dailyMail/batch-operations",
        {
          operation: "check-eligibility",
          data: { userIds },
        },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[batchCheckEmailEligibility] Error:", {
        message: error.response?.data?.message || error.message,
        userIds: userIds?.length,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to batch check email eligibility"
      );
    }
  }
);

// Record reading time
export const recordReadingTime = createAsyncThunk(
  "admin/recordReadingTime",
  async ({ postId, timeSpent }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/reading-time",
        { postId, timeSpent },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[recordReadingTime] Error:", {
        message: error.response?.data?.message || error.message,
        postId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to record reading time"
      );
    }
  }
);

// Get reading details by post
export const getReadingDetailsByPost = createAsyncThunk(
  "admin/getReadingDetailsByPost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/reading-details/${postId}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[getReadingDetailsByPost] Error:", {
        message: error.response?.data?.message || error.message,
        postId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch reading details"
      );
    }
  }
);

export const deleteAllNotifications = createAsyncThunk(
  "admin/deleteAllNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete("/notifications", {
        withCredentials: true,
      });
      if (response.data.success) {
        return {
          deletedCount: response.data.data?.deletedCount || 0,
          message: response.data.message,
        };
      }
      return rejectWithValue("Failed to delete notifications");
    } catch (error) {
      console.error("[deleteAllNotifications] Error:", {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete all notifications"
      );
    }
  }
);

// Download all data as Excel
export const downloadAllDataCsv = createAsyncThunk(
  "admin/downloadAllDataCsv",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/admin/download-csv", {
        withCredentials: true,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "readzio_official_details_data.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    } catch (error) {
      console.error("[downloadAllDataCsv] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to download Excel"
      );
    }
  }
);

// Fetch all subscription plans
export const getAllSubscriptionPlans = createAsyncThunk(
  "admin/getAllSubscriptionPlans",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/admin/subscriptions/plans", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("[getAllSubscriptionPlans] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch subscription plans"
      );
    }
  }
);

// Toggle user eligibility for subscription creation
export const toggleUserEligibility = createAsyncThunk(
  "admin/toggleUserEligibility",
  async ({ userId, enable }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/subscriptions/eligibility/toggle",
        { userId, enable },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[toggleUserEligibility] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        enable,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle user eligibility"
      );
    }
  }
);

// Update global eligibility criteria
export const updateGlobalEligibilityCriteria = createAsyncThunk(
  "admin/updateGlobalEligibilityCriteria",
  async (
    { minFollowers, minPosts, minEngagementRate, minAccountAgeDays },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await axiosInstance.patch(
        "/admin/subscriptions/criteria",
        { minFollowers, minPosts, minEngagementRate, minAccountAgeDays },
        { withCredentials: true }
      );
      dispatch({
        type: "subscription/syncSubscriptionCriteria",
        payload: response.data.criteria || {
          minFollowers,
          minPosts,
          minEngagementRate,
          minAccountAgeDays,
        },
      });
      return (
        response.data.criteria || {
          minFollowers,
          minPosts,
          minEngagementRate,
          minAccountAgeDays,
        }
      );
    } catch (error) {
      console.error("[updateGlobalEligibilityCriteria] Error:", {
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to update eligibility criteria"
      );
    }
  }
);

// Check user eligibility status
export const checkUserEligibility = createAsyncThunk(
  "admin/checkUserEligibility",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/subscriptions/eligibility/${userId}`,
        { withCredentials: true }
      );
      return {
        ...response.data,
        criteria: response.data.criteria || {
          minFollowers: 1000,
          minPosts: 30,
          minEngagementRate: 0.02,
          minAccountAgeDays: 30,
        },
      };
    } catch (error) {
      console.error("[checkUserEligibility] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      if (
        error.response?.data?.message === "Subscription configuration not found"
      ) {
        return {
          isEligible: false,
          followerCount: 0,
          postCount: 0,
          engagementRate: 0,
          accountAgeDays: 0,
          criteria: {
            minFollowers: 1000,
            minPosts: 30,
            minEngagementRate: 0.02,
            minAccountAgeDays: 30,
          },
          message:
            "Subscription configuration not found, using default criteria",
        };
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to check user eligibility"
      );
    }
  }
);

// Toggle subscription plan status
export const toggleSubscriptionPlanStatus = createAsyncThunk(
  "admin/toggleSubscriptionPlanStatus",
  async ({ planId, status }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/subscriptions/plan/status`,
        { planId, status },
        { withCredentials: true }
      );
      return response.data.plan;
    } catch (error) {
      console.error("[toggleSubscriptionPlanStatus] Error:", {
        message: error.response?.data?.message || error.message,
        planId,
        status,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to toggle subscription plan status"
      );
    }
  }
);

// Grant/revoke subscription creation access
export const grantSubscriptionAccess = createAsyncThunk(
  "admin/grantSubscriptionAccess",
  async ({ userId, grant }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/subscriptions/grant",
        { userId, grant },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[grantSubscriptionAccess] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        grant,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to grant subscription access"
      );
    }
  }
);

// Set per-user subscription eligibility override
export const setUserEligibilityOverride = createAsyncThunk(
  "admin/setUserEligibilityOverride",
  async (
    { userId, isEligibleForSubscription, bypassSubscriptionCriteria },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/subscriptions/user-override/${userId}`,
        { isEligibleForSubscription, bypassSubscriptionCriteria },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[setUserEligibilityOverride] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to update user eligibility override"
      );
    }
  }
);

// Override user milestone
export const overrideUserMilestones = createAsyncThunk(
  "adminOverride/overrideUserMilestones",
  async ({ userId, overrideData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/subscriptions/user-milestone/${userId}`,
        overrideData,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[overrideUserMilestones] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to override user milestones"
      );
    }
  }
);

// Reset user milestone
export const resetUserMilestones = createAsyncThunk(
  "adminOverride/resetUserMilestones",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/subscriptions/user-milestone-reset/${userId}`,
        {},
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[resetUserMilestones] Error:", {
        message: error.response?.data?.message || error.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to reset user milestones"
      );
    }
  }
);

// Fetch all email statuses
export const getAllEmailStatuses = createAsyncThunk(
  "admin/getAllEmailStatuses",
  async ({ page = 1, limit = 10, status = "" }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) queryParams.append("status", status);
      const response = await axiosInstance.get(
        `/admin/all-email-statuses?${queryParams.toString()}`,
        { withCredentials: true }
      );
      return {
        emailStatuses: response.data.statuses || [],
        totalEmails: response.data.total || 0,
        currentPage: page,
        totalPages: response.data.totalPages || 1,
      };
    } catch (error) {
      console.error("[getAllEmailStatuses] Error:", {
        message: error.response?.data?.message || error.message,
        page,
        limit,
        status,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch email statuses"
      );
    }
  }
);

// Check email status
export const checkEmailStatus = createAsyncThunk(
  "admin/checkEmailStatus",
  async ({ email, type = "dailyEmail" }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/email-status?email=${encodeURIComponent(email)}&type=${type}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("[checkEmailStatus] Error:", {
        message: error.response?.data?.message || error.message,
        email,
        type,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to check email status"
      );
    }
  }
);

// Retry failed emails
export const retryFailedEmails = createAsyncThunk(
  "admin/retryFailedEmails",
  async ({ emails, type = "dailyEmail" }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/retry-failed-emails",
        { emails, type },
        { withCredentials: true }
      );
      return response.data.results || [];
    } catch (error) {
      console.error("[retryFailedEmails] Error:", {
        message: error.response?.data?.message || error.message,
        emails,
        type,
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to retry emails"
      );
    }
  }
);

// Send direct email
export const sendDirectEmail = createAsyncThunk(
  "admin/sendDirectEmail",
  async ({ email }, { rejectWithValue }) => {
    try {
      if (!email) {
        console.error("[sendDirectEmail] Error:", {
          message: "Email is required",
          timestamp: new Date().toISOString(),
        });
        return rejectWithValue("Email is required");
      }
      const response = await axiosInstance.post(
        "/dailyMail/send-direct-email",
        { email },
        { withCredentials: true }
      );
      console.log("[sendDirectEmail] Success:", {
        email,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("[sendDirectEmail] Error:", {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        email,
        errorDetails: error.response?.data?.errorDetails || {},
        timestamp: new Date().toISOString(),
      });
      return rejectWithValue(
        error.response?.data?.message || "Failed to send direct email"
      );
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    users: [],
    bannerNotifications: [],
    totalUsers: 0,
    allUsers: [],
    posts: [],
    plans: [],
    totalPosts: 0,
    contactMessages: [],
    totalMessages: 0,
    reports: [],
    totalPlans: 0,
    currentPagePlans: 1,
    totalPagesPlans: 1,
    hasMorePlans: true,
    totalReports: 0,
    userEarnings: [],
    emailStatuses: [],
    totalEmails: 0,
    currentPageEmails: 1,
    totalPagesEmails: 1,
    currentEmailStatus: null,
    currentPageUsers: 1,
    totalPagesUsers: 1,
    currentPagePosts: 1,
    totalPagesPosts: 1,
    currentPageMessages: 1,
    totalPagesMessages: 1,
    currentPageReports: 1,
    totalPagesReports: 1,
    subscriptionCriteria: null,
    userEligibility: null,
    overrideInfo: null,
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
    // NEW EMAIL MANAGEMENT STATE
    bounceStatistics: null,
    emailSystemHealth: null,
    userEmailEligibility: {},
    suppressedEmails: [],
    dailyEmailStatus: null,
    emailTestResult: null,
    batchEligibilityResults: null,
    emailReportStats: null,
    // EMAIL SENDING STATE
    sendingEmail: false,
    // EXISTING STATE
    loading: false,
    error: null,
    notificationStatus: null,
    analyticsLoading: false,
    analyticsError: null,
    emailLoading: false,
    emailError: null,
    emailReports: [],
    totalEmailReports: 0,
    currentPageEmailReports: 1,
    totalPagesEmailReports: 1,
    subscriptionLoading: false,
    subscriptionError: null,
  },
  reducers: {
    clearNotificationStatus: (state) => {
      state.notificationStatus = null;
    },
    setEmailError: (state, action) => {
      state.emailError = action.payload;
    },
    // NEW EMAIL MANAGEMENT REDUCERS
    clearEmailTestResult: (state) => {
      state.emailTestResult = null;
    },
    clearBatchEligibilityResults: (state) => {
      state.batchEligibilityResults = null;
    },
    updateUserEmailEligibility: (state, action) => {
      const { userId, eligibility } = action.payload;
      state.userEmailEligibility[userId] = eligibility;
    },
    socketNewContactMessage: (state, action) => {
      const newMessage = action.payload;
      state.contactMessages = [newMessage, ...state.contactMessages].slice(
        0,
        10
      );
      state.totalMessages += 1;
      state.totalPagesMessages = Math.ceil(state.totalMessages / 10);
    },
    socketNewReport: (state, action) => {
      const newReport = action.payload;
      state.reports = [newReport, ...state.reports].slice(0, 10);
      state.totalReports += 1;
      state.totalPagesReports = Math.ceil(state.totalReports / 10);
    },
    socketReportReviewed: (state, action) => {
      const { reportId, forwardToAuthor } = action.payload;
      state.reports = state.reports.map((report) =>
        report._id === reportId
          ? { ...report, isReviewed: true, forwardedToAuthor: forwardToAuthor }
          : report
      );
    },
    socketReportAcknowledged: (state, action) => {
      const { reportId } = action.payload;
      state.reports = state.reports.map((report) =>
        report._id === reportId ? { ...report, isAcknowledged: true } : report
      );
    },
    socketContactMessageReplied: (state, action) => {
      const { messageId } = action.payload;
      state.contactMessages = state.contactMessages.map((msg) =>
        msg._id === messageId ? { ...msg, isHandled: true } : msg
      );
    },
    setNotificationStatus: (state, action) => {
      state.notificationStatus = action.payload;
    },
    updatePostBlockStatus: (state, action) => {
      const { postId, blocked } = action.payload;
      const index = state.posts.findIndex((post) => post._id === postId);
      if (index !== -1) {
        state.posts[index].blocked = blocked;
      }
    },
    updateSubscriptionPlanStatus: (state, action) => {
      const { planId, status } = action.payload;
      const plan = state.plans.find((p) => p._id === planId);
      if (plan) {
        plan.status = status;
      }
    },
    logSubscriptionCriteria: (state) => {
      // console.log(
      //   "[logSubscriptionCriteria] Current subscriptionCriteria:",
      //   state.subscriptionCriteria
      // );
    },
    clearOverrideStatus: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.overrideInfo = null;
    },
    clearDirectEmailResult: (state) => {
      state.directEmailResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ============== EMAIL SENDING REDUCERS ==============
      .addCase(sendVerificationEmail.pending, (state) => {
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendVerificationEmail.fulfilled, (state) => {
        state.sendingEmail = false;
        state.notificationStatus = "Verification email sent successfully";
      })
      .addCase(sendVerificationEmail.rejected, (state, action) => {
        state.sendingEmail = false;
        state.error = action.payload;
      })
      .addCase(sendWelcomeEmail.pending, (state) => {
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendWelcomeEmail.fulfilled, (state) => {
        state.sendingEmail = false;
        state.notificationStatus = "Welcome email sent successfully";
      })
      .addCase(sendWelcomeEmail.rejected, (state, action) => {
        state.sendingEmail = false;
        state.error = action.payload;
      })
      .addCase(sendPasswordResetEmail.pending, (state) => {
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendPasswordResetEmail.fulfilled, (state) => {
        state.sendingEmail = false;
        state.notificationStatus = "Password reset email sent successfully";
      })
      .addCase(sendPasswordResetEmail.rejected, (state, action) => {
        state.sendingEmail = false;
        state.error = action.payload;
      })
      .addCase(sendInvoiceEmail.pending, (state) => {
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendInvoiceEmail.fulfilled, (state) => {
        state.sendingEmail = false;
        state.notificationStatus = "Invoice email sent successfully";
      })
      .addCase(sendInvoiceEmail.rejected, (state, action) => {
        state.sendingEmail = false;
        state.error = action.payload;
      })
      // ============== EXISTING REDUCERS ==============
      // getAllUsers
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
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
        state.loading = false;
        state.error = action.payload;
      })
      // toggleBlockUser
      .addCase(toggleBlockUser.fulfilled, (state, action) => {
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, blocked: action.payload.blocked }
            : user
        );
      })
      .addCase(toggleBlockUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      // toggleUserRole
      .addCase(toggleUserRole.fulfilled, (state, action) => {
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, role: action.payload.role }
            : user
        );
      })
      .addCase(toggleUserRole.rejected, (state, action) => {
        state.error = action.payload;
      })
      // deleteUser
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(
          (user) => user._id !== action.payload.userId
        );
        state.totalUsers -= 1;
        state.totalPagesUsers = Math.ceil(state.totalUsers / 10);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      // getAllPosts
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
        state.error = action.payload.error || null; // Handle 502 fallback
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // toggleBlockPost
      .addCase(toggleBlockPost.fulfilled, (state, action) => {
        state.posts = state.posts.map((post) =>
          post._id === action.payload.postId
            ? { ...post, blocked: action.payload.blocked }
            : post
        );
      })
      .addCase(toggleBlockPost.rejected, (state, action) => {
        state.error = action.payload;
      })
      // deletePost
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(
          (post) => post._id !== action.payload.postId
        );
        state.totalPosts -= 1;
        state.totalPagesPosts = Math.ceil(state.totalPosts / 10);
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.error = action.payload;
      })
      // createContactMessage
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
      // fetchContactMessages
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
      // toggleContactMessageHandled
      .addCase(toggleContactMessageHandled.fulfilled, (state, action) => {
        state.contactMessages = state.contactMessages.map((msg) =>
          msg._id === action.payload.messageId
            ? { ...msg, isHandled: action.payload.isHandled }
            : msg
        );
      })
      .addCase(toggleContactMessageHandled.rejected, (state, action) => {
        state.error = action.payload;
      })
      // replyContactMessage
      .addCase(replyContactMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(replyContactMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.contactMessages = state.contactMessages.map((msg) =>
          msg._id === action.payload.messageId
            ? { ...msg, isHandled: true }
            : msg
        );
        state.notificationStatus = "Reply sent successfully";
      })
      .addCase(replyContactMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createReport
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
      // fetchReportedPosts
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
      // reviewReport
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
      .addCase(reviewReport.rejected, (state, action) => {
        state.error = action.payload;
      })
      // sendReportNotification
      .addCase(sendReportNotification.fulfilled, (state) => {
        state.notificationStatus = "Notification sent successfully";
      })
      .addCase(sendReportNotification.rejected, (state, action) => {
        state.error = action.payload;
      })
      // acknowledgeReport
      .addCase(acknowledgeReport.fulfilled, (state, action) => {
        state.reports = state.reports.map((report) =>
          report._id === action.payload.reportId
            ? { ...report, isAcknowledged: true }
            : report
        );
      })
      .addCase(acknowledgeReport.rejected, (state, action) => {
        state.error = action.payload;
      })
      // getAllUsersEarnings
      .addCase(getAllUsersEarnings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsersEarnings.fulfilled, (state, action) => {
        state.loading = false;
        state.userEarnings = action.payload;
      })
      .addCase(getAllUsersEarnings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // processBulkPayouts
      .addCase(processBulkPayouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processBulkPayouts.fulfilled, (state) => {
        state.loading = false;
        state.notificationStatus = "Bulk payouts processed successfully";
      })
      .addCase(processBulkPayouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchSiteAnalytics
      .addCase(fetchSiteAnalytics.pending, (state) => {
        state.analyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchSiteAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchSiteAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false;
        state.analyticsError = action.payload;
      })
      // clearError
      .addCase(clearError.fulfilled, (state) => {
        state.error = null;
        state.analyticsError = null;
        state.emailError = null;
        state.subscriptionError = null;
      })
      // checkEmailStatus
      .addCase(checkEmailStatus.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(checkEmailStatus.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.currentEmailStatus = action.payload;
      })
      .addCase(checkEmailStatus.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // getAllEmailStatuses
      .addCase(getAllEmailStatuses.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(getAllEmailStatuses.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.emailStatuses = action.payload.emailStatuses;
        state.totalEmails = action.payload.totalEmails;
        state.currentPageEmails = action.payload.currentPage;
        state.totalPagesEmails = action.payload.totalPages;
      })
      .addCase(getAllEmailStatuses.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // retryFailedEmails
      .addCase(retryFailedEmails.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(retryFailedEmails.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.notificationStatus = "Failed emails retried successfully";
        state.emailStatuses = state.emailStatuses.map((status) => {
          const updated = action.payload.find(
            (result) =>
              result.email === status.email && result.type === status.type
          );
          return updated
            ? { ...status, ...updated, stopEmailAttempts: !updated.success }
            : status;
        });
      })
      .addCase(retryFailedEmails.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // recordReadingTime
      .addCase(recordReadingTime.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recordReadingTime.fulfilled, (state) => {
        state.loading = false;
        state.notificationStatus = "Reading time recorded successfully";
      })
      .addCase(recordReadingTime.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getReadingDetailsByPost
      .addCase(getReadingDetailsByPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReadingDetailsByPost.fulfilled, (state) => {
        state.loading = false;
        state.notificationStatus = "Reading details fetched successfully";
      })
      .addCase(getReadingDetailsByPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // sendEnhancedDailyPostEmail
      .addCase(sendEnhancedDailyPostEmail.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(sendEnhancedDailyPostEmail.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.dailyEmailStatus = action.payload;
        state.notificationStatus = `Enhanced daily emails sent: ${
          action.payload.results?.successful || 0
        } successful, ${action.payload.results?.failed || 0} failed`;
      })
      .addCase(sendEnhancedDailyPostEmail.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // checkUserEmailEligibility
      .addCase(checkUserEmailEligibility.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(checkUserEmailEligibility.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.userEmailEligibility[action.payload.userId] = action.payload;
      })
      .addCase(checkUserEmailEligibility.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // getBounceStatistics
      .addCase(getBounceStatistics.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(getBounceStatistics.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.bounceStatistics = action.payload;
      })
      .addCase(getBounceStatistics.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // removeEmailSuppression
      .addCase(removeEmailSuppression.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(removeEmailSuppression.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.suppressedEmails = state.suppressedEmails.filter(
          (email) => email !== action.payload.email
        );
        state.notificationStatus = `Email ${action.payload.email} removed from suppression list`;
      })
      .addCase(removeEmailSuppression.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // testSingleEmail
      .addCase(testSingleEmail.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(testSingleEmail.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.emailTestResult = action.payload;
        state.notificationStatus = `Test email sent successfully to ${action.payload.email}`;
      })
      .addCase(testSingleEmail.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // getEmailSystemHealth
      .addCase(getEmailSystemHealth.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(getEmailSystemHealth.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.emailSystemHealth = action.payload;
      })
      .addCase(getEmailSystemHealth.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // batchCheckEmailEligibility
      .addCase(batchCheckEmailEligibility.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(batchCheckEmailEligibility.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.batchEligibilityResults = action.payload;
        state.notificationStatus = `Batch eligibility check completed: ${
          action.payload.summary?.eligible || 0
        } eligible, ${action.payload.summary?.ineligible || 0} ineligible`;
      })
      .addCase(batchCheckEmailEligibility.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // getDailyPostEmailReport
      .addCase(getDailyPostEmailReport.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(getDailyPostEmailReport.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.emailReports = action.payload.emailReports;
        state.totalEmailReports = action.payload.totalEmails;
        state.currentPageEmailReports = action.payload.currentPage;
        state.totalPagesEmailReports = action.payload.totalPages;
        state.emailReportStats = action.payload.stats;
        state.emailDailyStats = action.payload.dailyStats;
      })
      .addCase(getDailyPostEmailReport.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      })

      // deleteAllNotifications
      .addCase(deleteAllNotifications.pending, (state) => {
        state.deletingAll = true;
        state.error = null;
      })
      .addCase(deleteAllNotifications.fulfilled, (state, action) => {
        state.deletingAll = false;
        state.bannerNotifications = [];
        state.activeUserNotifications = [];
        state.dismissedNotifications = new Set();
        state.dismissalStatus = {};
        const { deletedCount, message } = action.payload;
        state.notificationStatus =
          message ||
          `All notifications deleted (${deletedCount} notifications)`;
        state.error = null;
      })
      .addCase(deleteAllNotifications.rejected, (state, action) => {
        state.deletingAll = false;
        state.error = action.payload;
      })
      // downloadAllDataCsv
      .addCase(downloadAllDataCsv.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(downloadAllDataCsv.fulfilled, (state) => {
        state.loading = false;
        state.notificationStatus = "Excel downloaded successfully";
      })
      .addCase(downloadAllDataCsv.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getAllSubscriptionPlans
      .addCase(getAllSubscriptionPlans.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(getAllSubscriptionPlans.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.plans =
          action.payload.currentPage === 1
            ? action.payload.plans
            : [...state.plans, ...action.payload.plans];
        state.totalPlans = action.payload.totalPlans || 0;
        state.currentPagePlans = action.payload.currentPage || 1;
        state.totalPagesPlans = action.payload.totalPages || 1;
        state.hasMorePlans =
          action.payload.currentPage < action.payload.totalPages;
      })
      .addCase(getAllSubscriptionPlans.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // toggleUserEligibility
      .addCase(toggleUserEligibility.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(toggleUserEligibility.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.users = state.users.map((user) =>
          user._id === action.payload.user.id
            ? {
                ...user,
                isEligibleForSubscription:
                  action.payload.user.isEligibleForSubscription,
              }
            : user
        );
        state.notificationStatus = action.payload.message;
      })
      .addCase(toggleUserEligibility.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // updateGlobalEligibilityCriteria
      .addCase(updateGlobalEligibilityCriteria.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(updateGlobalEligibilityCriteria.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionCriteria = action.payload;
        state.notificationStatus = "Eligibility criteria updated successfully";
      })
      .addCase(updateGlobalEligibilityCriteria.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // checkUserEligibility
      .addCase(checkUserEligibility.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(checkUserEligibility.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.userEligibility = action.payload;
        state.subscriptionCriteria = action.payload.criteria || {
          minFollowers: 1000,
          minPosts: 30,
          minEngagementRate: 0.02,
          minAccountAgeDays: 30,
        };
        state.error = action.payload.message
          ? { message: action.payload.message }
          : null;
      })
      .addCase(checkUserEligibility.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError =
          action.payload.message || "Failed to check user eligibility";
        if (action.payload.criteria) {
          state.subscriptionCriteria = action.payload.criteria;
          state.userEligibility = {
            isEligible: action.payload.isEligible || false,
            followerCount: action.payload.followerCount || 0,
            postCount: action.payload.postCount || 0,
            engagementRate: action.payload.engagementRate || 0,
            accountAgeDays: action.payload.accountAgeDays || 0,
          };
        }
      })
      // toggleSubscriptionPlanStatus
      .addCase(toggleSubscriptionPlanStatus.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(toggleSubscriptionPlanStatus.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.plans = state.plans.map((plan) =>
          plan.id === action.payload.id
            ? { ...plan, status: action.payload.status }
            : plan
        );
        state.notificationStatus = `Plan ${action.payload.status} successfully`;
      })
      .addCase(toggleSubscriptionPlanStatus.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // grantSubscriptionAccess
      .addCase(grantSubscriptionAccess.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(grantSubscriptionAccess.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.users = state.users.map((user) =>
          user._id === action.payload.user.id
            ? {
                ...user,
                isEligibleForSubscription:
                  action.payload.user.isEligibleForSubscription,
              }
            : user
        );
        state.notificationStatus = action.payload.message;
      })
      .addCase(grantSubscriptionAccess.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // setUserEligibilityOverride
      .addCase(setUserEligibilityOverride.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(setUserEligibilityOverride.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? {
                ...user,
                isEligibleForSubscription:
                  action.payload.isEligibleForSubscription,
                bypassSubscriptionCriteria:
                  action.payload.bypassSubscriptionCriteria,
              }
            : user
        );
        state.notificationStatus =
          "User eligibility override updated successfully";
      })
      .addCase(setUserEligibilityOverride.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // overrideUserMilestones
      .addCase(overrideUserMilestones.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(overrideUserMilestones.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.overrideInfo = action.payload;
        const idx = state.users.findIndex(
          (u) => u._id === action.payload.userId
        );
        if (idx !== -1) {
          state.users[idx] = {
            ...state.users[idx],
            milestoneOverride: action.payload.milestoneOverride,
            isEligibleForSubscription: action.payload.isEligibleForSubscription,
          };
        }
      })
      .addCase(overrideUserMilestones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // resetUserMilestones
      .addCase(resetUserMilestones.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(resetUserMilestones.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.overrideInfo = action.payload;
        const idx = state.users.findIndex((u) => u._id === action.meta.arg);
        if (idx !== -1) {
          state.users[idx] = {
            ...state.users[idx],
            milestoneOverride: {
              followerCount: null,
              postCount: null,
              engagementRate: null,
              accountAgeDays: null,
            },
          };
        }
      })
      .addCase(resetUserMilestones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // sendDirectEmail
      .addCase(sendDirectEmail.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(sendDirectEmail.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.directEmailResult = action.payload;
        state.notificationStatus = `Direct email sent successfully to ${action.payload.email}`;
      })
      .addCase(sendDirectEmail.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
        state.directEmailResult = { error: action.payload };
      });
  },
});

export const {
  clearNotificationStatus,
  setEmailError,
  clearEmailTestResult,
  clearBatchEligibilityResults,
  updateUserEmailEligibility,
  socketNewContactMessage,
  socketNewReport,
  socketReportReviewed,
  socketReportAcknowledged,
  socketContactMessageReplied,
  setNotificationStatus,
  updatePostBlockStatus,
  updateSubscriptionPlanStatus,
  logSubscriptionCriteria,
  clearOverrideStatus,
  clearDirectEmailResult,
} = adminSlice.actions;

export default adminSlice.reducer;
