import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Async Thunks
export const fetchUserAchievements = createAsyncThunk(
  "achievements/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("📩 Fetching user achievements");
      const response = await axiosInstance.get("/achievement/achievements");
      // console.log("✅ Fetch achievements response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching achievements:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const calculateUserAchievements = createAsyncThunk(
  "achievements/calculate",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("📩 Calculating user achievements");
      const response = await axiosInstance.post("/achievement/achievements/calculate");
      // console.log("✅ Calculate achievements response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error calculating achievements:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Slice
const achievementSlice = createSlice({
  name: "achievements",
  initialState: {
    badges: [],
    metrics: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Achievements
    builder
      .addCase(fetchUserAchievements.pending, (state) => {
        state.loading = true;
        state.error = null;
        // console.log("⏳ Fetch achievements pending");
      })
      .addCase(fetchUserAchievements.fulfilled, (state, action) => {
        state.loading = false;
        state.badges = action.payload.badges || [];
        // console.log("✅ Fetch achievements fulfilled:", action.payload);
      })
      .addCase(fetchUserAchievements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // console.log("❌ Fetch achievements rejected:", action.payload);
      });

    // Calculate Achievements
    builder
      .addCase(calculateUserAchievements.pending, (state) => {
        state.loading = true;
        state.error = null;
        // console.log("⏳ Calculate achievements pending");
      })
      .addCase(calculateUserAchievements.fulfilled, (state, action) => {
        state.loading = false;
        state.badges = action.payload.badges || [];
        state.metrics = action.payload.metrics || null;
        // console.log("✅ Calculate achievements fulfilled:", action.payload);
      })
      .addCase(calculateUserAchievements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // console.log("❌ Calculate achievements rejected:", action.payload);
      });
  },
});

export const { clearError } = achievementSlice.actions;
export default achievementSlice.reducer;