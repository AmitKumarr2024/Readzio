import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Async Thunks
export const createSubscriptionPlan = createAsyncThunk(
  "subscription/createPlan",
  async (planData, { rejectWithValue }) => {
    try {
      console.log("📩 Creating subscription plan:", planData);
      const response = await axiosInstance.post(
        "/subscription/plans",
        planData
      );
      console.log("✅ Create subscription plan response:", response.data);
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
      console.log("📩 Updating subscription plan:", { planId, planData });
      const response = await axiosInstance.patch(
        `/subscription/plans/${planId}`,
        planData
      );
      console.log("✅ Update subscription plan response:", response.data);
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

export const deleteSubscriptionPlan = createAsyncThunk(
  "subscription/deletePlan",
  async (planId, { rejectWithValue }) => {
    try {
      console.log("📩 Deleting subscription plan:", planId);
      const response = await axiosInstance.delete(
        `/subscription/plans/${planId}`
      );
      console.log("✅ Delete subscription plan response:", response.data);
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
  async (subscriptionData, { rejectWithValue }) => {
    try {
      console.log("📩 Subscribing to plan:", subscriptionData);
      const response = await axiosInstance.post(
        "/subscription/subscribe",
        subscriptionData
      );
      console.log("✅ Subscribe to plan response:", response.data);
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
      console.log("📩 Cancelling subscription:", subscriptionId);
      const response = await axiosInstance.patch(
        `/subscription/subscriptions/${subscriptionId}/cancel`,
        {}
      );
      console.log("✅ Cancel subscription response:", response.data);
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
      console.log("📩 Refunding subscription:", subscriptionId);
      const response = await axiosInstance.patch(
        `/subscription/${subscriptionId}/refund`,
        {
          reason,
          bankDetails,
        }
      );
      console.log("✅ Refund subscription response:", response.data);
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
      console.log("📩 Fetching subscription analytics for plan:", planId);
      const response = await axiosInstance.get(
        `/subscription/plans/${planId}/analytics`
      );
      console.log("✅ Subscription analytics response:", response.data);
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
      console.log("📩 Fetching subscription status for:", { userId, authorId });
      const response = await axiosInstance.post("/subscription/status", {
        userId,
        authorId,
      });
      console.log("✅ Subscription status response:", response.data);
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
      console.log("📩 Sending renewal reminders:", reminderData);
      const response = await axiosInstance.post(
        "/subscription/reminders",
        reminderData
      );
      console.log("✅ Send renewal reminders response:", response.data);
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
      console.log("📩 Fetching my subscription plans (including deleted)");
      const response = await axiosInstance.get(
        "/subscription/my-plans?includeDeleted=true"
      );
      console.log("✅ Fetch my plans response:", {
        count: response.data.plans?.length,
      });
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
      console.log("📩 Unsubscribing from plans by author:", {
        authorId,
        userId,
      });
      const response = await axiosInstance.post(
        "/subscription/unsubscribe/author",
        { authorId, userId }
      );
      console.log("✅ Unsubscribe from author plans response:", response.data);
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
      console.log("📩 Fetching plans by author:", authorId);
      const response = await axiosInstance.get(
        `/subscription/plans/author/${authorId}`
      );
      console.log("✅ Fetch plans by author response:", {
        count: response.data.plans?.length,
      });
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error fetching plans by author:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSubscriptionHistoryByAuthor = createAsyncThunk(
  "subscription/fetchSubscriptionHistoryByAuthor",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/subscription/author/${authorId}/subscriptions`
      );
      console.log("✅ Subscription history:", response.data.subscriptions);
      return response.data.subscriptions; // Must be array
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
      console.log("📩 Fetching plans I have subscribed to");
      const response = await axiosInstance.get(
        "/subscription/my-subscriptions"
      );
      console.log("✅ Subscribed plans response:", {
        count: response.data.count,
      });
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
const subscriptionSlice = createSlice({
  name: "subscription",
  initialState: {
    plans: [],
    subscriptions: [],
    subscriptionHistory: [],
    subscribedPlans: [],
    analytics: {},
    loading: false,
    error: null,
    isSubscribed: {},
    subscriptionInfo: null,
    subscriptionStatus: null,
    pendingPlans: [],
    count: 0,
  },
  reducers: {
    clearError: (state) => {
      console.log("subscriptionSlice: Clearing error");
      state.loading = false;
      state.error = null;
    },
    clearSubscriptionStatus: (state) => {
      console.log("subscriptionSlice: Clearing subscription status");
      state.isSubscribed = {};
      state.subscriptionStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSubscriptionPlan.pending, (state) => {
        console.log("subscriptionSlice: Create subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(createSubscriptionPlan.fulfilled, (state, action) => {
        console.log("subscriptionSlice: Create subscription plan fulfilled", {
          planId: action.payload.plan?._id,
        });
        state.loading = false;
        state.plans.push(action.payload.plan);
      })
      .addCase(createSubscriptionPlan.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error creating subscription plan:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSubscriptionPlan.pending, (state) => {
        console.log("subscriptionSlice: Update subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubscriptionPlan.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Updated subscription plan:",
          action.payload.plan._id
        );
        state.loading = false;
        const index = state.plans.findIndex(
          (plan) => plan._id === action.payload.plan._id
        );
        if (index !== -1) {
          state.plans[index] = action.payload.plan;
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
        console.log("subscriptionSlice: Delete subscription plan pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSubscriptionPlan.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Deleted subscription plan:",
          action.meta.arg
        );
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
        console.log("subscriptionSlice: Subscribing to plan");
        state.loading = true;
        state.error = null;
      })
      .addCase(subscribeToPlan.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Subscribed to plan:",
          action.payload.subscription?._id
        );
        state.loading = false;
        state.subscriptions.push(action.payload.subscription);
        if (action.payload.subscription?.authorId) {
          state.isSubscribed[action.payload.subscription.authorId] = true;
        }
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
        console.log("subscriptionSlice: Cancel subscription pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Canceled subscription:",
          action.payload.subscription?._id
        );
        state.loading = false;
        const index = state.subscriptions.findIndex(
          (sub) => sub._id === action.payload.subscription?._id
        );
        if (index !== -1) {
          state.subscriptions[index] = action.payload.subscription;
          if (
            action.payload.subscription?.authorId &&
            action.payload.subscription?.status !== "active"
          ) {
            state.isSubscribed[action.payload.subscription.authorId] = false;
          }
        }
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error canceling subscription:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(refundSubscription.pending, (state) => {
        console.log("subscriptionSlice: Refunding subscription");
        state.loading = true;
        state.error = null;
      })
      .addCase(refundSubscription.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Refunded subscription:",
          action.payload.subscription?._id
        );
        state.loading = false;
        const index = state.subscriptions.findIndex(
          (sub) => sub._id === action.payload.subscription?._id
        );
        if (index !== -1) {
          state.subscriptions[index] = action.payload.subscription;
          if (
            action.payload.subscription?.authorId &&
            action.payload.subscription?.status !== "active"
          ) {
            state.isSubscribed[action.payload.subscription.authorId] = false;
          }
        }
        const historyIndex = state.subscriptionHistory.findIndex(
          (sub) => sub._id === action.payload.subscription?._id
        );
        if (historyIndex !== -1) {
          state.subscriptionHistory[historyIndex] = action.payload.subscription;
        } else {
          state.subscriptionHistory.push(action.payload.subscription);
        }
      })
      .addCase(refundSubscription.rejected, (state, action) => {
        console.error("subscriptionSlice: Error refunding:", action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getSubscriptionAnalytics.pending, (state) => {
        console.log("subscriptionSlice: Fetching analytics");
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubscriptionAnalytics.fulfilled, (state, action) => {
        console.log("subscriptionSlice: Fetched analytics:", action.payload);
        state.loading = false;
        const { planId, totalSubscribers, activeSubscribers, totalRevenue } =
          action.payload;
        state.analytics[planId] = {
          totalSubscribers,
          activeSubscribers,
          totalRevenue,
        };
      })
      .addCase(getSubscriptionAnalytics.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching analytics:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getSubscriptionStatusByAuthor.pending, (state) => {
        console.log(
          "subscriptionSlice: Fetching subscription status by author"
        );
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubscriptionStatusByAuthor.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Fetched subscription status:",
          action.payload
        );
        state.loading = false;
        const { authorId, isSubscribed } = action.payload;
        state.isSubscribed[authorId] = isSubscribed;
        state.subscriptionStatus = action.payload;
      })
      .addCase(getSubscriptionStatusByAuthor.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching subscription status:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
        state.subscriptionStatus = null;
      })
      .addCase(sendRenewalReminders.pending, (state) => {
        console.log("subscriptionSlice: Sending renewal reminders");
        state.loading = true;
        state.error = null;
      })
      .addCase(sendRenewalReminders.fulfilled, (state) => {
        console.log("subscriptionSlice: Renewal reminders sent");
        state.loading = false;
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
        console.log("subscriptionSlice: Fetching my plans");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySubscriptionPlans.fulfilled, (state, action) => {
        console.log("subscriptionSlice: Fetched my plans:", {
          count: action.payload.plans?.length,
        });
        state.loading = false;
        state.plans = action.payload.plans || [];
        state.count = action.payload.count || 0;
        state.hasFetchedPlans = true;
      })
      .addCase(fetchMySubscriptionPlans.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching my plans:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(unsubscribeFromPlanByAuthor.pending, (state) => {
        console.log("subscriptionSlice: Unsubscribing from author plans");
        state.loading = true;
        state.error = null;
      })
      .addCase(unsubscribeFromPlanByAuthor.fulfilled, (state, action) => {
        console.log(
          "subscriptionSlice: Unsubscribed from author plans:",
          action.payload.authorId
        );
        state.loading = false;
        state.subscriptions = state.subscriptions.filter(
          (sub) =>
            sub.authorId !== action.payload.authorId ||
            sub.userId !== action.payload.userId
        );
        if (action.payload.authorId) {
          state.isSubscribed[action.payload.authorId] = false;
        }
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
        console.log("subscriptionSlice: Fetching plans by author");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlansByAuthor.fulfilled, (state, action) => {
        console.log("subscriptionSlice: Fetched plans by author:", {
          count: action.payload.plans?.length,
        });
        state.loading = false;
        state.plans = action.payload.plans || [];
        state.count = action.payload.count || 0;
        state.hasFetchedPlans = true;
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
        console.log("subscriptionSlice: Fetching subscription history");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionHistoryByAuthor.fulfilled, (state, action) => {
        console.log("subscriptionSlice: Fetched subscription history:", {
          count: action.payload?.length,
        });
        state.loading = false;
        state.subscriptionHistory = action.payload || []; // Set to subscriptions array
      })
      .addCase(fetchSubscriptionHistoryByAuthor.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching subscription history:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
        state.subscriptionHistory = []; // Clear history on error
      })
      .addCase(fetchMySubscribedPlans.pending, (state) => {
        console.log("subscriptionSlice: Fetching my subscribed plans");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySubscribedPlans.fulfilled, (state, action) => {
        console.log("subscriptionSlice: Fetched my subscribed plans:", {
          count: action.payload.plans?.length,
        });
        state.loading = false;
        state.subscribedPlans = action.payload.plans || [];
        state.count = action.payload.count || 0; // Update count
        state.hasFetchedSubscribedPlans = true; // Set flag
      })
      .addCase(fetchMySubscribedPlans.rejected, (state, action) => {
        console.error(
          "subscriptionSlice: Error fetching my subscribed plans:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
        state.hasFetchedSubscribedPlans = true; // Set flag even on error
      });
  },
});

export const { clearError, clearSubscriptionStatus } =
  subscriptionSlice.actions;
export default subscriptionSlice.reducer;
