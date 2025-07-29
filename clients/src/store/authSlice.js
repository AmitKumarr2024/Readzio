import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";
import { getToken } from "../Utils/getToken";

const initialState = {
  user: null,
  role: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
  isAccountVerified: false,
  otpStatus: null,
  sessionExpired: false,
  isCheckingAuth: false,
  authInitialized: false,
};

export const signup = createAsyncThunk(
  "auth/signup",
  async ({ fullName, email, password, sendEmail }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:signup] Sending request", { email, sendEmail });
      const res = await axiosInstance.post(
        "/auth/signup",
        {
          fullName,
          email,
          password,
          sendEmail,
        },
        { withCredentials: true }
      );
      // console.log("[AuthSlice:signup] Success", { userId: res.data._id });
      return res.data;
    } catch (err) {
      console.error("[AuthSlice:signup] Error:", err.response?.data?.message);
      return rejectWithValue(
        err.response?.data || { message: "Signup failed" }
      );
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:login] Sending request", {
      //   email: credentials.email,
      // });
      const res = await axiosInstance.post("/auth/login", credentials, {
        withCredentials: true,
      });
      // console.log("[AuthSlice:login] Success", { userId: res.data._id });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:login] Error:",
        err.response?.data?.message || err.message
      );
      return rejectWithValue(
        err.response?.data || {
          message:
            "Login failed. Please check your credentials or try again later.",
        }
      );
    }
  }
);

export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async ({ token, sendEmail }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:googleLogin] Sending request", { sendEmail });
      const res = await axiosInstance.post(
        "/auth/google-login",
        { token, sendEmail },
        {
          withCredentials: true,
        }
      );
      // console.log("[AuthSlice:googleLogin] Success", {
      //   userId: res.data.user._id,
      // });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:googleLogin] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Google login failed" }
      );
    }
  }
);

export const sendVerifyOtp = createAsyncThunk(
  "auth/sendVerifyOtp",
  async ({ userId }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:sendVerifyOtp] Sending request", { userId });
      const res = await axiosInstance.post(
        "/auth/send-verify-otp",
        { userId },
        {
          withCredentials: true,
        }
      );
      // console.log("[AuthSlice:sendVerifyOtp] Success", { userId });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:sendVerifyOtp] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Failed to send verification OTP" }
      );
    }
  }
);

export const verifyEmail = createAsyncThunk(
  "auth/verifyEmail",
  async ({ userId, otp }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:verifyEmail] Sending request", { userId });
      const res = await axiosInstance.post(
        "/auth/verify-email",
        { userId, otp },
        {
          withCredentials: true,
        }
      );
      // console.log("[AuthSlice:verifyEmail] Success", { userId });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:verifyEmail] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Failed to verify email" }
      );
    }
  }
);

export const sendResetOtp = createAsyncThunk(
  "auth/sendResetOtp",
  async ({ email }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:sendResetOtp] Sending request", { email });
      const res = await axiosInstance.post(
        "/auth/send-reset-otp",
        { email },
        {
          withCredentials: true,
        }
      );
      // console.log("[AuthSlice:sendResetOtp] Success", { email });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:sendResetOtp] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Failed to send password reset OTP" }
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:resetPassword] Sending request", { email });
      const res = await axiosInstance.post(
        "/auth/reset-password",
        { email, otp, newPassword },
        {
          withCredentials: true,
        }
      );
      // console.log("[AuthSlice:resetPassword] Success", { email });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:resetPassword] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Failed to reset password" }
      );
    }
  }
);

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, thunkAPI) => {
    try {
      const token = getToken();
      const res = await axiosInstance.get("/auth/check", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue({
        message: err?.response?.data?.message || err.message,
      });
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:logout] Sending request");
      const res = await axiosInstance.post(
        "/auth/logout",
        {},
        { withCredentials: true }
      );
      // console.log("[AuthSlice:logout] Success");
      return res.data;
    } catch (err) {
      console.error("[AuthSlice:logout] Error:", err.response?.data?.message);
      return rejectWithValue(
        err.response?.data || { message: "Logout failed" }
      );
    }
  }
);

