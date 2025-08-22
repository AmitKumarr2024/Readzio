import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const createSubscriptionPlan = createAsyncThunk(
  "subscription/createPlan",
  async (planData, { rejectWithValue }) => {
    try {
      // console.log("📩 Creating subscription plan:", planData);
      const response = await axiosInstance.post(
        "/subscription/plans",
        planData,
        { withCredentials: true }
      );
      // console.log("✅ Create subscription plan response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error creating subscription plan:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateSubscriptionPlan = createAsyncThunk(
  "subscription/updatePlan",
  async ({ planId, planData }, { rejectWithValue }) => {
    try {
      // console.log("📩 Updating subscription plan:", { planId, planData });
      const response = await axiosInstance.patch(
        `/subscription/plans/${planId}`,
        planData,
        { withCredentials: true }
      );
      // console.log("✅ Update subscription plan response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error updating subscription plan:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const activateSubscriptionPlan = createAsyncThunk(
  "subscription/activatePlan",
  async (planId, { rejectWithValue }) => {
    try {
      // console.log("📩 Activating subscription plan:", planId);
      const response = await axiosInstance.post(
        `/subscription/plans/${planId}/activate`,
        {},
        { withCredentials: true }
      );
      // console.log("✅ Activate subscription plan response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error activating subscription plan:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteSubscriptionPlan = createAsyncThunk(
  "subscription/deletePlan",
  async (planId, { rejectWithValue }) => {
    try {
      // console.log("📩 Deleting subscription plan:", planId);
      const response = await axiosInstance.delete(
        `/subscription/plans/${planId}`,
        { withCredentials: true }
      );
      // console.log("✅ Delete subscription plan response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error deleting subscription plan:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const subscribeToPlan = createAsyncThunk(
  "subscription/subscribe",
  async (subscriptionData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.user?.token || localStorage.getItem("jwt");
      if (!token) throw new Error("Missing authentication token");

      if (!subscriptionData.planId) throw new Error("Missing plan ID");

      // console.log("📩 Subscribing to plan with data:", subscriptionData);
      const response = await axiosInstance.post(
        "/subscription/subscribe",
        subscriptionData,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      // console.log("✅ Subscribed to plan:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error subscribing to plan:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  "subscription/cancel",
  async (subscriptionId, { rejectWithValue }) => {
    try {
      // console.log("📩 Cancelling subscription:", subscriptionId);
      const response = await axiosInstance.patch(
        `/subscription/subscriptions/${subscriptionId}/cancel`,
        {},
        { withCredentials: true }
      );
      // console.log("✅ Cancel subscription response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error cancelling subscription:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const refundSubscription = createAsyncThunk(
  "subscription/refund",
  async ({ subscriptionId, reason, bankDetails }, { rejectWithValue }) => {
    try {
      // console.log("📩 Refunding subscription:", subscriptionId);
      const response = await axiosInstance.patch(
        `/subscription/subscriptions/${subscriptionId}/refund`,
        { reason, bankDetails },
        { withCredentials: true }
      );
      // console.log("✅ Refund subscription response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error refunding subscription:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const getSubscriptionAnalytics = createAsyncThunk(
  "subscription/analytics",
  async (planId, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching subscription analytics for plan:", planId);
      const response = await axiosInstance.get(
        `/subscription/plans/${planId}/analytics`,
        { withCredentials: true }
      );
      // console.log("✅ Subscription analytics response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error fetching subscription analytics:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const getSubscriptionStatusByAuthor = createAsyncThunk(
  "subscription/getStatusByAuthor",
  async ({ userId, authorId }, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching subscription status for:", { userId, authorId });
      const response = await axiosInstance.post(
        "/subscription/status",
        { userId, authorId },
        { withCredentials: true }
      );
      // console.log("✅ Subscription status response:", response.data);
      return { authorId, ...response.data };
    } catch (error) {
      console.error(
        "❌ Error fetching subscription status:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const sendRenewalReminders = createAsyncThunk(
  "subscription/renewalReminders",
  async (reminderData, { rejectWithValue }) => {
    try {
      // console.log("📩 Sending renewal reminders:", reminderData);
      const response = await axiosInstance.post(
        "/subscription/reminders",
        reminderData,
        { withCredentials: true }
      );
      // console.log("✅ Send renewal reminders response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error sending renewal reminders:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchMySubscriptionPlans = createAsyncThunk(
  "subscription/fetchMyPlans",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching my subscription plans (including deleted)");
      const response = await axiosInstance.get(
        "/subscription/my-plans?includeDeleted=true",
        { withCredentials: true }
      );
      // console.log("✅ Fetch my plans response:", {
      //   count: response.data.plans?.length,
      // });
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error fetching my plans:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const unsubscribeFromPlanByAuthor = createAsyncThunk(
  "subscription/unsubscribeFromPlanByAuthor",
  async ({ authorId, userId }, { rejectWithValue }) => {
    try {
      // console.log("📩 Unsubscribing from plans by author:", {
      //   authorId,
      //   userId,
      // });
      const response = await axiosInstance.post(
        "/subscription/unsubscribe/author",
        { authorId, userId },
        { withCredentials: true }
      );
      // console.log("✅ Unsubscribe from author plans response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error unsubscribing from author plans:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSubscriptionPlansByAuthor = createAsyncThunk(
  "subscription/fetchPlansByAuthor",
  async (authorId, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching plans by author:", authorId);
      const response = await axiosInstance.get(
        `/subscription/plans/author/${authorId}`,
        {
          withCredentials: true,
          timeout: 20000, // 20 seconds
        }
      );
      // console.log("✅ Fetch plans by author response:", {
      //   count: response.data.plans?.length,
      // });
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        authorId,
        timeout: error.code === "ECONNABORTED",
      };
      console.error("❌ Error fetching plans by author:", errorDetails);
      return rejectWithValue(errorDetails);
    }
  }
);

export const fetchSubscriptionHistoryByAuthor = createAsyncThunk(
  "subscription/fetchSubscriptionHistoryByAuthor",
  async (authorId, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching subscription history for author:", authorId);
      const response = await axiosInstance.get(
        `/subscription/author/${authorId}/subscriptions`,
        { withCredentials: true }
      );
      // console.log("✅ Subscription history:", response.data.subscriptions);
      return response.data.subscriptions;
    } catch (error) {
      console.error(
        "❌ Fetch history error:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchMySubscribedPlans = createAsyncThunk(
  "subscription/fetchMySubscribedPlans",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching plans I have subscribed to");
      const response = await axiosInstance.get(
        "/subscription/my-subscriptions",
        { withCredentials: true }
      );
      // console.log("✅ Subscribed plans response:", {
      //   count: response.data.count,
      // });
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error fetching my subscribed plans:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch subscribed plans"
      );
    }
  }
);

export const checkEligibilityForSubscription = createAsyncThunk(
  "subscription/checkEligibility",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("📩 Checking subscription eligibility");
      const response = await axiosInstance.get(
        "/subscription/check-eligibility",
        { withCredentials: true }
      );
      // console.log("✅ Eligibility response:", response.data);
      return {
        ...response.data,
        criteria: response.data.criteria || {
          minFollowers: 1000,
          minPosts: 30,
          minEngagementRate: 0.02,
          minAccountAgeDays: 180,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error checking eligibility:",
        error.response?.data || error.message
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
            minFollowers: 1000,
            minPosts: 30,
            minEngagementRate: 0.02,
            minAccountAgeDays: 180,
          },
          message:
            "Subscription configuration not found, using default criteria",
        };
      }
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to check eligibility",
        details: error.response?.data || error.message,
      });
    }
  }
);

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState: {
    plans: [],
    subscriptions: [
      {
        subscriptionId: null,
        planId: null,
        planName: "",
      },
    ],
    isSubscribed: {},
    subscriptionHistory: [],
    subscribedPlans: [],
    analytics: {},
    loading: false,
    error: null,
    subscriptionStatus: null,
    pendingPlans: [],
    count: 0,
    isEligible: false,
    followerCount: 0,
    postCount: 0,
    engagementRate: 0,
    accountAgeDays: 0,
    criteria: null,
    hasFetchedSubscribedPlans: false,
  },
  reducers: {
    clearError: (state) => {
      // console.log("subscriptionSlice: Clearing error");
      state.loading = false;
      state.error = null;
    },
    clearSubscriptionStatus: (state) => {
      // console.log("subscriptionSlice: Clearing subscription status");
      state.isSubscribed = {};
      state.subscriptionStatus = null;
    },
    syncSubscriptionCriteria: (state, action) => {
      // console.log(
      //   "subscriptionSlice: Syncing subscription criteria:",
      //   action.payload
      // );
      state.criteria = action.payload;
    },
    resetSubscribedPlansFetch: (state) => {
      // console.log("subscriptionSlice: Resetting hasFetchedSubscribedPlans");
      state.hasFetchedSubscribedPlans = false; // Added reducer
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSubscriptionPlan.pending, (state) => {
        // console.log("subscriptionSlice: Create subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(createSubscriptionPlan.fulfilled, (state, action) => {
        // console.log("subscriptionSlice: Create subscription plan fulfilled", {
        //   planId: action.payload.plan?._id,
        // });
        state.loading = false;
        if (action.payload.plan) {
          state.plans.push(action.payload.plan);
        }
      })
      .addCase(createSubscriptionPlan.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error creating subscription plan:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(activateSubscriptionPlan.pending, (state) => {
        // console.log("subscriptionSlice: Activate subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(activateSubscriptionPlan.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Activated subscription plan:",
        //   action.payload.plan?._id
        // );
        state.loading = false;
        if (action.payload.plan) {
          const index = state.plans.findIndex(
            (plan) => plan._id === action.payload.plan._id
          );
          if (index !== -1) {
            state.plans[index] = action.payload.plan;
          } else {
            state.plans.push(action.payload.plan);
          }
        }
      })
      .addCase(activateSubscriptionPlan.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error activating subscription plan:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSubscriptionPlan.pending, (state) => {
        // console.log("subscriptionSlice: Update subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubscriptionPlan.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Updated subscription plan:",
        //   action.payload.plan?._id
        // );
        state.loading = false;
        if (action.payload.plan) {
          const index = state.plans.findIndex(
            (plan) => plan._id === action.payload.plan._id
          );
          if (index !== -1) {
            state.plans[index] = action.payload.plan;
          }
        }
      })
      .addCase(updateSubscriptionPlan.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error updating subscription plan:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteSubscriptionPlan.pending, (state) => {
        // console.log("subscriptionSlice: Delete subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSubscriptionPlan.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Deleted subscription plan:",
        //   action.meta.arg
        // );
        state.loading = false;
        state.plans = state.plans.filter(
          (plan) => plan._id !== action.meta.arg
        );
      })
      .addCase(deleteSubscriptionPlan.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error deleting subscription plan:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(subscribeToPlan.pending, (state) => {
        // console.log("subscriptionSlice: Subscribe to plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(subscribeToPlan.fulfilled, (state, action) => {
        // console.log("subscriptionSlice: Subscribed to plan:", action.payload);
        state.loading = false;
        state.subscriptions.push(action.payload.subscription);
        state.isSubscribed[action.payload.planId] = true;
        state.subscriptionStatus = "Subscribed successfully";
      })
      .addCase(subscribeToPlan.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error subscribing to plan:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(cancelSubscription.pending, (state) => {
        // console.log("subscriptionSlice: Cancel subscription pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Cancelled subscription:",
        //   action.payload
        // );
        state.loading = false;
        state.subscriptions = state.subscriptions.map((sub) =>
          sub.subscriptionId === action.payload.subscriptionId
            ? { ...sub, status: "cancelled" }
            : sub
        );
        state.isSubscribed[action.payload.planId] = false;
        state.subscriptionStatus = "Subscription cancelled successfully";
        state.hasFetchedSubscribedPlans = false;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error cancelling subscription:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(refundSubscription.pending, (state) => {
        // console.log("subscriptionSlice: Refund subscription pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(refundSubscription.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Refunded subscription:",
        //   action.payload
        // );
        state.loading = false;
        state.subscriptions = state.subscriptions.map((sub) =>
          sub.subscriptionId === action.payload.subscriptionId
            ? { ...sub, status: "refunded" }
            : sub
        );
        state.isSubscribed[action.payload.planId] = false;
        state.subscriptionStatus = "Subscription refunded successfully";
      })
      .addCase(refundSubscription.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error refunding subscription:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getSubscriptionAnalytics.pending, (state) => {
        // console.log("subscriptionSlice: Get subscription analytics pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubscriptionAnalytics.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Fetched subscription analytics:",
        //   action.payload
        // );
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(getSubscriptionAnalytics.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching subscription analytics:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getSubscriptionStatusByAuthor.pending, (state) => {
        // console.log("subscriptionSlice: Get subscription status pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubscriptionStatusByAuthor.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Fetched subscription status:",
        //   action.payload
        // );
        state.loading = false;
        state.isSubscribed[action.payload.authorId] =
          action.payload.isSubscribed;
        state.subscriptionStatus = action.payload.status;
      })
      .addCase(getSubscriptionStatusByAuthor.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching subscription status:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(sendRenewalReminders.pending, (state) => {
        // console.log("subscriptionSlice: Send renewal reminders pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(sendRenewalReminders.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Sent renewal reminders:",
        //   action.payload
        // );
        state.loading = false;
        state.subscriptionStatus = "Renewal reminders sent successfully";
      })
      .addCase(sendRenewalReminders.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error sending renewal reminders:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMySubscriptionPlans.pending, (state) => {
        // console.log("subscriptionSlice: Fetch my subscription plans pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySubscriptionPlans.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Fetched my subscription plans:",
        //   action.payload
        // );
        state.loading = false;
        state.plans = action.payload.plans || [];
        state.count = action.payload.count || 0;
      })
      .addCase(fetchMySubscriptionPlans.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching my subscription plans:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(unsubscribeFromPlanByAuthor.pending, (state) => {
        // console.log("subscriptionSlice: Unsubscribe from author plans pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(unsubscribeFromPlanByAuthor.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Unsubscribed from author plans:",
        //   action.payload
        // );
        state.loading = false;
        state.subscriptions = state.subscriptions.filter(
          (sub) => sub.authorId !== action.payload.authorId
        );
        state.isSubscribed[action.payload.authorId] = false;
        state.subscriptionStatus = "Unsubscribed successfully";
      })
      .addCase(unsubscribeFromPlanByAuthor.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error unsubscribing from author plans:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSubscriptionPlansByAuthor.pending, (state) => {
        // console.log("subscriptionSlice: Fetch plans by author pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlansByAuthor.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Fetched plans by author:",
        //   action.payload
        // );
        state.loading = false;
        state.plans = action.payload.plans || [];
        state.count = action.payload.count || 0;
      })
      .addCase(fetchSubscriptionPlansByAuthor.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching plans by author:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSubscriptionHistoryByAuthor.pending, (state) => {
        // console.log(
        //   "subscriptionSlice: Fetch subscription history by author pending"
        // );
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionHistoryByAuthor.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Fetched subscription history:",
        //   action.payload
        // );
        state.loading = false;
        state.subscriptionHistory = action.payload || [];
      })
      .addCase(fetchSubscriptionHistoryByAuthor.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching subscription history:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMySubscribedPlans.pending, (state) => {
        // console.log("subscriptionSlice: Fetch my subscribed plans pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySubscribedPlans.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Fetched my subscribed plans:",
        //   action.payload
        // );
        state.loading = false;
        state.subscribedPlans = action.payload.plans || [];
        state.count = action.payload.count || 0;
        state.hasFetchedSubscribedPlans = true;
      })
      .addCase(fetchMySubscribedPlans.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching my subscribed plans:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
        state.hasFetchedSubscribedPlans = true;
      })
      .addCase(checkEligibilityForSubscription.pending, (state) => {
        // console.log("subscriptionSlice: Check eligibility pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(checkEligibilityForSubscription.fulfilled, (state, action) => {
        // console.log(
        //   "subscriptionSlice: Subscription eligibility checked:",
        //   action.payload
        // );
        state.loading = false;
        state.isEligible = action.payload.isEligible || false;
        state.followerCount = action.payload.followerCount || 0;
        state.postCount = action.payload.postCount || 0;
        state.engagementRate = action.payload.engagementRate || 0;
        state.accountAgeDays = action.payload.accountAgeDays || 0;
        state.criteria = action.payload.criteria || {
          minFollowers: 1000,
          minPosts: 30,
          minEngagementRate: 0.02,
          minAccountAgeDays: 180,
        };
        state.error = action.payload.message
          ? { message: action.payload.message }
          : null;
      })
      .addCase(checkEligibilityForSubscription.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error checking subscription eligibility:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload.message || "Failed to check eligibility";
        if (action.payload.criteria) {
          state.criteria = action.payload.criteria;
          state.isEligible = action.payload.isEligible || false;
          state.followerCount = action.payload.followerCount || 0;
          state.postCount = action.payload.postCount || 0;
          state.engagementRate = action.payload.engagementRate || 0;
          state.accountAgeDays = action.payload.accountAgeDays || 0;
        }
      });
  },
});

export const {
  clearError,
  clearSubscriptionStatus,
  syncSubscriptionCriteria,
  resetSubscribedPlansFetch,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
