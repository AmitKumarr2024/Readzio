// store/blockSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Block user
export const blockUser = createAsyncThunk(
  "block/blockUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/block/block-user/${userId}`);
      return response.data.message;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Block failed");
    }
  }
);

// Unblock user
export const unblockUser = createAsyncThunk(
  "block/unblockUser",
  async (blockedUserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/block/unblock`, { blockedUserId });
      return response.data.message;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Unblock failed");
    }
  }
);

const blockSlice = createSlice({
  name: "block",
  initialState: {
    loading: false,
    successMessage: "",
    error: "",
  },
  reducers: {
    clearBlockStatus: (state) => {
      state.successMessage = "";
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(blockUser.pending, (state) => {
        state.loading = true;
        state.successMessage = "";
        state.error = "";
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(unblockUser.pending, (state) => {
        state.loading = true;
        state.successMessage = "";
        state.error = "";
      })
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(unblockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBlockStatus } = blockSlice.actions;
export default blockSlice.reducer;
