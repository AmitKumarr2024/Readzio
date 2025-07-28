import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Fetch user earnings
export const fetchUserEarnings = createAsyncThunk(
  "earnings/fetchUserEarnings",
  async (_, { rejectWithValue }) => {
    // console.log("📩 Fetching user earnings");
    try {
      const response = await axiosInstance.get("/earning/earnings");
      // console.log("✅ Fetched user earnings:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to fetch user earnings:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch earnings"
      );
    }
  }
);

// Fetch all users' earnings (admin) with pagination and time filters
export const fetchAllUsersEarnings = createAsyncThunk(
  "earnings/fetchAllUsersEarnings",
  async ({ page = 1, limit = 10, from, to }, { rejectWithValue }) => {
    // console.log("📩 Fetching all users' earnings", { page, limit, from, to });
    try {
      const query = new URLSearchParams({ page, limit });
      if (from) query.append("from", from);
      if (to) query.append("to", to);
      const response = await axiosInstance.get(`/earning/admin/earnings?${query}`);
      // console.log("✅ Fetched all users' earnings:", response.data);
      return {
        earnings: response.data.earnings || [],
        currentPage: response.data.currentPage || 1,
        totalPages: response.data.totalPages || 1,
        totalCount: response.data.totalCount || 0,
      };
    } catch (error) {
      console.error(
        "❌ Failed to fetch all users' earnings:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch all users' earnings"
      );
    }
  }
);

// Fetch earnings by user ID (admin)
export const fetchEarningsByUserId = createAsyncThunk(
  "earnings/fetchEarningsByUserId",
  async (userId, { rejectWithValue }) => {
    // console.log("📩 Fetching earnings for user:", userId);
    try {
      const response = await axiosInstance.get(`/earning/admin/user/${userId}`);
      // console.log("✅ Fetched user earnings:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to fetch user's earnings:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user's earnings"
      );
    }
  }
);

// Fetch earnings summary (admin)
export const fetchEarningsSummary = createAsyncThunk(
  "earnings/fetchEarningsSummary",
  async (_, { rejectWithValue }) => {
    // console.log("📩 Fetching earnings summary");
    try {
      const response = await axiosInstance.get("/earning/admin/earnings");
      // console.log("✅ Fetched earnings summary:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to fetch earnings summary:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch earnings summary"
      );
    }
  }
);

// Process bulk payouts (admin)
export const processBulkPayouts = createAsyncThunk(
  "earnings/processBulkPayouts",
  async (users, { rejectWithValue }) => {
    // console.log("📩 Processing bulk payouts:", users);
    try {
      const response = await axiosInstance.post("/earning/admin/payouts", {
        users,
      });
      // console.log("✅ Payouts processed:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to process payouts:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to process payouts"
      );
    }
  }
);

// Refund payout (admin)
export const refundPayout = createAsyncThunk(
  "earnings/refundPayout",
  async (paymentId, { rejectWithValue }) => {
    // console.log("📩 Refunding payout:", paymentId);
    try {
      const response = await axiosInstance.post("/earning/admin/refund", {
        paymentId,
      });
      // console.log("✅ Payout refunded:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to refund payout:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to refund payout"
      );
    }
  }
);

// Reset user earnings (admin)
export const resetUserEarnings = createAsyncThunk(
  "earnings/resetUserEarnings",
  async (userId, { rejectWithValue }) => {
    // console.log("📩 Resetting earnings for user:", userId);
    try {
      const response = await axiosInstance.delete(`/earning/admin/user/${userId}`);
      // console.log("✅ User earnings reset:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to reset user earnings:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to reset user earnings"
      );
    }
  }
);

// Record subscription payment
export const recordSubscriptionPayment = createAsyncThunk(
  "earnings/recordSubscriptionPayment",
  async (paymentData, { rejectWithValue }) => {
    // console.log("📩 Recording subscription payment:", paymentData);
    try {
      const response = await axiosInstance.post("/earning/subscription", paymentData);
      // console.log("✅ Subscription payment recorded:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to record subscription payment:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to record subscription payment"
      );
    }
  }
);

