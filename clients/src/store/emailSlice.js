// emailSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const initialState = {
  logs: [],
  stats: null,
  singleLog: null,
  bulkResults: null,
  templates: [],
  scheduledEmails: [],
  deliveryReport: null,
  loading: false,
  sendingEmail: false,
  error: null,
  pagination: {
    current: 1,
    total: 0,
    count: 0,
    totalRecords: 0,
  },
  filters: {
    status: "",
    type: "",
    startDate: "",
    endDate: "",
  },
  lastEmailSent: null,
  emailConfigValid: null,
};

// 🔹 Send Verification Email
export const sendVerificationEmail = createAsyncThunk(
  "email/sendVerificationEmail",
  async ({ email, name }, { rejectWithValue }) => {
    // console.log("[sendVerificationEmail] Called with:", { email, name });
    try {
      const res = await axiosInstance.post("/email/send-verification", {
        email,
        name,
      });
      // console.log("[sendVerificationEmail] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to send verification email";
      console.error("[emailSlice:sendVerificationEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Send Welcome Email
export const sendWelcomeEmail = createAsyncThunk(
  "email/sendWelcomeEmail",
  async ({ email, name }, { rejectWithValue }) => {
    // console.log("[sendWelcomeEmail] Called with:", { email, name });
    try {
      const res = await axiosInstance.post("/email/send-welcome", {
        email,
        name,
      });
      // console.log("[sendWelcomeEmail] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to send welcome email";
      console.error("[emailSlice:sendWelcomeEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Send Password Reset Email
export const sendPasswordResetEmail = createAsyncThunk(
  "email/sendPasswordResetEmail",
  async ({ email }, { rejectWithValue }) => {
    // console.log("[sendPasswordResetEmail] Called with:", { email });
    try {
      const res = await axiosInstance.post("/email/send-password-reset", {
        email,
      });
      // console.log("[sendPasswordResetEmail] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to send password reset email";
      console.error("[emailSlice:sendPasswordResetEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Send Invoice Email
export const sendInvoiceEmail = createAsyncThunk(
  "email/sendInvoiceEmail",
  async ({ email, name, invoiceData }, { rejectWithValue }) => {
    // console.log("[sendInvoiceEmail] Called with:", { email, name, invoiceData });
    try {
      const res = await axiosInstance.post("/email/send-invoice", {
        email,
        name,
        invoiceData,
      });
      // console.log("[sendInvoiceEmail] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to send invoice email";
      console.error("[emailSlice:sendInvoiceEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Send Bulk Emails
export const sendBulkEmails = createAsyncThunk(
  "email/sendBulkEmails",
  async ({ emailList }, { rejectWithValue }) => {
    // console.log("[sendBulkEmails] Called with:", { emailList });
    try {
      const res = await axiosInstance.post("/email/send-bulk", {
        emailList,
      });
      // console.log("[sendBulkEmails] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to send bulk emails";
      console.error("[emailSlice:sendBulkEmails] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Send Daily Report Email
export const sendDailyReportEmail = createAsyncThunk(
  "email/sendDailyReportEmail",
  async ({ adminEmail, reportData }, { rejectWithValue }) => {
    // console.log("[sendDailyReportEmail] Called with:", { adminEmail, reportData });
    try {
      const res = await axiosInstance.post("/email/send-daily-report", {
        adminEmail,
        reportData,
      });
      // console.log("[sendDailyReportEmail] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to send daily report email";
      console.error("[emailSlice:sendDailyReportEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Fetch Email Logs
export const fetchEmailLogs = createAsyncThunk(
  "email/fetchEmailLogs",
  async ({ page = 1, limit = 20, ...filters } = {}, { rejectWithValue }) => {
    // console.log("[fetchEmailLogs] Called with:", { page, limit, ...filters });
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== "" && value != null
          )
        ),
      });

      const res = await axiosInstance.get(`/email/logs?${params}`);
      // console.log("[fetchEmailLogs] API Response:", res.data);

      const logs = (res.data?.data?.logs || []).map((log) => ({
        ...log,
        templateData: log.templateData || {},
      }));

      return {
        logs,
        pagination: res.data?.data?.pagination || {
          current: page,
          total: 0,
          count: logs.length,
          totalRecords: logs.length,
        },
      };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch email logs";
      console.error("[emailSlice:fetchEmailLogs] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Fetch Email Stats
export const fetchEmailStats = createAsyncThunk(
  "email/fetchEmailStats",
  async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    // console.log("[fetchEmailStats] Called with:", { startDate, endDate });
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await axiosInstance.get(`/email/stats?${params}`);
      // console.log("[fetchEmailStats] API Response:", res.data);
      return res.data?.data || null;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch email stats";
      console.error("[emailSlice:fetchEmailStats] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Fetch Single Email Log
export const fetchEmailLogById = createAsyncThunk(
  "email/fetchEmailLogById",
  async (emailId, { rejectWithValue }) => {
    // console.log("[fetchEmailLogById] Called with:", emailId);
    try {
      const res = await axiosInstance.get(`/email/logs/${emailId}`);
      // console.log("[fetchEmailLogById] API Response:", res.data);
      return res.data?.data || null;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to fetch email log";
      console.error("[emailSlice:fetchEmailLogById] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Resend Failed Emails
export const resendFailedEmails = createAsyncThunk(
  "email/resendFailedEmails",
  async ({ emailIds }, { rejectWithValue }) => {
    // console.log("[resendFailedEmails] Called with:", { emailIds });
    try {
      const res = await axiosInstance.post("/email/resend-failed", {
        emailIds,
      });
      // console.log("[resendFailedEmails] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to resend emails";
      console.error("[emailSlice:resendFailedEmails] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Get Email Templates
export const fetchEmailTemplates = createAsyncThunk(
  "email/fetchEmailTemplates",
  async (_, { rejectWithValue }) => {
    // console.log("[fetchEmailTemplates] Called");
    try {
      const res = await axiosInstance.get("/email/templates");
      // console.log("[fetchEmailTemplates] API Response:", res.data);
      return res.data?.data?.templates || [];
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch email templates";
      console.error("[emailSlice:fetchEmailTemplates] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Test Email Configuration
export const testEmailConfig = createAsyncThunk(
  "email/testEmailConfig",
  async (_, { rejectWithValue }) => {
    // console.log("[testEmailConfig] Called");
    try {
      const res = await axiosInstance.post("/email/test-config");
      // console.log("[testEmailConfig] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Email configuration test failed";
      console.error("[emailSlice:testEmailConfig] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Get Delivery Report
export const fetchDeliveryReport = createAsyncThunk(
  "email/fetchDeliveryReport",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    // console.log("[fetchDeliveryReport] Called with:", { startDate, endDate });
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await axiosInstance.get(`/email/delivery-report?${params}`);
      // console.log("[fetchDeliveryReport] API Response:", res.data);
      return res.data?.data || null;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch delivery report";
      console.error("[emailSlice:fetchDeliveryReport] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Schedule Bulk Email
export const scheduleBulkEmail = createAsyncThunk(
  "email/scheduleBulkEmail",
  async ({ emailList, scheduledTime }, { rejectWithValue }) => {
    // console.log("[scheduleBulkEmail] Called with:", { emailList, scheduledTime });
    try {
      const res = await axiosInstance.post("/email/schedule-bulk", {
        emailList,
        scheduledTime,
      });
      // console.log("[scheduleBulkEmail] API Response:", res.data);
      return res.data;
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to schedule bulk email";
      console.error("[emailSlice:scheduleBulkEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Fetch Scheduled Emails
export const fetchScheduledEmails = createAsyncThunk(
  "email/fetchScheduledEmails",
  async (_, { rejectWithValue }) => {
    // console.log("[fetchScheduledEmails] Called");
    try {
      const res = await axiosInstance.get("/email/scheduled");
      // console.log("[fetchScheduledEmails] API Response:", res.data);
      return res.data?.data?.scheduled || [];
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to fetch scheduled emails";
      console.error("[emailSlice:fetchScheduledEmails] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// 🔹 Cancel Scheduled Email
export const cancelScheduledEmail = createAsyncThunk(
  "email/cancelScheduledEmail",
  async (scheduleId, { rejectWithValue }) => {
    // console.log("[cancelScheduledEmail] Called with:", scheduleId);
    try {
      const res = await axiosInstance.delete(`/email/scheduled/${scheduleId}`);
      // console.log("[cancelScheduledEmail] API Response:", res.data);
      return { scheduleId, ...res.data };
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to cancel scheduled email";
      console.error("[emailSlice:cancelScheduledEmail] Error:", errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

const emailSlice = createSlice({
  name: "email",
  initialState,
  reducers: {
    clearEmailState(state) {
      // console.log("[clearEmailState] Resetting email state");
      state.logs = [];
      state.stats = null;
      state.singleLog = null;
      state.bulkResults = null;
      state.templates = [];
      state.scheduledEmails = [];
      state.deliveryReport = null;
      state.loading = false;
      state.sendingEmail = false;
      state.error = null;
      state.pagination = initialState.pagination;
      state.lastEmailSent = null;
    },
    clearEmailError(state) {
      // console.log("[clearEmailError] Clearing email error:", state.error);
      state.error = null;
    },
    clearSingleLog(state) {
      state.singleLog = null;
    },
    clearBulkResults(state) {
      state.bulkResults = null;
    },
    setFilters(state, action) {
      // console.log("[setFilters] Setting filters:", action.payload);
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      // console.log("[resetFilters] Resetting filters");
      state.filters = initialState.filters;
    },
    clearStats(state) {
      state.stats = null;
    },
    clearDeliveryReport(state) {
      state.deliveryReport = null;
    },
    setEmailConfigValid(state, action) {
      state.emailConfigValid = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // sendVerificationEmail
      .addCase(sendVerificationEmail.pending, (state) => {
        // console.log("[sendVerificationEmail.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendVerificationEmail.fulfilled, (state, action) => {
        // console.log("[sendVerificationEmail.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.lastEmailSent = {
          type: "verification",
          data: action.payload.data,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendVerificationEmail.rejected, (state, action) => {
        console.error(
          "[sendVerificationEmail.rejected] Error:",
          action.payload
        );
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // sendWelcomeEmail
      .addCase(sendWelcomeEmail.pending, (state) => {
        // console.log("[sendWelcomeEmail.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendWelcomeEmail.fulfilled, (state, action) => {
        // console.log("[sendWelcomeEmail.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.lastEmailSent = {
          type: "welcome",
          data: action.payload.data,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendWelcomeEmail.rejected, (state, action) => {
        console.error("[sendWelcomeEmail.rejected] Error:", action.payload);
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // sendPasswordResetEmail
      .addCase(sendPasswordResetEmail.pending, (state) => {
        // console.log("[sendPasswordResetEmail.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendPasswordResetEmail.fulfilled, (state, action) => {
        // console.log("[sendPasswordResetEmail.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.lastEmailSent = {
          type: "password_reset",
          data: action.payload.data,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendPasswordResetEmail.rejected, (state, action) => {
        console.error(
          "[sendPasswordResetEmail.rejected] Error:",
          action.payload
        );
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // sendInvoiceEmail
      .addCase(sendInvoiceEmail.pending, (state) => {
        // console.log("[sendInvoiceEmail.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendInvoiceEmail.fulfilled, (state, action) => {
        // console.log("[sendInvoiceEmail.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.lastEmailSent = {
          type: "invoice",
          data: action.payload.data,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendInvoiceEmail.rejected, (state, action) => {
        console.error("[sendInvoiceEmail.rejected] Error:", action.payload);
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // sendBulkEmails
      .addCase(sendBulkEmails.pending, (state) => {
        // console.log("[sendBulkEmails.pending]");
        state.sendingEmail = true;
        state.error = null;
        state.bulkResults = null;
      })
      .addCase(sendBulkEmails.fulfilled, (state, action) => {
        // console.log("[sendBulkEmails.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.bulkResults = action.payload.data;
        state.lastEmailSent = {
          type: "bulk",
          data: action.payload.data,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendBulkEmails.rejected, (state, action) => {
        console.error("[sendBulkEmails.rejected] Error:", action.payload);
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // sendDailyReportEmail
      .addCase(sendDailyReportEmail.pending, (state) => {
        // console.log("[sendDailyReportEmail.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(sendDailyReportEmail.fulfilled, (state, action) => {
        // console.log("[sendDailyReportEmail.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.lastEmailSent = {
          type: "daily_report",
          data: action.payload.data,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendDailyReportEmail.rejected, (state, action) => {
        console.error("[sendDailyReportEmail.rejected] Error:", action.payload);
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // fetchEmailLogs
      .addCase(fetchEmailLogs.pending, (state) => {
        // console.log("[fetchEmailLogs.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmailLogs.fulfilled, (state, action) => {
        // console.log("[fetchEmailLogs.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.logs = action.payload.logs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchEmailLogs.rejected, (state, action) => {
        console.error("[fetchEmailLogs.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // fetchEmailStats
      .addCase(fetchEmailStats.pending, (state) => {
        // console.log("[fetchEmailStats.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmailStats.fulfilled, (state, action) => {
        // console.log("[fetchEmailStats.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchEmailStats.rejected, (state, action) => {
        console.error("[fetchEmailStats.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // fetchEmailLogById
      .addCase(fetchEmailLogById.pending, (state) => {
        // console.log("[fetchEmailLogById.pending]");
        state.loading = true;
        state.error = null;
        state.singleLog = null;
      })
      .addCase(fetchEmailLogById.fulfilled, (state, action) => {
        // console.log("[fetchEmailLogById.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.singleLog = action.payload;
      })
      .addCase(fetchEmailLogById.rejected, (state, action) => {
        console.error("[fetchEmailLogById.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // resendFailedEmails
      .addCase(resendFailedEmails.pending, (state) => {
        // console.log("[resendFailedEmails.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(resendFailedEmails.fulfilled, (state, action) => {
        // console.log("[resendFailedEmails.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        state.bulkResults = action.payload.data;
      })
      .addCase(resendFailedEmails.rejected, (state, action) => {
        console.error("[resendFailedEmails.rejected] Error:", action.payload);
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // fetchEmailTemplates
      .addCase(fetchEmailTemplates.pending, (state) => {
        // console.log("[fetchEmailTemplates.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmailTemplates.fulfilled, (state, action) => {
        // console.log("[fetchEmailTemplates.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchEmailTemplates.rejected, (state, action) => {
        console.error("[fetchEmailTemplates.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // testEmailConfig
      .addCase(testEmailConfig.pending, (state) => {
        // console.log("[testEmailConfig.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(testEmailConfig.fulfilled, (state, action) => {
        // console.log("[testEmailConfig.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.emailConfigValid = action.payload.success;
      })
      .addCase(testEmailConfig.rejected, (state, action) => {
        console.error("[testEmailConfig.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
        state.emailConfigValid = false;
      })

      // fetchDeliveryReport
      .addCase(fetchDeliveryReport.pending, (state) => {
        // console.log("[fetchDeliveryReport.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeliveryReport.fulfilled, (state, action) => {
        // console.log("[fetchDeliveryReport.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.deliveryReport = action.payload;
      })
      .addCase(fetchDeliveryReport.rejected, (state, action) => {
        console.error("[fetchDeliveryReport.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // scheduleBulkEmail
      .addCase(scheduleBulkEmail.pending, (state) => {
        // console.log("[scheduleBulkEmail.pending]");
        state.sendingEmail = true;
        state.error = null;
      })
      .addCase(scheduleBulkEmail.fulfilled, (state, action) => {
        // console.log("[scheduleBulkEmail.fulfilled] Payload:", action.payload);
        state.sendingEmail = false;
        // Add to scheduled emails if not already present
        if (
          !state.scheduledEmails.find(
            (email) => email._id === action.payload.data._id
          )
        ) {
          state.scheduledEmails.push(action.payload.data);
        }
      })
      .addCase(scheduleBulkEmail.rejected, (state, action) => {
        console.error("[scheduleBulkEmail.rejected] Error:", action.payload);
        state.sendingEmail = false;
        state.error = action.payload;
      })

      // fetchScheduledEmails
      .addCase(fetchScheduledEmails.pending, (state) => {
        // console.log("[fetchScheduledEmails.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScheduledEmails.fulfilled, (state, action) => {
        // console.log("[fetchScheduledEmails.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.scheduledEmails = action.payload;
      })
      .addCase(fetchScheduledEmails.rejected, (state, action) => {
        console.error("[fetchScheduledEmails.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })

      // cancelScheduledEmail
      .addCase(cancelScheduledEmail.pending, (state) => {
        // console.log("[cancelScheduledEmail.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelScheduledEmail.fulfilled, (state, action) => {
        // console.log("[cancelScheduledEmail.fulfilled] Payload:", action.payload);
        state.loading = false;
        // Remove from scheduled emails
        state.scheduledEmails = state.scheduledEmails.filter(
          (email) => email._id !== action.payload.scheduleId
        );
      })
      .addCase(cancelScheduledEmail.rejected, (state, action) => {
        console.error("[cancelScheduledEmail.rejected] Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearEmailState,
  clearEmailError,
  clearSingleLog,
  clearBulkResults,
  setFilters,
  resetFilters,
  clearStats,
  clearDeliveryReport,
  setEmailConfigValid,
} = emailSlice.actions;

export default emailSlice.reducer;
