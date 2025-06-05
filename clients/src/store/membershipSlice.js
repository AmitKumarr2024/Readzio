import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Base URL assumed set inside axiosInstance

// === Async Thunks ===

// Fetch posts (author's posts)
export const fetchPosts = createAsyncThunk(
  "membership/fetchPosts",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscriptionPlan/author/${authorId}/plan`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Fetch membership plan for author
export const fetchPlan = createAsyncThunk(
  "membership/fetchPlan",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscriptionPlan/author/${authorId}/plan`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Create membership plan
export const createPlan = createAsyncThunk(
  "membership/createPlan",
  async (planData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/subscriptionPlan/author/create", planData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Delete membership plan
export const deletePlan = createAsyncThunk(
  "membership/deletePlan",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/subscriptionPlan/author/${authorId}/plan`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Fetch subscribers of author
export const fetchSubscribers = createAsyncThunk(
  "membership/fetchSubscribers",
  async (authorId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/subscriptionPlan/author/${authorId}/subscribers`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Delete subscriber
export const deleteSubscriber = createAsyncThunk(
  "membership/deleteSubscriber",
  async ({ authorId, subscriberId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/subscriptionPlan/author/${authorId}/subscriber/${subscriberId}`);
      return { subscriberId, ...response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Subscribe to author with paymentId
export const subscribeToAuthor = createAsyncThunk(
  "membership/subscribeToAuthor",
  async ({ authorId, paymentId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/subscriptionPlan/subscribe/${authorId}`,
        { paymentId }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Check post access
export const checkPostAccess = createAsyncThunk(
  "membership/checkPostAccess",
  async ({ authorId, postId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/subscriptionPlan/check-access/${authorId}/post/${postId}`
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// === Slice ===

const membershipSlice = createSlice({
  name: "membership",
  initialState: {
    posts: [],
    plan: null,
    subscribers: [],
    subscriptionData: null,
    currentPostAccess: {
      authorId: null,
      postId: null,
      hasAccess: false,
      message: null,
    },

    selectedPosts: [],
    planType: "free",
    membershipFee: 0,
    startDate: "",
    expiryDate: "",
    bankDetails: { bankName: "", accountNumber: "", ifscCode: "" },

    isModalOpen: false,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedPosts(state, action) {
      state.selectedPosts = action.payload;
    },
    setPlanType(state, action) {
      state.planType = action.payload;
    },
    setMembershipFee(state, action) {
      state.membershipFee = action.payload;
    },
    setStartDate(state, action) {
      state.startDate = action.payload;
    },
    setExpiryDate(state, action) {
      state.expiryDate = action.payload;
    },
    setBankDetails(state, action) {
      state.bankDetails = action.payload;
    },
    toggleModal(state) {
      state.isModalOpen = !state.isModalOpen;
    },
    clearError(state) {
      state.error = null;
    },
    resetPostAccess(state) {
      state.currentPostAccess = {
        authorId: null,
        postId: null,
        hasAccess: false,
        message: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPosts
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.data || [];
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchPlan
      .addCase(fetchPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.plan = action.payload.data;
        state.selectedPosts = action.payload.data?.posts || [];
        state.planType = action.payload.data?.planType || "free";
        state.membershipFee = action.payload.data?.amount || 0;
        state.startDate = action.payload.data?.startDate || "";
        state.expiryDate = action.payload.data?.expiryDate || "";
        state.bankDetails =
          action.payload.data?.bankAccountDetails || {
            bankName: "",
            accountNumber: "",
            ifscCode: "",
          };
      })
      .addCase(fetchPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createPlan
      .addCase(createPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.plan = action.payload.data;
      })
      .addCase(createPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // deletePlan
      .addCase(deletePlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePlan.fulfilled, (state) => {
        state.loading = false;
        state.plan = null;
        state.selectedPosts = [];
        state.planType = "free";
        state.membershipFee = 0;
        state.startDate = "";
        state.expiryDate = "";
        state.bankDetails = { bankName: "", accountNumber: "", ifscCode: "" };
      })
      .addCase(deletePlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchSubscribers
      .addCase(fetchSubscribers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscribers.fulfilled, (state, action) => {
        state.loading = false;
        state.subscribers = action.payload.data?.subscribers || [];
      })
      .addCase(fetchSubscribers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // deleteSubscriber
      .addCase(deleteSubscriber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSubscriber.fulfilled, (state, action) => {
        state.loading = false;
        // Remove subscriber from list
        state.subscribers = state.subscribers.filter(
          (sub) => sub.subscriberId !== action.meta.arg.subscriberId
        );
      })
      .addCase(deleteSubscriber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // subscribeToAuthor
      .addCase(subscribeToAuthor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(subscribeToAuthor.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptionData = action.payload.data;
      })
      .addCase(subscribeToAuthor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // checkPostAccess
      .addCase(checkPostAccess.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkPostAccess.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPostAccess = {
          authorId: action.payload.authorId,
          postId: action.payload.postId,
          hasAccess: action.payload.hasAccess,
          message: action.payload.message,
        };
      })
      .addCase(checkPostAccess.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedPosts,
  setPlanType,
  setMembershipFee,
  setStartDate,
  setExpiryDate,
  setBankDetails,
  toggleModal,
  clearError,
  resetPostAccess,
} = membershipSlice.actions;

export default membershipSlice.reducer;
