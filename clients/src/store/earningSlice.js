import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../connection/axiosInstance';

// Async thunk for fetching user earnings
export const fetchUserEarnings = createAsyncThunk(
  'earnings/fetchUserEarnings',
  async (_, { rejectWithValue }) => {
    console.log('📩 Fetching user earnings');
    try {
      const response = await axiosInstance.get('/earning/earnings');
      console.log('✅ Fetched user earnings:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch user earnings:', error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch earnings');
    }
  }
);

// Async thunk for fetching all users' earnings (admin)
export const fetchAllUsersEarnings = createAsyncThunk(
  'earnings/fetchAllUsersEarnings',
  async (_, { rejectWithValue }) => {
    console.log('📩 Fetching all users\' earnings');
    try {
      const response = await axiosInstance.get('/earning/admin/earnings');
      console.log('✅ Fetched all users\' earnings:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch all users\' earnings:', error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all users\' earnings');
    }
  }
);

// Async thunk for processing bulk payouts (admin)
export const processBulkPayouts = createAsyncThunk(
  'earnings/processBulkPayouts',
  async (users, { rejectWithValue }) => {
    console.log('📩 Processing bulk payouts:', users);
    try {
      const response = await axiosInstance.post('/earning/admin/payouts', { users });
      console.log('✅ Payouts processed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to process payouts:', error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to process payouts');
    }
  }
);

// Async thunk for recording subscription payment
export const recordSubscriptionPayment = createAsyncThunk(
  'earnings/recordSubscriptionPayment',
  async (paymentData, { rejectWithValue }) => {
    console.log('📩 Recording subscription payment:', paymentData);
    try {
      const response = await axiosInstance.post('/earning/subscription', paymentData);
      console.log('✅ Subscription payment recorded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to record subscription payment:', error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to record subscription payment');
    }
  }
);

// Async thunk for recording ads payment
export const recordAdsPayment = createAsyncThunk(
  'earnings/recordAdsPayment',
  async (paymentData, { rejectWithValue }) => {
    console.log('📩 Recording ads payment:', paymentData);
    try {
      const response = await axiosInstance.post('/earning/ads', paymentData);
      console.log('✅ Ads payment recorded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to record ads payment:', error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to record ads payment');
    }
  }
);

const earningSlice = createSlice({
  name: 'earnings',
  initialState: {
    userEarnings: {
      subscriptionEarnings: 0,
      adsEarnings: 0,
      totalEarnings: 0,
      paymentRecords: [],
    },
    allUsersEarnings: [],
    payouts: [],
    loading: false,
    error: null,
    success: null,
  },
  reducers: {
    clearError: (state) => {
      console.log('🧹 Clearing error state');
      state.error = null;
    },
    clearSuccess: (state) => {
      console.log('🧹 Clearing success state');
      state.success = null;
    },
    resetEarnings: (state) => {
      console.log('🔄 Resetting earnings state');
      state.userEarnings = {
        subscriptionEarnings: 0,
        adsEarnings: 0,
        totalEarnings: 0,
        paymentRecords: [],
      };
      state.allUsersEarnings = [];
      state.payouts = [];
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch user earnings
    builder
      .addCase(fetchUserEarnings.pending, (state) => {
        console.log('⏳ Fetch user earnings pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserEarnings.fulfilled, (state, action) => {
        console.log('✅ Fetch user earnings fulfilled');
        state.loading = false;
        state.userEarnings = action.payload;
      })
      .addCase(fetchUserEarnings.rejected, (state, action) => {
        console.log('❌ Fetch user earnings rejected');
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch all users' earnings (admin)
    builder
      .addCase(fetchAllUsersEarnings.pending, (state) => {
        console.log('⏳ Fetch all users earnings pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsersEarnings.fulfilled, (state, action) => {
        console.log('✅ Fetch all users earnings fulfilled');
        state.loading = false;
        state.allUsersEarnings = action.payload;
      })
      .addCase(fetchAllUsersEarnings.rejected, (state, action) => {
        console.log('❌ Fetch all users earnings rejected');
        state.loading = false;
        state.error = action.payload;
      });

    // Process bulk payouts (admin)
    builder
      .addCase(processBulkPayouts.pending, (state) => {
        console.log('⏳ Process bulk payouts pending');
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(processBulkPayouts.fulfilled, (state, action) => {
        console.log('✅ Process bulk payouts fulfilled');
        state.loading = false;
        state.payouts = action.payload.payouts;
        state.success = action.payload.message;
      })
      .addCase(processBulkPayouts.rejected, (state, action) => {
        console.log('❌ Process bulk payouts rejected');
        state.loading = false;
        state.error = action.payload;
      });

    // Record subscription payment
    builder
      .addCase(recordSubscriptionPayment.pending, (state) => {
        console.log('⏳ Record subscription payment pending');
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(recordSubscriptionPayment.fulfilled, (state, action) => {
        console.log('✅ Record subscription payment fulfilled');
        state.loading = false;
        state.success = action.payload.message;
        state.userEarnings.paymentRecords.push(action.payload.payment);
      })
      .addCase(recordSubscriptionPayment.rejected, (state, action) => {
        console.log('❌ Record subscription payment rejected');
        state.loading = false;
        state.error = action.payload;
      });

    // Record ads payment
    builder
      .addCase(recordAdsPayment.pending, (state) => {
        console.log('⏳ Record ads payment pending');
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(recordAdsPayment.fulfilled, (state, action) => {
        console.log('✅ Record ads payment fulfilled');
        state.loading = false;
        state.success = action.payload.message;
        state.userEarnings.paymentRecords.push(action.payload.payment);
      })
      .addCase(recordAdsPayment.rejected, (state, action) => {
        console.log('❌ Record ads payment rejected');
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccess, resetEarnings } = earningSlice.actions;
export default earningSlice.reducer;