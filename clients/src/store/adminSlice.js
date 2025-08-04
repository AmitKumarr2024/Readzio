import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Constants
const isDev = process.env.NODE_ENV === "development";
axiosInstance.defaults.timeout = 10000;

// Retry Utility
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

// Error Handler
const handleError = (err, fallbackMessage, extra = {}) => {
  if (isDev)
    console.error(`[adminSlice] Error:`, {
      message: err.response?.data?.message || err.message,
      ...extra,
      timestamp: new Date().toISOString(),
    });
  return err.response?.data?.message || fallbackMessage;
};

// Thunks
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
      return rejectWithValue(
        handleError(err, "Failed to fetch users", { page, limit })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to toggle block user", { userId })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to toggle user role", { userId })
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "admin/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`, {
        withCredentials: true,
      });
      return { userId };
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to delete user", { userId })
      );
    }
  }
);

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
    } catch (err) {
      if (err.response?.status === 502)
        return {
          posts: [],
          totalPosts: 0,
          currentPage: page,
          totalPages: 1,
          error: "Server unavailable, please try again later",
        };
      return rejectWithValue(
        handleError(err, "Failed to fetch posts", {
          page,
          limit,
          search,
          sortField,
          sortOrder,
        })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to toggle block post", { postId })
      );
    }
  }
);

export const deletePost = createAsyncThunk(
  "admin/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/admin/posts/${postId}`, {
        withCredentials: true,
      });
      return { postId };
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to delete post", { postId })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to create contact message")
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch contact messages", { page, limit })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to toggle message status", { messageId })
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
        { subject, message },
        { withCredentials: true }
      );
      return { messageId, isHandled: true };
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to reply to contact message", { messageId })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to create report", { postId })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch reported posts", { page, limit })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to review report", { reportId })
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
        { reportId, subject, message },
        { withCredentials: true }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to send notification", { reportId })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to acknowledge report", { reportId })
      );
    }
  }
);

export const getAllUsersEarnings = createAsyncThunk(
  "admin/getAllUsersEarnings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/earning/admin/earnings", {
        withCredentials: true,
      });
      return response.data || [];
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch users' earnings")
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to process bulk payouts")
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
      return response.data.data || {};
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch site analytics", {
          startDate,
          endDate,
        })
      );
    }
  }
);

export const clearError = createAsyncThunk(
  "admin/clearError",
  async () => null
);

export const checkEmailStatus = createAsyncThunk(
  "admin/checkEmailStatus",
  async ({ email, type }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/email-status?email=${encodeURIComponent(
          email
        )}&type=${encodeURIComponent(type)}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch email status", { email, type })
      );
    }
  }
);

export const getAllEmailStatuses = createAsyncThunk(
  "admin/getAllEmailStatuses",
  async ({ page = 1, limit = 10, type }, { rejectWithValue }) => {
    try {
      const query = type
        ? `page=${page}&limit=${limit}&type=${encodeURIComponent(type)}`
        : `page=${page}&limit=${limit}`;
      const response = await axiosInstance.get(
        `/admin/all-email-statuses?${query}`,
        { withCredentials: true }
      );
      return {
        emailStatuses: response.data.logs || [],
        totalEmails: response.data.total || 0,
        currentPage: page,
        totalPages: Math.ceil(response.data.total / limit) || 1,
      };
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch email statuses", {
          page,
          limit,
          type,
        })
      );
    }
  }
);

export const retryFailedEmails = createAsyncThunk(
  "admin/retryFailedEmails",
  async ({ type }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/admin/retry-failed-emails",
        { type },
        { withCredentials: true }
      );
      return response.data.results || [];
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to retry failed emails", { type })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to record reading time", { postId })
      );
    }
  }
);

export const getReadingDetailsByPost = createAsyncThunk(
  "admin/getReadingDetailsByPost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/admin/reading-details/${postId}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch reading details", { postId })
      );
    }
  }
);

export const getDailyPostEmailReport = createAsyncThunk(
  "admin/getDailyPostEmailReport",
  async ({ page = 1, limit = 10, date }, { rejectWithValue }) => {
    try {
      const query = date
        ? `page=${page}&limit=${limit}&date=${encodeURIComponent(date)}`
        : `page=${page}&limit=${limit}`;
      const response = await axiosInstance.get(
        `/dailyMail/daily-post-report?${query}`,
        { withCredentials: true }
      );
      return {
        emailReports: response.data.logs || [],
        totalEmails: response.data.total || 0,
        currentPage: page,
        totalPages: Math.ceil(response.data.total / limit) || 1,
      };
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch daily post email report", {
          page,
          limit,
          date,
        })
      );
    }
  }
);

