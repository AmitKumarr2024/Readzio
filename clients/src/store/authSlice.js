import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// --------------------
// Load old data from localStorage at startup
// --------------------
const rawUser = localStorage.getItem("user");
let user = null;
try {
  user = rawUser && rawUser !== "undefined" ? JSON.parse(rawUser) : null;
} catch {
  user = null;
}
const token = localStorage.getItem("token");

// --------------------
// Initial State (uses old data)
// --------------------
const initialState = {
  token: token || null,
  user: user || null,
  isAuthenticated: !!token,
  loading: false,
  error: null,
};

// --------------------
// Thunks (Async actions)
// --------------------

// Signup
export const signup = createAsyncThunk(
  "auth/signup",
  async (userData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/signup", userData);
      return res.data; // { token, user }
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: "Signup failed" });
    }
  }
);

// Login
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/login", credentials);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: "Login failed" });
    }
  }
);

// Google Login
export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async (token, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/google-login", { token });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: "Google login failed" });
    }
  }
);

// Check Auth (e.g., on app refresh)
export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) throw new Error("No token found");
      const res = await axiosInstance.get("/auth/check", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data; // only user data (token already exists)
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: "Auth check failed" });
    }
  }
);

// Logout
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await axiosInstance.post("/auth/logout", null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: "Logout failed" });
    }
  }
);

// --------------------
// Slice
// --------------------
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action) {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    clearAuth(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (builder) => {
    builder
      // -------------------- SIGNUP
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Signup failed";
      })

      // -------------------- LOGIN
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
      })

      // -------------------- GOOGLE LOGIN
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Google login failed";
      })

      // -------------------- CHECK AUTH
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        localStorage.setItem("user", JSON.stringify(action.payload));
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Auth check failed";
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      })

      // -------------------- LOGOUT
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Logout failed";
      });
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
