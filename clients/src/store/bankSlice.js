import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const createBankDetails = createAsyncThunk(
  "payment/createBankDetails",
  async (bankData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/payment/bank-details",
        bankData
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateBankDetails = createAsyncThunk(
  "payment/updateBankDetails",
  async ({ id, bankData }, { rejectWithValue }) => {
    try {
      if (!id || id === "null") {
        throw new Error("Invalid payment ID for update");
      }
      const response = await axiosInstance.patch(
        `/payment/bank-details/${id}`,
        bankData
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const viewBankDetails = createAsyncThunk(
  "payment/viewBankDetails",
  async (userId, { rejectWithValue, getState }) => {
    try {
      if (!userId || userId === "null") {
        throw new Error("Invalid user ID");
      }
      // Check if bank details are already in state
      const state = getState();
      const cachedDetails = state.banks.bankDetailsByUser[userId];
      if (cachedDetails) {
        return cachedDetails;
      }
      const response = await axiosInstance.get(
        `/payment/bank-details?userId=${userId}`
      );
      return response.data.bankDetails || null;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteBankDetails = createAsyncThunk(
  "payment/deleteBankDetails",
  async (id, { rejectWithValue }) => {
    try {
      if (!id || id === "null") {
        throw new Error("Invalid payment ID for deletion");
      }
      const response = await axiosInstance.delete(
        `/payment/bank-details/${id}`
      );
      return { id, message: response.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const bankSlice = createSlice({
  name: "bank",
  initialState: {
    bankDetailsByUser: {}, // Store bank details by userId
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    clearBankDetails: (state, action) => {
      const userId = action.payload;
      delete state.bankDetailsByUser[userId];
    },
    clearExpiredCache: (state) => {
      const now = Date.now();
      Object.keys(state.bankDetailsByUser).forEach((userId) => {
        if (state.bankDetailsByUser[userId]?.timestamp < now - 3600000) {
          // 1 hour
          delete state.bankDetailsByUser[userId];
        }
      });
    },
  },
  extraReducers: (builder) => {
    // Create Bank Details
    builder
      .addCase(createBankDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createBankDetails.fulfilled, (state, action) => {
        state.loading = false;
        const userId = action.payload.contactData?.contact; // Use contact as userId proxy or adjust based on your data
        state.bankDetailsByUser[userId] = action.payload;
        state.successMessage = "Bank details created successfully";
      })
      .addCase(createBankDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Bank Details
    builder
      .addCase(updateBankDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateBankDetails.fulfilled, (state, action) => {
        state.loading = false;
        const userId = action.payload.contactData?.contact; // Adjust as needed
        state.bankDetailsByUser[userId] = action.payload;
        state.successMessage = "Bank details updated successfully";
      })
      .addCase(updateBankDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // viewBankDetails
    builder
      .addCase(viewBankDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(viewBankDetails.fulfilled, (state, action) => {
        state.loading = false;
        const userId = action.meta.arg; // Get userId from thunk arg
        state.bankDetailsByUser[userId] = action.payload;
        state.successMessage = "Bank details fetched successfully";
      })
      .addCase(viewBankDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Bank Details
    builder
      .addCase(deleteBankDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteBankDetails.fulfilled, (state, action) => {
        state.loading = false;
        const userId = Object.keys(state.bankDetailsByUser).find(
          (key) => state.bankDetailsByUser[key]?.paymentId === action.payload.id
        );
        if (userId) {
          delete state.bankDetailsByUser[userId];
        }
        state.successMessage = action.payload.message;
      })
      .addCase(deleteBankDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMessages, clearBankDetails } = bankSlice.actions;
export default bankSlice.reducer;