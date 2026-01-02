import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

/* ======================================================
   FETCH ADS SETTINGS
====================================================== */
export const fetchAdsSettings = createAsyncThunk(
  "ads/fetchAdsSettings",
  async (_, { rejectWithValue }) => {
    console.log("[ADS][THUNK] fetchAdsSettings → START");

    try {
      const res = await axiosInstance.get("/ads");

      console.log("[ADS][THUNK] fetchAdsSettings → SUCCESS", {
        settings: res.data.settings,
      });

      return res.data.settings;
    } catch (err) {
      console.error("[ADS][THUNK] fetchAdsSettings → ERROR", err);

      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ======================================================
   PATCH ADS SETTINGS
====================================================== */
export const patchAdsSettings = createAsyncThunk(
  "ads/patchAdsSettings",
  async (payload, { rejectWithValue }) => {
    console.log("[ADS][THUNK] patchAdsSettings → START", payload);

    try {
      const res = await axiosInstance.patch("/ads", payload);

      console.log("[ADS][THUNK] patchAdsSettings → SUCCESS", {
        updatedSettings: res.data.settings,
      });

      return res.data.settings;
    } catch (err) {
      console.error("[ADS][THUNK] patchAdsSettings → ERROR", err);

      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ======================================================
   SLICE
====================================================== */
const adsSlice = createSlice({
  name: "ads",
  initialState: {
    settings: null,
    loading: false,
    error: null,
    successMessage: null,
  },

  reducers: {
    adsUpdatedRealtime: (state, action) => {
      console.log("[ADS][SOCKET] adsUpdatedRealtime", action.payload);
      state.settings = action.payload;
    },

    clearAdsMessages: (state) => {
      console.log("[ADS][REDUCER] clearAdsMessages");
      state.error = null;
      state.successMessage = null;
    },
  },

  extraReducers: (builder) => {
    builder
      /* ================= FETCH ================= */
      .addCase(fetchAdsSettings.pending, (state) => {
        console.log("[ADS][REDUCER] fetchAdsSettings → PENDING");
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchAdsSettings.fulfilled, (state, action) => {
        console.log(
          "[ADS][REDUCER] fetchAdsSettings → FULFILLED",
          action.payload
        );
        state.loading = false;
        state.settings = action.payload;
      })

      .addCase(fetchAdsSettings.rejected, (state, action) => {
        console.error(
          "[ADS][REDUCER] fetchAdsSettings → REJECTED",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= PATCH ================= */
      .addCase(patchAdsSettings.pending, (state) => {
        console.log("[ADS][REDUCER] patchAdsSettings → PENDING");
        state.loading = true;
        state.error = null;
      })

      .addCase(patchAdsSettings.fulfilled, (state, action) => {
        console.log(
          "[ADS][REDUCER] patchAdsSettings → FULFILLED",
          action.payload
        );
        state.loading = false;
        state.settings = action.payload;
        state.successMessage = "Ads settings updated";
      })

      .addCase(patchAdsSettings.rejected, (state, action) => {
        console.error(
          "[ADS][REDUCER] patchAdsSettings → REJECTED",
          action.payload
        );
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { adsUpdatedRealtime, clearAdsMessages } = adsSlice.actions;
export default adsSlice.reducer;
