import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../connection/axiosInstance';

// Centralized logging for development
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Create a payment order
export const createOrder = createAsyncThunk(
  'payment/createOrder',
  async (orderData, { rejectWithValue }) => {
    const { amount, currency, receipt, notes } = orderData;
    if (!amount || !currency || !receipt) {
      const message = `Missing required fields: ${[
        !amount && 'amount',
        !currency && 'currency',
        !receipt && 'receipt',
      ].filter(Boolean).join(', ')}`;
      log(`[createOrder] Error: ${message}`);
      return rejectWithValue(message);
    }
    try {
      log('[createOrder] Creating order with data:', orderData);
      const res = await axiosInstance.post('/payment/razorpay/order', {
        amount,
        currency,
        receipt,
        notes,
      });
      log('[createOrder] Success:', res.data.order);
      return res.data.order;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create order';
      log(`[createOrder] Error: ${message}`);
      return rejectWithValue(message);
    }
  }
);

// Fetch payment history
export const fetchPayments = createAsyncThunk(
  'payment/fetchPayments',
  async ({ page, limit }, { rejectWithValue }) => {
    if (!page || !limit) {
      const message = `Missing required fields: ${[!page && 'page', !limit && 'limit'].filter(Boolean).join(', ')}`;
      log(`[fetchPayments] Error: ${message}`);
      return rejectWithValue(message);
    }
    try {
      log(`[fetchPayments] Fetching payments: page=${page}, limit=${limit}`);
      const res = await axiosInstance.get(`/payment/records?page=${page}&limit=${limit}`);
      log('[fetchPayments] Success:', res.data.data);
      return res.data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch payments';
      log(`[fetchPayments] Error: ${message}`);
      return rejectWithValue(message);
    }
  }
);

// Fetch all payment records
export const fetchAllPaymentRecords = createAsyncThunk(
  'payment/fetchAllPaymentRecords',
  async ({ page, limit, status }, { rejectWithValue }) => {
    try {
      log(`[fetchAllPaymentRecords] Fetching all payment records: page=${page}, limit=${limit}, status=${status}`);
      const query = `/payment/records?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`;
      const res = await axiosInstance.get(query);
      log('[fetchAllPaymentRecords] Success:', res.data.data);
      return res.data.data || []; // Ensure array return
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch payment records';
      log(`[fetchAllPaymentRecords] Error: ${message}`);
      return rejectWithValue(message);
    }
  }
);

// Verify payment
export const verifyPayment = createAsyncThunk(
  'payment/verifyPayment',
  async (paymentData, { rejectWithValue }) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      const message = `Missing required fields: ${
        [!razorpay_payment_id && 'payment_id', !razorpay_order_id && 'order_id', !razorpay_signature && 'signature']
          .filter(Boolean)
          .join(', ')
      }`;
      log(`[verifyPayment] Error: ${message}`);
      return rejectWithValue(message);
    }
    try {
      log('[verifyPayment] Verifying payment:', paymentData);
      const res = await axiosInstance.post('/payment/razorpay/verify', paymentData);
      log('[verifyPayment] Full response:', res.data);
      const dataToReturn = res.data.data ?? res.data;
      log('[verifyPayment] Returning:', dataToReturn);
      return dataToReturn;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to verify payment';
      log(`[verifyPayment] Error: ${message}`);
      return rejectWithValue(message);
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    order: null,
    paymentStatus: 'idle',
    paymentId: null,
    error: null,
    payments: [],
    paymentRecords: [], // Initialize as empty array
    paymentRecordsStatus: 'idle',
    paymentRecordsError: null,
    isModalOpen: false,
    verificationResult: null,
    subscriptionData: null,
  },
  reducers: {
    setSubscriptionData: (state, action) => {
      log('[paymentSlice] setSubscriptionData:', action.payload);
      state.subscriptionData = action.payload;
    },
    closeModal: (state) => {
      log('[paymentSlice] closeModal');
      state.isModalOpen = false;
      state.verificationResult = null;
    },
    resetPaymentState: (state) => {
      log('[paymentSlice] resetPaymentState');
      state.order = null;
      state.paymentStatus = 'idle';
      state.paymentId = null;
      state.error = null;
      state.payments = [];
      state.paymentRecords = [];
      state.paymentRecordsStatus = 'idle';
      state.paymentRecordsError = null;
      state.isModalOpen = false;
      state.verificationResult = null;
      state.subscriptionData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createOrder.pending, (state) => {
        log('[paymentSlice] createOrder pending');
        state.paymentStatus = 'loading';
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        log('[paymentSlice] createOrder fulfilled', action.payload);
        state.paymentStatus = 'succeeded';
        state.order = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        log('[paymentSlice] createOrder rejected', action.payload);
        state.paymentStatus = 'failed';
        state.error = action.payload;
      })
      // Fetch Payments
      .addCase(fetchPayments.pending, (state) => {
        log('[paymentSlice] fetchPayments pending');
        state.paymentStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        log('[paymentSlice] fetchPayments fulfilled', action.payload);
        state.paymentStatus = 'succeeded';
        state.payments = action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        log('[paymentSlice] fetchPayments rejected', action.payload);
        state.paymentStatus = 'failed';
        state.error = action.payload;
      })
      // Fetch All Payment Records
      .addCase(fetchAllPaymentRecords.pending, (state) => {
        log('[paymentSlice] fetchAllPaymentRecords pending');
        state.paymentRecordsStatus = 'loading';
        state.paymentRecordsError = null;
      })
      .addCase(fetchAllPaymentRecords.fulfilled, (state, action) => {
        log('[paymentSlice] fetchAllPaymentRecords fulfilled', action.payload);
        state.paymentRecordsStatus = 'succeeded';
        state.paymentRecords = action.payload;
      })
      .addCase(fetchAllPaymentRecords.rejected, (state, action) => {
        log('[paymentSlice] fetchAllPaymentRecords rejected', action.payload);
        state.paymentRecordsStatus = 'failed';
        state.paymentRecordsError = action.payload;
      })
      // Verify Payment
      .addCase(verifyPayment.pending, (state) => {
        log('[paymentSlice] verifyPayment pending');
        state.paymentStatus = 'loading';
        state.error = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        log('[paymentSlice] verifyPayment fulfilled', action.payload);
        state.paymentStatus = 'succeeded';
        state.paymentId = action.payload.paymentId;
        state.verificationResult = action.payload;
        state.isModalOpen = true;
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        log('[paymentSlice] verifyPayment rejected', action.payload);
        state.paymentStatus = 'failed';
        state.error = action.payload;
        state.verificationResult = { success: false, message: action.payload };
        state.isModalOpen = true;
      });
  },
});

export const {
  setSubscriptionData,
  closeModal,
  resetPaymentState,
} = paymentSlice.actions;

export default paymentSlice.reducer;