import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Fetch all users
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
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete user"
      );
    }
  }
);

// Fetch all posts
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
      const response = await axiosInstance.get(
        `/admin/posts?page=${page}&limit=${limit}&search=${search}&sortField=${sortField}&sortOrder=${sortOrder}`,
        { withCredentials: true }
      );

      return {
        posts: response.data.posts,
        totalPosts: response.data.totalCount, // ✅ backend should return totalCount
        currentPage: page,
        totalPages: Math.ceil(response.data.totalCount / limit), // ✅ correct pagination
      };
    } catch (error) {
      console.error("[adminSlice:getAllPosts] Error fetching posts:", {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        page,
        limit,
        timestamp: new Date().toISOString(),
      });
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
      // console.log("[reviewReport] response", response);

      return { reportId, forwardToAuthor, isReviewed: true };
    } catch (error) {
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
      // console.log("[adminSlice:getAllUsersEarnings] 🚀 Fetching earnings");
      const response = await axiosInstance.get("/earning/admin/earnings", {
        withCredentials: true,
      });
      // console.log("[adminSlice:getAllUsersEarnings] ✅ Success:", {
      //   dataLength: response.data?.length,
      // });
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

// Process bulk payouts
export const processBulkPayouts = createAsyncThunk(
  "admin/processBulkPayouts",
  async ({ users }, { rejectWithValue }) => {
    try {
      // console.log("[adminSlice:processBulkPayouts] 🚀 Processing payouts:", {
      //   users,
      // });
      const response = await axiosInstance.post(
        "/earning/admin/payouts",
        { users },
        { withCredentials: true }
      );
      // console.log("[adminSlice:processBulkPayouts] ✅ Success:", response.data);
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

// Fetch site analytics
export const fetchSiteAnalytics = createAsyncThunk(
  "admin/fetchSiteAnalytics",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      // console.log("[adminSlice:fetchSiteAnalytics] ⏳ Pending");
      const response = await axiosInstance.get(
        `/admin/analytics?startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      );
      // console.log("[adminSlice:fetchSiteAnalytics] ✅ Success:", response.data);
      return response.data.data;
    } catch (error) {
      console.error(
        "[adminSlice:fetchSiteAnalytics] 🔥 Error:",
        error.response?.data?.message || error.message
      );
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

// Check email status
export const checkEmailStatus = createAsyncThunk(
  "admin/checkEmailStatus",
  async ({ email, type }, { rejectWithValue }) => {
    try {
      // console.log("[adminSlice:checkEmailStatus] 🚀 Fetching email status:", {
      //   email,
      //   type,
      // });
      const response = await axiosInstance.get(
        `/admin/email-status?email=${encodeURIComponent(
          email
        )}&type=${encodeURIComponent(type)}`,
        { withCredentials: true }
      );
      // console.log("[adminSlice:checkEmailStatus] ✅ Success:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "[adminSlice:checkEmailStatus] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch email status"
      );
    }
  }
);

// Fetch all email statuses
export const getAllEmailStatuses = createAsyncThunk(
  "admin/getAllEmailStatuses",
  async ({ page = 1, limit = 10, type }, { rejectWithValue }) => {
    try {
      // console.log(
      //   "[adminSlice:getAllEmailStatuses] 🚀 Fetching all email statuses:",
      //   { page, limit, type }
      // );
      const query = type
        ? `page=${page}&limit=${limit}&type=${encodeURIComponent(type)}`
        : `page=${page}&limit=${limit}`;
      const response = await axiosInstance.get(
        `/admin/all-email-statuses?${query}`,
        { withCredentials: true }
      );
      // console.log("[adminSlice:getAllEmailStatuses] ✅ Success:", {
      //   logsLength: response.data.logs.length,
      //   total: response.data.total,
      // });
      return {
        emailStatuses: response.data.logs,
        totalEmails: response.data.total,
        currentPage: page,
        totalPages: Math.ceil(response.data.total / limit),
      };
    } catch (error) {
      console.error(
        "[adminSlice:getAllEmailStatuses] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch email statuses"
      );
    }
  }
);

// Retry failed emails
export const retryFailedEmails = createAsyncThunk(
  "admin/retryFailedEmails",
  async ({ type }, { rejectWithValue }) => {
    try {
      // console.log("[adminSlice:retryFailedEmails] 🚀 Retrying failed emails:", {
      //   type,
      // });
      const response = await axiosInstance.post(
        "/admin/retry-failed-emails",
        { type },
        { withCredentials: true }
      );
      // console.log("[adminSlice:retryFailedEmails] ✅ Success:", response.data);
      return response.data.results;
    } catch (error) {
      console.error(
        "[adminSlice:retryFailedEmails] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to retry failed emails"
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
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch reading details"
      );
    }
  }
);

// Fetch daily post email report
export const getDailyPostEmailReport = createAsyncThunk(
  "admin/getDailyPostEmailReport",
  async ({ page = 1, limit = 10, date }, { rejectWithValue }) => {
    try {
      // console.log(
      //   "[adminSlice:getDailyPostEmailReport] 🚀 Fetching daily post email report:",
      //   { page, limit, date }
      // );
      const query = date
        ? `page=${page}&limit=${limit}&date=${encodeURIComponent(date)}`
        : `page=${page}&limit=${limit}`;
      const response = await axiosInstance.get(
        `/dailyMail/daily-post-report?${query}`,
        { withCredentials: true }
      );
      // console.log("[adminSlice:getDailyPostEmailReport] ✅ Success:", {
      //   logsLength: response.data.logs.length,
      //   total: response.data.total,
      // });
      return {
        emailReports: response.data.logs,
        totalEmails: response.data.total,
        currentPage: page,
        totalPages: Math.ceil(response.data.total / limit),
      };
    } catch (error) {
      console.error(
        "[adminSlice:getDailyPostEmailReport] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch daily post email report"
      );
    }
  }
);

// Fetch all banner notifications
export const fetchBannerNotifications = createAsyncThunk(
  "admin/fetchBannerNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        "/bannerNotification/get-Notification",
        { withCredentials: true }
      );
      return response.data.notifications;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch banner notifications"
      );
    }
  }
);

// Create a new banner notification
export const createBannerNotification = createAsyncThunk(
  "admin/createBannerNotification",
  async ({ title, message, region }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/bannerNotification/create",
        { title, message, region },
        { withCredentials: true }
      );
      return response.data.notification;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create banner notification"
      );
    }
  }
);

// Dismiss a banner notification
export const dismissBannerNotification = createAsyncThunk(
  "admin/dismissBannerNotification",
  async (notificationId, { rejectWithValue }) => {
    try {
      await axiosInstance.patch(
        `/bannerNotification/dismiss/${notificationId}`,
        {},
        { withCredentials: true }
      );
      return notificationId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to dismiss notification"
      );
    }
  }
);

// Deactivate a banner notification
export const deactivateBannerNotification = createAsyncThunk(
  "admin/deactivateBannerNotification",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch(
        `/bannerNotification/deactivate/${id}`,
        {},
        { withCredentials: true }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to deactivate notification"
      );
    }
  }
);

// Delete all banner notifications
export const deleteAllBannerNotifications = createAsyncThunk(
  "admin/deleteAllBannerNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete("/bannerNotification/delete-all", {
        withCredentials: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete all notifications"
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
      link.setAttribute("download", "all_data_export.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    } catch (error) {
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
      // console.log(
      //   "[adminSlice:getAllSubscriptionPlans] 🚀 Fetching subscription plans"
      // );
      const response = await axiosInstance.get("/admin/subscriptions/plans", {
        withCredentials: true,
      });
      // console.log("[adminSlice:getAllSubscriptionPlans] ✅ Success:", {
      //   count: response.data.count,
      // });
      return response.data;
    } catch (error) {
      console.error(
        "[adminSlice:getAllSubscriptionPlans] 🔥 Error:",
        error.response?.data?.message || error.message
      );
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
      // console.log(
      //   "[adminSlice:toggleUserEligibility] 🚀 Toggling eligibility:",
      //   { userId, enable }
      // );
      const response = await axiosInstance.post(
        "/admin/subscriptions/eligibility/toggle",
        { userId, enable },
        { withCredentials: true }
      );
      // console.log(
      //   "[adminSlice:toggleUserEligibility] ✅ Success:",
      //   response.data
      // );
      return response.data;
    } catch (error) {
      console.error(
        "[adminSlice:toggleUserEligibility] 🔥 Error:",
        error.response?.data?.message || error.message
      );
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
      // console.log(
      //   "[adminSlice:updateGlobalEligibilityCriteria] 🚀 Updating criteria:",
      //   {
      //     minFollowers,
      //     minPosts,
      //     minEngagementRate,
      //     minAccountAgeDays,
      //   }
      // );
      const response = await axiosInstance.patch(
        "/admin/subscriptions/criteria",
        { minFollowers, minPosts, minEngagementRate, minAccountAgeDays },
        { withCredentials: true }
      );
      // console.log(
      //   "[adminSlice:updateGlobalEligibilityCriteria] ✅ Success:",
      //   response.data
      // );
      // Dispatch sync action to subscriptionSlice
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
      console.error(
        "[adminSlice:updateGlobalEligibilityCriteria] 🔥 Error:",
        error.response?.data?.message || error.message
      );
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
      // console.log(
      //   "[adminSlice:checkUserEligibility] 🚀 Checking eligibility:",
      //   { userId }
      // );
      const response = await axiosInstance.get(
        `/admin/subscriptions/eligibility/${userId}`,
        { withCredentials: true }
      );
      // console.log(
      //   "[adminSlice:checkUserEligibility] ✅ Success:",
      //   response.data
      // );
      return {
        ...response.data,
        criteria: response.data.criteria || {
          minFollowers: 10000,
          minPosts: 30,
          minEngagementRate: 0.05,
          minAccountAgeDays: 30,
        },
      };
    } catch (error) {
      console.error(
        "[adminSlice:checkUserEligibility] 🔥 Error:",
        error.response?.data?.message || error.message
      );
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
            minFollowers: 10000,
            minPosts: 30,
            minEngagementRate: 0.05,
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
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Grant/revoke subscription creation access
export const grantSubscriptionAccess = createAsyncThunk(
  "admin/grantSubscriptionAccess",
  async ({ userId, grant }, { rejectWithValue }) => {
    try {
      // console.log("[adminSlice:grantSubscriptionAccess] 🚀 Granting access:", {
      //   userId,
      //   grant,
      // });
      const response = await axiosInstance.post(
        "/admin/subscriptions/grant",
        { userId, grant },
        { withCredentials: true }
      );
      // console.log(
      //   "[adminSlice:grantSubscriptionAccess] ✅ Success:",
      //   response.data
      // );
      return response.data;
    } catch (error) {
      console.error(
        "[adminSlice:grantSubscriptionAccess] 🔥 Error:",
        error.response?.data?.message || error.message
      );
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
      console.error(
        "[adminSlice:setUserEligibilityOverride] 🔥 Error:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to update user eligibility override"
      );
    }
  }
);

// Async thunk: Override user milestone
export const overrideUserMilestones = createAsyncThunk(
  "adminOverride/overrideUserMilestones",
  async ({ userId, overrideData }, thunkAPI) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/subscriptions/user-milestone/${userId}`,
        overrideData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to override user milestones"
      );
    }
  }
);

// Async thunk: Reset user milestone
export const resetUserMilestones = createAsyncThunk(
  "adminOverride/resetUserMilestones",
  async (userId, thunkAPI) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/subscriptions/user-milestone-reset/${userId}`
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to reset user milestones"
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
    totalPlans: 0, // Add totalPlans
    currentPagePlans: 1, // Add currentPagePlans
    totalPagesPlans: 1, // Add totalPagesPlans
    hasMorePlans: true, // Add hasMorePlans
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
      // console.log(
      //   "[adminSlice:clearNotificationStatus] 🗑️ Clearing notification status"
      // );
      state.notificationStatus = null;
    },
    socketNewContactMessage: (state, action) => {
      // console.log(
      //   "[adminSlice:socketNewContactMessage] 📬 New contact message:",
      //   action.payload
      // );
      const newMessage = action.payload;
      state.contactMessages = [newMessage, ...state.contactMessages].slice(
        0,
        10
      );
      state.totalMessages += 1;
      state.totalPagesMessages = Math.ceil(state.totalMessages / 10);
    },
    socketNewReport: (state, action) => {
      // console.log(
      //   "[adminSlice:socketNewReport] 🚨 New report:",
      //   action.payload
      // );
      const newReport = action.payload;
      state.reports = [newReport, ...state.reports].slice(0, 10);
      state.totalReports += 1;
      state.totalPagesReports = Math.ceil(state.totalReports / 10);
    },
    socketReportReviewed: (state, action) => {
      // console.log(
      //   "[adminSlice:socketReportReviewed] ✅ Report reviewed:",
      //   action.payload
      // );
      const { reportId, forwardToAuthor } = action.payload;
      state.reports = state.reports.map((report) =>
        report._id === reportId
          ? { ...report, isReviewed: true, forwardedToAuthor: forwardToAuthor }
          : report
      );
    },
    socketReportAcknowledged: (state, action) => {
      // console.log(
      //   "[adminSlice:socketReportAcknowledged] ✅ Report acknowledged:",
      //   action.payload
      // );
      const { reportId } = action.payload;
      state.reports = state.reports.map((report) =>
        report._id === reportId ? { ...report, isAcknowledged: true } : report
      );
    },
    socketContactMessageReplied: (state, action) => {
      // console.log(
      //   "[adminSlice:socketContactMessageReplied] ✅ Message replied:",
      //   action.payload
      // );
      const { messageId } = action.payload;
      state.contactMessages = state.contactMessages.map((msg) =>
        msg._id === messageId ? { ...msg, isHandled: true } : msg
      );
    },
    setNotificationStatus: (state, action) => {
      // console.log(
      //   "[adminSlice:setNotificationStatus] 📢 Setting notification status:",
      //   action.payload
      // );
      state.notificationStatus = action.payload;
    },
    setEmailError: (state, action) => {
      // console.log(
      //   "[adminSlice:setEmailError] 🔥 Setting email error:",
      //   action.payload
      // );
      state.emailError = action.payload;
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
      //   "[adminSlice:logSubscriptionCriteria] 📋 Current subscriptionCriteria state:",
      //   state.subscriptionCriteria
      // );
    },
    clearOverrideStatus: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.overrideInfo = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getAllUsers
      .addCase(getAllUsers.pending, (state) => {
        // console.log("[adminSlice:getAllUsers] ⏳ Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        // console.log("[adminSlice:getAllUsers] ✅ Fulfilled:", action.payload);
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
        // console.log("[adminSlice:getAllUsers] 🔥 Rejected:", action.payload);
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
        // console.log("[adminSlice:getAllUsersEarnings] ⏳ Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsersEarnings.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:getAllUsersEarnings] ✅ Fulfilled:",
        //   action.payload
        // );
        state.loading = false;
        state.userEarnings = action.payload || [];
      })
      .addCase(getAllUsersEarnings.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:getAllUsersEarnings] 🔥 Rejected:",
        //   action.payload
        // );
        state.loading = false;
        state.error = action.payload;
      })
      // processBulkPayouts
      .addCase(processBulkPayouts.pending, (state) => {
        // console.log("[adminSlice:processBulkPayouts] ⏳ Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(processBulkPayouts.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:processBulkPayouts] ✅ Fulfilled:",
        //   action.payload
        // );
        state.loading = false;
        state.notificationStatus = "Bulk payouts processed successfully";
      })
      .addCase(processBulkPayouts.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:processBulkPayouts] 🔥 Rejected:",
        //   action.payload
        // );
        state.loading = false;
        state.error = action.payload;
      })
      // fetchSiteAnalytics
      .addCase(fetchSiteAnalytics.pending, (state) => {
        // console.log("[adminSlice:fetchSiteAnalytics] ⏳ Pending");
        state.analyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchSiteAnalytics.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:fetchSiteAnalytics] ✅ Fulfilled:",
        //   action.payload
        // );
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchSiteAnalytics.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:fetchSiteAnalytics] 🔥 Rejected:",
        //   action.payload
        // );
        state.analyticsLoading = false;
        state.analyticsError = action.payload;
      })
      // clearError
      .addCase(clearError.fulfilled, (state) => {
        // console.log("[adminSlice:clearError] ✅ Fulfilled");
        state.error = null;
        state.analyticsError = null;
        state.emailError = null;
        state.subscriptionError = null;
      })
      // checkEmailStatus
      .addCase(checkEmailStatus.pending, (state) => {
        // console.log("[adminSlice:checkEmailStatus] ⏳ Pending");
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(checkEmailStatus.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:checkEmailStatus] ✅ Fulfilled:",
        //   action.payload
        // );
        state.emailLoading = false;
        state.currentEmailStatus = action.payload;
      })
      .addCase(checkEmailStatus.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:checkEmailStatus] 🔥 Rejected:",
        //   action.payload
        // );
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // getAllEmailStatuses
      .addCase(getAllEmailStatuses.pending, (state) => {
        // console.log("[adminSlice:getAllEmailStatuses] ⏳ Pending");
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(getAllEmailStatuses.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:getAllEmailStatuses] ✅ Fulfilled:",
        //   action.payload
        // );
        state.emailLoading = false;
        state.emailStatuses = action.payload.emailStatuses;
        state.totalEmails = action.payload.totalEmails;
        state.currentPageEmails = action.payload.currentPage;
        state.totalPagesEmails = action.payload.totalPages;
      })
      .addCase(getAllEmailStatuses.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:getAllEmailStatuses] 🔥 Rejected:",
        //   action.payload
        // );
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // retryFailedEmails
      .addCase(retryFailedEmails.pending, (state) => {
        // console.log("[adminSlice:retryFailedEmails] ⏳ Pending");
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(retryFailedEmails.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:retryFailedEmails] ✅ Fulfilled:",
        //   action.payload
        // );
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
        // console.log(
        //   "[adminSlice:retryFailedEmails] 🔥 Rejected:",
        //   action.payload
        // );
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
      // getDailyPostEmailReport
      .addCase(getDailyPostEmailReport.pending, (state) => {
        // console.log("[adminSlice:getDailyPostEmailReport] ⏳ Pending");
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(getDailyPostEmailReport.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:getDailyPostEmailReport] ✅ Fulfilled:",
        //   action.payload
        // );
        state.emailLoading = false;
        state.emailReports = action.payload.emailReports;
        state.totalEmailReports = action.payload.totalEmails;
        state.currentPageEmailReports = action.payload.currentPage;
        state.totalPagesEmailReports = action.payload.totalPages;
      })
      .addCase(getDailyPostEmailReport.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:getDailyPostEmailReport] 🔥 Rejected:",
        //   action.payload
        // );
        state.emailLoading = false;
        state.emailError = action.payload;
      })
      // fetchBannerNotifications
      .addCase(fetchBannerNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBannerNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.bannerNotifications = action.payload;
      })
      .addCase(fetchBannerNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createBannerNotification
      .addCase(createBannerNotification.fulfilled, (state, action) => {
        state.bannerNotifications = [
          action.payload,
          ...state.bannerNotifications,
        ];
        state.notificationStatus = "Banner notification created";
      })
      .addCase(createBannerNotification.rejected, (state, action) => {
        state.error = action.payload;
      })
      // dismissBannerNotification
      .addCase(dismissBannerNotification.fulfilled, (state, action) => {
        state.bannerNotifications = state.bannerNotifications.filter(
          (notification) => notification._id !== action.payload
        );
      })
      .addCase(dismissBannerNotification.rejected, (state, action) => {
        state.error = action.payload;
      })
      // deactivateBannerNotification
      .addCase(deactivateBannerNotification.fulfilled, (state, action) => {
        state.bannerNotifications = state.bannerNotifications.filter(
          (n) => n._id !== action.payload.id
        );
      })
      .addCase(deactivateBannerNotification.rejected, (state, action) => {
        state.error = action.payload;
      })
      // deleteAllBannerNotifications
      .addCase(deleteAllBannerNotifications.fulfilled, (state) => {
        state.bannerNotifications = [];
        state.notificationStatus = "All banner notifications deleted";
      })
      .addCase(deleteAllBannerNotifications.rejected, (state, action) => {
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
        // console.log("[adminSlice:getAllSubscriptionPlans] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      // In adminSlice.js, update the getAllSubscriptionPlans case
      .addCase(getAllSubscriptionPlans.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:getAllSubscriptionPlans] ✅ Fulfilled:",
        //   action.payload
        // );
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
        // console.log(
        //   "[adminSlice:getAllSubscriptionPlans] 🔥 Rejected:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // toggleUserEligibility
      .addCase(toggleUserEligibility.pending, (state) => {
        // console.log("[adminSlice:toggleUserEligibility] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(toggleUserEligibility.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:toggleUserEligibility] ✅ Fulfilled:",
        //   action.payload
        // );
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
        // console.log(
        //   "[adminSlice:toggleUserEligibility] 🔥 Rejected:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // updateGlobalEligibilityCriteria
      .addCase(updateGlobalEligibilityCriteria.pending, (state) => {
        // console.log("[adminSlice:updateGlobalEligibilityCriteria] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(updateGlobalEligibilityCriteria.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:updateGlobalEligibilityCriteria] ✅ Fulfilled, updating state with:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionCriteria = action.payload;
        state.notificationStatus = "Eligibility criteria updated successfully";
      })
      .addCase(updateGlobalEligibilityCriteria.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:updateGlobalEligibilityCriteria] 🔥 Rejected:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // checkUserEligibility
      .addCase(checkUserEligibility.pending, (state) => {
        // console.log("[adminSlice:checkUserEligibility] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(checkUserEligibility.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:checkUserEligibility] ✅ Fulfilled, updating userEligibility with:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.userEligibility = action.payload;
        state.subscriptionCriteria = action.payload.criteria || {
          minFollowers: 10000,
          minPosts: 30,
          minEngagementRate: 0.05,
          minAccountAgeDays: 30,
        };
        // console.log(
        //   "[adminSlice:checkUserEligibility] 📋 Updated subscriptionCriteria state:",
        //   state.subscriptionCriteria
        // );
        state.error = action.payload.message
          ? { message: action.payload.message }
          : null;
      })
      .addCase(checkUserEligibility.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:checkUserEligibility] 🔥 Rejected:",
        //   action.payload
        // );
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
        // console.log("[adminSlice:toggleSubscriptionPlanStatus] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(toggleSubscriptionPlanStatus.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:toggleSubscriptionPlanStatus] ✅ Fulfilled:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.plans = state.plans.map((plan) =>
          plan.id === action.payload.id
            ? { ...plan, status: action.payload.status }
            : plan
        );
        state.notificationStatus = `Plan ${action.payload.status} successfully`;
      })
      .addCase(toggleSubscriptionPlanStatus.rejected, (state, action) => {
        // console.log(
        //   "[adminSlice:toggleSubscriptionPlanStatus] 🔥 Rejected:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // grantSubscriptionAccess
      .addCase(grantSubscriptionAccess.pending, (state) => {
        // console.log("[adminSlice:grantSubscriptionAccess] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(grantSubscriptionAccess.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:grantSubscriptionAccess] ✅ Fulfilled:",
        //   action.payload
        // );
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
        // console.log(
        //   "[adminSlice:grantSubscriptionAccess] 🔥 Rejected:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      // setUserEligibilityOverride
      .addCase(setUserEligibilityOverride.pending, (state) => {
        // console.log("[adminSlice:setUserEligibilityOverride] ⏳ Pending");
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(setUserEligibilityOverride.fulfilled, (state, action) => {
        // console.log(
        //   "[adminSlice:setUserEligibilityOverride] ✅ Fulfilled:",
        //   action.payload
        // );
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
        // console.log(
        //   "[adminSlice:setUserEligibilityOverride] 🔥 Rejected:",
        //   action.payload
        // );
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      .addCase(overrideUserMilestones.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(overrideUserMilestones.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.overrideInfo = action.payload;

        // ✅ Update user in users array
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
      .addCase(resetUserMilestones.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(resetUserMilestones.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.overrideInfo = action.payload;

        // ✅ Reset milestone override in user
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
  setNotificationStatus,
  setEmailError,
  updatePostBlockStatus,
  updateSubscriptionPlanStatus,
  logSubscriptionCriteria,
  clearOverrideStatus,
} = adminSlice.actions;

export default adminSlice.reducer;