export const verifyResetOtp = createAsyncThunk(
  "auth/verifyResetOtp",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      // console.log("[AuthSlice:verifyResetOtp] Sending request", { email });
      const res = await axiosInstance.post(
        "/auth/verify-reset-otp",
        { email, otp },
        {
          withCredentials: true,
        }
      );
      // console.log("[AuthSlice:verifyResetOtp] Success", { email });
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:verifyResetOtp] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Failed to verify OTP" }
      );
    }
  }
);

export const loginTestUser = createAsyncThunk(
  "auth/loginTestUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        "/auth/login-test",
        {},
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      console.error(
        "[AuthSlice:loginTestUser] Error:",
        err.response?.data?.message
      );
      return rejectWithValue(
        err.response?.data || { message: "Test login failed" }
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth(state) {
      // console.log("[AuthSlice:clearAuth]");
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.token = null;
      state.otpStatus = null;
      state.sessionExpired = false;
      state.isCheckingAuth = false;
      localStorage.removeItem("jwt");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        // console.log("[AuthSlice:signup] Pending");
        state.loading = true;
        state.error = null;
        state.isCheckingAuth = true;
      })
      .addCase(signup.fulfilled, (state, action) => {
        // console.log("[AuthSlice:signup] Fulfilled", {
        //   userId: action.payload._id,
        // });
        const { _id, fullName, email, role, token, isAccountVerified } =
          action.payload;
        localStorage.setItem("jwt", token);
        state.user = { _id, name: fullName, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.isAccountVerified = isAccountVerified || false;
        state.token = token;
        state.loading = false;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(signup.rejected, (state, action) => {
        console.error("[AuthSlice:signup] Rejected:", action.payload?.message);
        state.loading = false;
        state.error = action.payload?.message || "Signup failed";
        state.isCheckingAuth = false;
      })
      .addCase(login.pending, (state) => {
        // console.log("[AuthSlice:login] Pending");
        state.loading = true;
        state.error = null;
        state.isCheckingAuth = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        // console.log("[AuthSlice:login] Fulfilled", {
        //   userId: action.payload._id,
        // });
        const { _id, fullName, email, role, token, isAccountVerified } =
          action.payload;
        localStorage.setItem("jwt", token);
        state.user = { _id, name: fullName, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.isAccountVerified = isAccountVerified || false;
        state.token = token;
        state.loading = false;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(login.rejected, (state, action) => {
        console.error("[AuthSlice:login] Rejected:", action.payload?.message);
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
        state.isAuthenticated = false;
        state.user = null;
        state.role = null;
        state.token = null;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(googleLogin.pending, (state) => {
        // console.log("[AuthSlice:googleLogin] Pending");
        state.loading = true;
        state.error = null;
        state.isCheckingAuth = true;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        // console.log("[AuthSlice:googleLogin] Fulfilled", {
        //   userId: action.payload.user._id,
        // });
        const { user, token, isAccountVerified } = action.payload;
        localStorage.setItem("jwt", token);
        state.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
        state.role = user.role;
        state.isAuthenticated = true;
        state.isAccountVerified = isAccountVerified || false;
        state.token = token;
        state.loading = false;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        console.error(
          "[AuthSlice:googleLogin] Rejected:",
          action.payload?.message
        );
        state.loading = false;
        state.error = action.payload?.message || "Google login failed";
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(sendVerifyOtp.pending, (state) => {
        // console.log("[AuthSlice:sendVerifyOtp] Pending");
        state.loading = true;
        state.error = null;
        state.otpStatus = null;
      })
      .addCase(sendVerifyOtp.fulfilled, (state, action) => {
        // console.log("[AuthSlice:sendVerifyOtp] Fulfilled");
        state.loading = false;
        state.otpStatus = action.payload.message;
      })
      .addCase(sendVerifyOtp.rejected, (state, action) => {
        console.error(
          "[AuthSlice:sendVerifyOtp] Rejected:",
          action.payload?.message
        );
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to send verification OTP";
        state.otpStatus = null;
      })
      .addCase(verifyEmail.pending, (state) => {
        // console.log("[AuthSlice:verifyEmail] Pending");
        state.loading = true;
        state.error = null;
        state.otpStatus = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        // console.log("[AuthSlice:verifyEmail] Fulfilled");
        state.loading = false;
        state.otpStatus = action.payload.message;
        state.isAccountVerified = true;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        console.error(
          "[AuthSlice:verifyEmail] Rejected:",
          action.payload?.message
        );
        state.loading = false;
        state.error = action.payload?.message || "Failed to verify email";
        state.otpStatus = null;
      })
      .addCase(sendResetOtp.pending, (state) => {
        // console.log("[AuthSlice:sendResetOtp] Pending");
        state.loading = true;
        state.error = null;
        state.otpStatus = null;
      })
      .addCase(sendResetOtp.fulfilled, (state, action) => {
        // console.log("[AuthSlice:sendResetOtp] Fulfilled");
        state.loading = false;
        state.otpStatus = action.payload.message;
      })
      .addCase(sendResetOtp.rejected, (state, action) => {
        console.error(
          "[AuthSlice:sendResetOtp] Rejected:",
          action.payload?.message
        );
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to send password reset OTP";
        state.otpStatus = null;
      })
      .addCase(resetPassword.pending, (state) => {
        // console.log("[AuthSlice:resetPassword] Pending");
        state.loading = true;
        state.error = null;
        state.otpStatus = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        // console.log("[AuthSlice:resetPassword] Fulfilled");
        state.loading = false;
        state.otpStatus = action.payload.message;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        console.error(
          "[AuthSlice:resetPassword] Rejected:",
          action.payload?.message
        );
        state.loading = false;
        state.error = action.payload?.message || "Failed to reset password";
        state.otpStatus = null;
      })
      .addCase(checkAuth.pending, (state) => {
        // console.log("[AuthSlice:checkAuth] Pending");
        state.loading = true;
        state.error = null;
        state.isCheckingAuth = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        // console.log("[AuthSlice:checkAuth] Fulfilled", {
        //   userId: action.payload._id,
        // });
        const { _id, name, email, role, token, isAccountVerified } =
          action.payload;
        localStorage.setItem("jwt", token);
        state.user = { _id, name, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.token = token;
        state.isAccountVerified = isAccountVerified || false;
        state.loading = false;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
        state.authInitialized = true;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        // console.log("[AuthSlice:checkAuth] Rejected:", action.payload?.message);
        state.loading = false;
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.token = null;
        state.error = action.payload?.message || "Auth check failed";
        state.sessionExpired = action.payload?.isGuest ? false : true;
        state.isCheckingAuth = false;
        state.authInitialized = true;
      })
      .addCase(logout.pending, (state) => {
        // console.log("[AuthSlice:logout] Pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        // console.log("[AuthSlice:logout] Fulfilled");
        localStorage.removeItem("jwt");
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
        state.otpStatus = null;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(logout.rejected, (state, action) => {
        console.error("[AuthSlice:logout] Rejected:", action.payload?.message);
        localStorage.removeItem("jwt");
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
        state.error = action.payload?.message || "Logout failed";
        state.otpStatus = null;
        state.sessionExpired = false;
        state.isCheckingAuth = false;
      })
      .addCase(verifyResetOtp.pending, (state) => {
        // console.log("[AuthSlice:verifyResetOtp] Pending");
        state.loading = true;
        state.error = null;
        state.otpStatus = null;
      })
      .addCase(verifyResetOtp.fulfilled, (state, action) => {
        // console.log("[AuthSlice:verifyResetOtp] Fulfilled");
        state.loading = false;
        state.otpStatus = action.payload.message;
      })
      .addCase(verifyResetOtp.rejected, (state, action) => {
        // console.error(
        //   "[AuthSlice:verifyResetOtp] Rejected:",
        //   action.payload?.message
        // );
        state.loading = false;
        state.error = action.payload?.message || "Failed to verify OTP";
        state.otpStatus = null;
      })
      .addCase(loginTestUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isCheckingAuth = true;
      })
      .addCase(loginTestUser.fulfilled, (state, action) => {
        const { _id, name, email, role, token, isAccountVerified } =
          action.payload;
        localStorage.setItem("jwt", token);
        state.user = { _id, name, email, role };
        state.role = role;
        state.isAuthenticated = true;
        state.token = token;
        state.isAccountVerified = isAccountVerified || false;
        state.loading = false;
        state.isCheckingAuth = false;
        state.sessionExpired = false;
      })
      .addCase(loginTestUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Test login failed";
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.role = null;
        state.isCheckingAuth = false;
        state.sessionExpired = false;
      });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
