import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const initialState = {
  user: null,
  role: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
};

export const signup = createAsyncThunk(
  "auth/signup",
  async (userData, { rejectWithValue }) => {
    try {
      console.log("[AuthSlice:signup] Sending request", { email: userData.email });
      const res = await axiosInstance.post("/auth/signup", userData);
      console.log("[AuthSlice:signup] Success", { userId: res.data._id });
      return res.data;
    } catch (err) {
      console.error("[AuthSlice:signup] Error:", err.response?.data?.message);
      return rejectWithValue(err.response?.data || { message: "Signup failed" });
    }
  }
);


export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('[AuthSlice:login] Sending request', { email: credentials.email });
      const res = await axiosInstance.post('/auth/login', credentials, {
        withCredentials: true,
      });
      console.log('[AuthSlice:login] Success', { userId: res.data._id });
      return res.data;
    } catch (err) {
      console.error('[AuthSlice:login] Error:', err.response?.data?.message);
      return rejectWithValue(err.response?.data || { message: 'Login failed' });
    }
  }
);


export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async (token, { rejectWithValue }) => {
    try {
      console.log("[AuthSlice:googleLogin] Sending request");
      const res = await axiosInstance.post("/auth/google-login", { token }, {
        withCredentials: true,
      });
      console.log("[AuthSlice:googleLogin] Success", { userId: res.data.user._id });
      return res.data;
    } catch (err) {
      console.error("[AuthSlice:googleLogin] Error:", err.response?.data?.message);
      return rejectWithValue(err.response?.data || { message: "Google login failed" });
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[AuthSlice:checkAuth] Sending request');
      const res = await axiosInstance.get('/auth/check', {
        withCredentials: true,
      });
      console.log('[AuthSlice:checkAuth] Success', { userId: res.data._id, token: res.data.token ? 'present' : 'missing' });
      return res.data;
    } catch (err) {
      console.error('[AuthSlice:checkAuth] Error:', err.response?.data?.message);
      return rejectWithValue(err.response?.data || { message: 'Auth check failed' });
    }
  }
);


export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[AuthSlice:logout] Sending request');
      const res = await axiosInstance.post('/auth/logout', {}, {
        withCredentials: true,
      });
      console.log('[AuthSlice:logout] Success');
      return res.data;
    } catch (err) {
      console.error('[AuthSlice:logout] Error:', err.response?.data?.message);
      return rejectWithValue(err.response?.data || { message: 'Logout failed' });
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth(state) {
      console.log("[AuthSlice:clearAuth]");
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.token = null;
      localStorage.removeItem("jwt");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        console.log("[AuthSlice:signup] Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        console.log("[AuthSlice:signup] Fulfilled", { userId: action.payload._id });
        const { _id, fullName, email, role, token } = action.payload;
        if (token) localStorage.setItem("jwt", token);
        state.user = { _id, name: fullName, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.token = token;
        state.loading = false;
      })
      .addCase(signup.rejected, (state, action) => {
        console.error("[AuthSlice:signup] Rejected:", action.payload?.message);
        state.loading = false;
        state.error = action.payload?.message || "Signup failed";
      })
       .addCase(login.pending, (state) => {
        console.log('[AuthSlice:login] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        console.log('[AuthSlice:login] Fulfilled', { userId: action.payload._id });
        const { _id, fullName, email, role, token } = action.payload;
        if (token) localStorage.setItem('jwt', token);
        state.user = { _id, name: fullName, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.token = token;
        state.loading = false;
      })
      .addCase(login.rejected, (state, action) => {
        console.error('[AuthSlice:login] Rejected:', action.payload?.message);
        state.loading = false;
        state.error = action.payload?.message || 'Login failed';
      })
      .addCase(googleLogin.pending, (state) => {
        console.log("[AuthSlice:googleLogin] Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        console.log("[AuthSlice:googleLogin] Fulfilled", { userId: action.payload.user._id });
        const { user, token } = action.payload;
        if (token) localStorage.setItem("jwt", token);
        state.user = { _id: user._id, name: user.name, email: user.email, role: user.role };
        state.role = user.role;
        state.isAuthenticated = true;
        state.token = token;
        state.loading = false;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        console.error("[AuthSlice:googleLogin] Rejected:", action.payload?.message);
        state.loading = false;
        state.error = action.payload?.message || "Google login failed";
      })
      .addCase(checkAuth.pending, (state) => {
        console.log('[AuthSlice:checkAuth] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        console.log('[AuthSlice:checkAuth] Fulfilled', { userId: action.payload._id });
        const { _id, name, email, role, token } = action.payload;
        if (token) localStorage.setItem('jwt', token);
        state.user = { _id, name, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.token = token;
        state.loading = false;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        console.error('[AuthSlice:checkAuth] Rejected:', action.payload?.message);
        state.loading = false;
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.token = null;
        state.error = action.payload?.message || 'Auth check failed';
        localStorage.removeItem('jwt');
      })
       .addCase(logout.pending, (state) => {
        console.log('[AuthSlice:logout] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        console.log('[AuthSlice:logout] Fulfilled');
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
        localStorage.removeItem('jwt');
      })
      .addCase(logout.rejected, (state, action) => {
        console.error('[AuthSlice:logout] Rejected:', action.payload?.message);
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
        state.error = action.payload?.message || 'Logout failed';
        localStorage.removeItem('jwt');
      });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;