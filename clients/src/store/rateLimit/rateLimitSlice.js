import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLimited: false,
  retryAfter: 0,
  resetAt: null,
};

const rateLimitSlice = createSlice({
  name: "rateLimit",
  initialState,
  reducers: {
    rateLimitTriggered: (state, action) => {
      state.isLimited = true;
      state.retryAfter = action.payload.retryAfter;
      state.resetAt = action.payload.resetAt;
    },

    tick: (state) => {
      if (state.retryAfter > 0) {
        state.retryAfter -= 1;
      }

      if (state.retryAfter <= 0) {
        state.isLimited = false;
        state.resetAt = null;
      }
    },

    clearRateLimit: (state) => {
      state.isLimited = false;
      state.retryAfter = 0;
      state.resetAt = null;
    },
  },
});

export const { rateLimitTriggered, tick, clearRateLimit } =
  rateLimitSlice.actions;

export default rateLimitSlice.reducer;