// Record ads payment
export const recordAdsPayment = createAsyncThunk(
  "earnings/recordAdsPayment",
  async (paymentData, { rejectWithValue }) => {
    // console.log("📩 Recording ads payment:", paymentData);
    try {
      const response = await axiosInstance.post("/earning/ads", paymentData);
      // console.log("✅ Ads payment recorded:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to record ads payment:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to record ads payment"
      );
    }
  }
);

// Distribute ads revenue
export const distributeAdsRevenue = createAsyncThunk(
  "earnings/distributeAdsRevenue",
  async (totalAmount, { rejectWithValue }) => {
    // console.log("📩 Distributing ads revenue:", totalAmount);
    try {
      const response = await axiosInstance.post("/earning/distribute", {
        totalAmount,
      });
      // console.log("✅ Ads revenue distributed:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to distribute ads revenue:",
        error.response?.data?.message || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to distribute ads revenue"
      );
    }
  }
);

const earningSlice = createSlice({
  name: "earnings",
  initialState: {
    userEarnings: {
      subscriptionEarnings: 0,
      adsEarnings: 0,
      totalEarnings: 0,
      paymentRecords: [],
    },
    allUsersEarnings: [],
    userEarningsById: {},
    summary: {
      totalEarnings: 0,
      totalAds: 0,
      totalSubscriptions: 0,
      topEarners: [],
    },
    paginatedUsersEarnings: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
    },
    loading: false,
    error: null,
    success: null,
  },
  reducers: {
    clearError: (state) => {
      // console.log("🧹 Clearing error state");
      state.error = null;
    },
    clearSuccess: (state) => {
      // console.log("🧹 Clearing success state");
      state.success = null;
    },
    resetEarnings: (state) => {
      // console.log("🔄 Resetting earnings state");
      state.userEarnings = {
        subscriptionEarnings: 0,
        adsEarnings: 0,
        totalEarnings: 0,
        paymentRecords: [],
      };
      state.allUsersEarnings = [];
      state.userEarningsById = {};
      state.payouts = [];
      state.paginatedUsersEarnings = [];
      state.pagination = { currentPage: 1, totalPages: 1, totalCount: 0 };
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch user earnings
    builder
      .addCase(fetchUserEarnings.pending, (state) => {
        // console.log("⏳ Fetch user earnings pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserEarnings.fulfilled, (state, action) => {
        // console.log("✅ Fetch user earnings fulfilled");
        state.loading = false;
        state.userEarnings = action.payload;
      })
      .addCase(fetchUserEarnings.rejected, (state, action) => {
        // console.log("❌ Fetch user earnings rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch all users' earnings (admin)
      .addCase(fetchAllUsersEarnings.pending, (state) => {
        // console.log("⏳ Fetch all users earnings pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsersEarnings.fulfilled, (state, action) => {
        // console.log("✅ Fetch all users earnings fulfilled:", action.payload);
        state.loading = false;
        state.paginatedUsersEarnings = action.payload.earnings || [];
        state.allUsersEarnings = action.payload.earnings || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalCount: action.payload.totalCount || 0,
        };
      })
      .addCase(fetchAllUsersEarnings.rejected, (state, action) => {
        // console.log("❌ Fetch all users earnings rejected:", action.payload);
        state.loading = false;
        state.error = action.payload;
        state.pagination = { currentPage: 1, totalPages: 1, totalCount: 0 };
      })
      // Fetch earnings by user ID (admin)
      .addCase(fetchEarningsByUserId.pending, (state) => {
        // console.log("⏳ Fetch earnings by user ID pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEarningsByUserId.fulfilled, (state, action) => {
        // console.log("✅ Fetch earnings by user ID fulfilled");
        state.loading = false;
        const userId = action.payload?.user?._id;
        if (userId) {
          state.userEarningsById[userId] = action.payload;
        }
      })
      .addCase(fetchEarningsByUserId.rejected, (state, action) => {
        // console.log("❌ Fetch earnings by user ID rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch earnings summary (admin)
      .addCase(fetchEarningsSummary.pending, (state) => {
        // console.log("⏳ Fetch earnings summary pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEarningsSummary.fulfilled, (state, action) => {
        // console.log("✅ Fetch earnings summary fulfilled");
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchEarningsSummary.rejected, (state, action) => {
        // console.log("❌ Fetch earnings summary rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Process bulk payouts (admin)
      .addCase(processBulkPayouts.pending, (state) => {
        // console.log("⏳ Process bulk payouts pending");
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(processBulkPayouts.fulfilled, (state, action) => {
        // console.log("✅ Process bulk payouts fulfilled");
        state.loading = false;
        state.payouts = action.payload.payouts;
        state.success = action.payload.message;
      })
      .addCase(processBulkPayouts.rejected, (state, action) => {
        // console.log("❌ Process bulk payouts rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Refund payout (admin)
      .addCase(refundPayout.pending, (state) => {
        // console.log("⏳ Refund payout pending");
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(refundPayout.fulfilled, (state, action) => {
        // console.log("✅ Refund payout fulfilled");
        state.loading = false;
        state.success = action.payload.message;
      })
      .addCase(refundPayout.rejected, (state, action) => {
        // console.log("❌ Refund payout rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Reset user earnings (admin)
      .addCase(resetUserEarnings.pending, (state) => {
        // console.log("⏳ Reset user earnings pending");
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(resetUserEarnings.fulfilled, (state, action) => {
        // console.log("✅ Reset user earnings fulfilled");
        state.loading = false;
        state.success = action.payload.message;
        state.userEarningsById = {};
        state.allUsersEarnings = state.allUsersEarnings.filter(
          (e) => e.user?._id !== action.meta.arg
        );
        state.paginatedUsersEarnings = state.paginatedUsersEarnings.filter(
          (e) => e.user?._id !== action.meta.arg
        );
      })
      .addCase(resetUserEarnings.rejected, (state, action) => {
        // console.log("❌ Reset user earnings rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Record subscription payment
      .addCase(recordSubscriptionPayment.pending, (state) => {
        // console.log("⏳ Record subscription payment pending");
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(recordSubscriptionPayment.fulfilled, (state, action) => {
        // console.log("✅ Record subscription payment fulfilled");
        state.loading = false;
        state.success = action.payload.message;
        state.userEarnings.paymentRecords.push(action.payload.payment);
      })
      .addCase(recordSubscriptionPayment.rejected, (state, action) => {
        // console.log("❌ Record subscription payment rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Record ads payment
      .addCase(recordAdsPayment.pending, (state) => {
        // console.log("⏳ Record ads payment pending");
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(recordAdsPayment.fulfilled, (state, action) => {
        // console.log("✅ Record ads payment fulfilled");
        state.loading = false;
        state.success = action.payload.message;
        state.userEarnings.paymentRecords.push(action.payload.payment);
      })
      .addCase(recordAdsPayment.rejected, (state, action) => {
        // console.log("❌ Record ads payment rejected");
        state.loading = false;
        state.error = action.payload;
      })
      // Distribute ads revenue
      .addCase(distributeAdsRevenue.pending, (state) => {
        // console.log("⏳ Distribute ads revenue pending");
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(distributeAdsRevenue.fulfilled, (state, action) => {
        // console.log("✅ Distribute ads revenue fulfilled");
        state.loading = false;
        state.success = action.payload.message;
        state.payouts = action.payload.payments || [];
      })
      .addCase(distributeAdsRevenue.rejected, (state, action) => {
        // console.log("❌ Distribute ads revenue rejected");
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccess, resetEarnings } = earningSlice.actions;
export default earningSlice.reducer;