export const fetchBannerNotifications = createAsyncThunk(
  "admin/fetchBannerNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        "/bannerNotification/get-Notification",
        { withCredentials: true }
      );
      return response.data.notifications || [];
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch banner notifications")
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to create banner notification")
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to dismiss notification", { notificationId })
      );
    }
  }
);

export const deactivateBannerNotification = createAsyncThunk(
  "admin/deactivateBannerNotification",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/bannerNotification/deactivate/${id}`,
        {},
        { withCredentials: true }
      );
      return response.data.data;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to deactivate notification", { id })
      );
    }
  }
);

export const deleteAllBannerNotifications = createAsyncThunk(
  "admin/deleteAllBannerNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        "/bannerNotification/delete-all",
        { withCredentials: true }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to delete all notifications")
      );
    }
  }
);

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
      link.setAttribute("download", "Inksha_official_details_data.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    } catch (err) {
      return rejectWithValue(handleError(err, "Failed to download Excel"));
    }
  }
);

export const getAllSubscriptionPlans = createAsyncThunk(
  "admin/getAllSubscriptionPlans",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/admin/subscriptions/plans", {
        withCredentials: true,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to fetch subscription plans")
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to toggle user eligibility", {
          userId,
          enable,
        })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to update eligibility criteria")
      );
    }
  }
);

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
          minFollowers: 10000,
          minPosts: 30,
          minEngagementRate: 0.05,
          minAccountAgeDays: 30,
        },
      };
    } catch (err) {
      if (
        err.response?.data?.message === "Subscription configuration not found"
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
        handleError(err, "Failed to check user eligibility", { userId })
      );
    }
  }
);

export const toggleSubscriptionPlanStatus = createAsyncThunk(
  "admin/toggleSubscriptionPlanStatus",
  async ({ planId, status }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        "/admin/subscriptions/plan/status",
        { planId, status },
        { withCredentials: true }
      );
      return response.data.plan;
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to toggle subscription plan status", {
          planId,
          status,
        })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to grant subscription access", {
          userId,
          grant,
        })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to update user eligibility override", {
          userId,
        })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to override user milestones", { userId })
      );
    }
  }
);

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
    } catch (err) {
      return rejectWithValue(
        handleError(err, "Failed to reset user milestones", { userId })
      );
    }
  }
);

// Slice
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
    socketNewContactMessage: (state, action) => {
      state.contactMessages = [action.payload, ...state.contactMessages].slice(
        0,
        10
      );
      state.totalMessages += 1;
      state.totalPagesMessages = Math.ceil(state.totalMessages / 10);
    },
    socketNewReport: (state, action) => {
      state.reports = [action.payload, ...state.reports].slice(0, 10);
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
      state.reports = state.reports.map((report) =>
        report._id === action.payload.reportId
          ? { ...report, isAcknowledged: true }
          : report
      );
    },
    socketContactMessageReplied: (state, action) => {
      state.contactMessages = state.contactMessages.map((msg) =>
        msg._id === action.payload.messageId ? { ...msg, isHandled: true } : msg
      );
    },
    setNotificationStatus: (state, action) => {
      state.notificationStatus = action.payload;
    },
    setEmailError: (state, action) => {
      state.emailError = action.payload;
    },
    updatePostBlockStatus: (state, action) => {
      const { postId, blocked } = action.payload;
      const index = state.posts.findIndex((post) => post._id === postId);
      if (index !== -1) state.posts[index].blocked = blocked;
    },
    updateSubscriptionPlanStatus: (state, action) => {
      const { planId, status } = action.payload;
      const plan = state.plans.find((p) => p._id === planId);
      if (plan) plan.status = status;
    },
    logSubscriptionCriteria: (state) => {
      if (isDev)
        console.log(
          "[logSubscriptionCriteria] Current:",
          state.subscriptionCriteria
        );
    },
    clearOverrideStatus: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.overrideInfo = null;
    },
  },
  extraReducers: (builder) => {
    const handleAsync = (thunk, onFulfilled) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          if (onFulfilled) onFulfilled(state, action);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        });
    };
    handleAsync(getAllUsers, (state, action) => {
      const { users, totalUsers, currentPage, totalPages, mode } =
        action.payload;
      if (mode === "full") state.allUsers = users;
      else {
        state.users = users;
        state.totalUsers = totalUsers;
        state.currentPageUsers = currentPage;
        state.totalPagesUsers = totalPages;
      }
    });
    handleAsync(toggleBlockUser, (state, action) => {
      state.users = state.users.map((user) =>
        user._id === action.payload.userId
          ? { ...user, blocked: action.payload.blocked }
          : user
      );
    });
    handleAsync(toggleUserRole, (state, action) => {
      state.users = state.users.map((user) =>
        user._id === action.payload.userId
          ? { ...user, role: action.payload.role }
          : user
      );
    });
    handleAsync(deleteUser, (state, action) => {
      state.users = state.users.filter(
        (user) => user._id !== action.payload.userId
      );
      state.totalUsers -= 1;
      state.totalPagesUsers = Math.ceil(state.totalUsers / 10);
    });
    handleAsync(getAllPosts, (state, action) => {
      state.posts = action.payload.posts;
      state.totalPosts = action.payload.totalPosts;
      state.currentPagePosts = action.payload.currentPage;
      state.totalPagesPosts = action.payload.totalPages;
      state.error = action.payload.error || null;
    });
    handleAsync(toggleBlockPost, (state, action) => {
      state.posts = state.posts.map((post) =>
        post._id === action.payload.postId
          ? { ...post, blocked: action.payload.blocked }
          : post
      );
    });
    handleAsync(deletePost, (state, action) => {
      state.posts = state.posts.filter(
        (post) => post._id !== action.payload.postId
      );
      state.totalPosts -= 1;
      state.totalPagesPosts = Math.ceil(state.totalPosts / 10);
    });
    handleAsync(createContactMessage, (state) => {
      state.notificationStatus = "Contact message created successfully";
    });
    handleAsync(fetchContactMessages, (state, action) => {
      state.contactMessages = action.payload.messages;
      state.totalMessages = action.payload.totalMessages;
      state.currentPageMessages = action.payload.currentPage;
      state.totalPagesMessages = action.payload.totalPages;
    });
    handleAsync(toggleContactMessageHandled, (state, action) => {
      state.contactMessages = state.contactMessages.map((msg) =>
        msg._id === action.payload.messageId
          ? { ...msg, isHandled: action.payload.isHandled }
          : msg
      );
    });
    handleAsync(replyContactMessage, (state, action) => {
      state.contactMessages = state.contactMessages.map((msg) =>
        msg._id === action.payload.messageId ? { ...msg, isHandled: true } : msg
      );
      state.notificationStatus = "Reply sent successfully";
    });
    handleAsync(createReport, (state) => {
      state.notificationStatus = "Report submitted successfully";
    });
    handleAsync(fetchReportedPosts, (state, action) => {
      state.reports = action.payload.reports;
      state.totalReports = action.payload.totalReports;
      state.currentPageReports = action.payload.currentPage;
      state.totalPagesReports = action.payload.totalPages;
    });
    handleAsync(reviewReport, (state, action) => {
      state.reports = state.reports.map((report) =>
        report._id === action.payload.reportId
          ? {
              ...report,
              isReviewed: true,
              forwardedToAuthor: action.payload.forwardToAuthor,
            }
          : report
      );
    });
    handleAsync(sendReportNotification, (state) => {
      state.notificationStatus = "Notification sent successfully";
    });
    handleAsync(acknowledgeReport, (state, action) => {
      state.reports = state.reports.map((report) =>
        report._id === action.payload.reportId
          ? { ...report, isAcknowledged: true }
          : report
      );
    });
    handleAsync(getAllUsersEarnings, (state, action) => {
      state.userEarnings = action.payload;
    });
    handleAsync(processBulkPayouts, (state) => {
      state.notificationStatus = "Bulk payouts processed successfully";
    });
    handleAsync(
      fetchSiteAnalytics,
      (state, action) => {
        state.analytics = action.payload;
        state.analyticsLoading = false;
        state.analyticsError = null;
      },
      "analyticsLoading",
      "analyticsError"
    );
    handleAsync(clearError, (state) => {
      state.error = null;
      state.analyticsError = null;
      state.emailError = null;
      state.subscriptionError = null;
    });
    handleAsync(
      checkEmailStatus,
      (state, action) => {
        state.currentEmailStatus = action.payload;
        state.emailLoading = false;
        state.emailError = null;
      },
      "emailLoading",
      "emailError"
    );
    handleAsync(
      getAllEmailStatuses,
      (state, action) => {
        state.emailStatuses = action.payload.emailStatuses;
        state.totalEmails = action.payload.totalEmails;
        state.currentPageEmails = action.payload.currentPage;
        state.totalPagesEmails = action.payload.totalPages;
        state.emailLoading = false;
        state.emailError = null;
      },
      "emailLoading",
      "emailError"
    );
    handleAsync(
      retryFailedEmails,
      (state, action) => {
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
        state.emailLoading = false;
        state.emailError = null;
      },
      "emailLoading",
      "emailError"
    );
    handleAsync(recordReadingTime, (state) => {
      state.notificationStatus = "Reading time recorded successfully";
    });
    handleAsync(getReadingDetailsByPost, (state) => {
      state.notificationStatus = "Reading details fetched successfully";
    });
    handleAsync(
      getDailyPostEmailReport,
      (state, action) => {
        state.emailReports = action.payload.emailReports;
        state.totalEmailReports = action.payload.totalEmails;
        state.currentPageEmailReports = action.payload.currentPage;
        state.totalPagesEmailReports = action.payload.totalPages;
        state.emailLoading = false;
        state.emailError = null;
      },
      "emailLoading",
      "emailError"
    );
    handleAsync(fetchBannerNotifications, (state, action) => {
      state.bannerNotifications = action.payload;
    });
    handleAsync(createBannerNotification, (state, action) => {
      state.bannerNotifications = [
        action.payload,
        ...state.bannerNotifications,
      ];
      state.notificationStatus = "Banner notification created";
    });
    handleAsync(dismissBannerNotification, (state, action) => {
      state.bannerNotifications = state.bannerNotifications.filter(
        (notification) => notification._id !== action.payload
      );
    });
    handleAsync(deactivateBannerNotification, (state, action) => {
      state.bannerNotifications = state.bannerNotifications.filter(
        (n) => n._id !== action.payload.id
      );
    });
    handleAsync(deleteAllBannerNotifications, (state) => {
      state.bannerNotifications = [];
      state.notificationStatus = "All banner notifications deleted";
    });
    handleAsync(
      getAllSubscriptionPlans,
      (state, action) => {
        state.plans =
          action.payload.currentPage === 1
            ? action.payload.plans
            : [...state.plans, ...action.payload.plans];
        state.totalPlans = action.payload.totalPlans || 0;
        state.currentPagePlans = action.payload.currentPage || 1;
        state.totalPagesPlans = action.payload.totalPages || 1;
        state.hasMorePlans =
          action.payload.currentPage < action.payload.totalPages;
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(
      toggleUserEligibility,
      (state, action) => {
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
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(
      updateGlobalEligibilityCriteria,
      (state, action) => {
        state.subscriptionCriteria = action.payload;
        state.notificationStatus = "Eligibility criteria updated successfully";
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(
      checkUserEligibility,
      (state, action) => {
        state.userEligibility = action.payload;
        state.subscriptionCriteria = action.payload.criteria || {
          minFollowers: 10000,
          minPosts: 30,
          minEngagementRate: 0.05,
          minAccountAgeDays: 30,
        };
        state.error = action.payload.message
          ? { message: action.payload.message }
          : null;
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(
      toggleSubscriptionPlanStatus,
      (state, action) => {
        state.plans = state.plans.map((plan) =>
          plan.id === action.payload.id
            ? { ...plan, status: action.payload.status }
            : plan
        );
        state.notificationStatus = `Plan ${action.payload.status} successfully`;
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(
      grantSubscriptionAccess,
      (state, action) => {
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
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(
      setUserEligibilityOverride,
      (state, action) => {
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
        state.subscriptionLoading = false;
        state.subscriptionError = null;
      },
      "subscriptionLoading",
      "subscriptionError"
    );
    handleAsync(overrideUserMilestones, (state, action) => {
      const idx = state.users.findIndex((u) => u._id === action.payload.userId);
      if (idx !== -1)
        state.users[idx] = {
          ...state.users[idx],
          milestoneOverride: action.payload.milestoneOverride,
          isEligibleForSubscription: action.payload.isEligibleForSubscription,
        };
      state.success = true;
      state.overrideInfo = action.payload;
    });
    handleAsync(resetUserMilestones, (state, action) => {
      const idx = state.users.findIndex((u) => u._id === action.meta.arg);
      if (idx !== -1)
        state.users[idx] = {
          ...state.users[idx],
          milestoneOverride: {
            followerCount: null,
            postCount: null,
            engagementRate: null,
            accountAgeDays: null,
          },
        };
      state.success = true;
      state.overrideInfo = action.payload;
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
