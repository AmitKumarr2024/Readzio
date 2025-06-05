import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const token = localStorage.getItem("token");

// --- Existing User Thunks ---

export const getUser = createAsyncThunk(
  "user/getUser",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      console.log("getUser: Fetching user with token:", token); // Debug log
      if (!token) {
        console.log("getUser: No token found, returning null"); // Debug log
        return null;
      }

      const res = await axiosInstance.get("user/get-user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("getUser: Successfully fetched user:", res.data); // Debug log
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch user";
      console.error("getUser: Error fetching user:", errorMsg); // Debug log
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);

export const getAllUsers = createAsyncThunk(
  "user/getAllUsers",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      console.log("getAllUsers: Fetching all users with token:", token); // Debug log
      if (!token) throw new Error("No token found");

      const res = await axiosInstance.get("/user/get-all-user", );

      console.log("getAllUsers: Fetched users:", res.data); // Existing debug log
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch users";
      console.error("getAllUsers: Error fetching users:", errorMsg); // Debug log
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (formData, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      console.log("updateUser: Updating user with formData:", formData); // Debug log
      if (!token) throw new Error("No token found");

      const res = await axiosInstance.patch("/user/update-user", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("updateUser: Successfully updated user:", res.data.data); // Debug log
      return res.data.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update user";
      console.error("updateUser: Error updating user:", errorMsg); // Debug log
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      console.log("deleteUser: Deleting user with ID:", userId); // Debug log
      if (!token) throw new Error("No token found");

      await axiosInstance.delete("/user/delete-user", {
        headers: { Authorization: `Bearer ${token}` },
        data: { userId },
      });
      console.log("deleteUser: Successfully deleted user:", userId); // Debug log
      return userId;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to delete user";
      console.error("deleteUser: Error deleting user:", errorMsg); // Debug log
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);

export const getUserById = createAsyncThunk(
  "user/getUserById",
  async (userId, thunkAPI) => {
    try {
      console.log("getUserById: Fetching user with ID:", userId); // Debug log
      const res = await axiosInstance.get(`/user/get-single-user/${userId}`);
      console.log("getUserById: Successfully fetched user:", res.data.data); // Debug log
      return res.data.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch user by ID";
      console.error("getUserById: Error fetching user:", errorMsg); // Debug log
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);

export const fetchUserActivity = createAsyncThunk(
  "user/fetchUserActivity",
  async (userId, { rejectWithValue }) => {
    try {
      console.log("fetchUserActivity: Fetching activity for user ID:", userId); // Debug log
      const response = await axiosInstance.get(`/user/activity/${userId}`);
      console.log("fetchUserActivity: Successfully fetched activity:", response.data.activity); // Debug log
      return response.data.activity || [];
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch activity";
      console.error("fetchUserActivity: Error fetching activity:", errorMsg); // Debug log
      return rejectWithValue(errorMsg);
    }
  }
);

// --- Initial State ---

const initialState = {
  token: token || null,
  user: null,
  users: [],
  loading: false,
  error: null,
  updateLoading: false,
  updateSuccess: false,
  updateError: null,
  selectedUser: null,
  selectedUserLoading: false,
  selectedUserError: null,
  activity: [],
  activityLoading: false,
  activityError: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setToken: (state, action) => {
      console.log("setToken: Setting token:", action.payload); // Debug log
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
    },
    clearToken: (state) => {
      console.log("clearToken: Clearing token"); // Debug log
      state.token = null;
      localStorage.removeItem("token");
    },
    clearUserError: (state) => {
      console.log("clearUserError: Clearing errors"); // Debug log
      state.error = null;
      state.updateError = null;
      state.activityError = null;
    },
    clearUser: (state) => {
      console.log("clearUser: Clearing user state"); // Debug log
      state.user = null;
      state.loading = false;
      state.error = null;
      state.updateLoading = false;
      state.updateSuccess = false;
      state.updateError = null;
      state.activity = [];
      state.activityLoading = false;
      state.activityError = null;
    },
    logoutUser: (state) => {
      console.log("logoutUser: Logging out user"); // Debug log
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
    },
    clearSelectedUser: (state) => {
      console.log("clearSelectedUser: Clearing selected user"); // Debug log
      state.selectedUser = null;
      state.selectedUserLoading = false;
      state.selectedUserError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getUser
      .addCase(getUser.pending, (state) => {
        console.log("getUser.pending: Starting user fetch"); // Debug log
        state.loading = true;
        state.error = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        console.log("getUser.fulfilled: User fetched, payload:", action.payload); // Debug log
        state.loading = false;
        if (action.payload) state.user = action.payload;
      })
      .addCase(getUser.rejected, (state, action) => {
        console.log("getUser.rejected: Error:", action.payload); // Debug log
        state.loading = false;
        if (action.payload !== "No token") state.error = action.payload;
      })

      // getAllUsers
      .addCase(getAllUsers.pending, (state) => {
        console.log("getAllUsers.pending: Starting fetch all users"); // Debug log
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        console.log("getAllUsers.fulfilled: Users fetched, count:", action.payload.length); // Debug log
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        console.log("getAllUsers.rejected: Error:", action.payload); // Debug log
        state.loading = false;
        state.error = action.payload;
      })

      // updateUser
      .addCase(updateUser.pending, (state) => {
        console.log("updateUser.pending: Starting user update"); // Debug log
        state.updateLoading = true;
        state.updateSuccess = false;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        console.log("updateUser.fulfilled: User updated, payload:", action.payload); // Debug log
        state.updateLoading = false;
        state.updateSuccess = true;
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(updateUser.rejected, (state, action) => {
        console.log("updateUser.rejected: Error:", action.payload); // Debug log
        state.updateLoading = false;
        state.updateSuccess = false;
        state.updateError = action.payload;
      })

      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        console.log("deleteUser.pending: Starting user deletion"); // Debug log
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        console.log("deleteUser.fulfilled: User deleted, ID:", action.payload); // Debug log
        console.log("deleteUser.fulfilled: Users before delete:", state.users.length); // Debug log
        state.loading = false;
        state.users = state.users.filter((u) => u && u._id !== action.payload);
        console.log("deleteUser.fulfilled: Users after delete:", state.users.length); // Debug log
      })
      .addCase(deleteUser.rejected, (state, action) => {
        console.log("deleteUser.rejected: Error:", action.payload); // Debug log
        state.loading = false;
        state.error = action.payload;
      })

      // getUserById
      .addCase(getUserById.pending, (state) => {
        console.log("getUserById.pending: Starting fetch user by ID"); // Debug log
        state.selectedUserLoading = true;
        state.selectedUserError = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        console.log("getUserById.fulfilled: User fetched, payload:", action.payload); // Debug log
        state.selectedUserLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserById.rejected, (state, action) => {
        console.log("getUserById.rejected: Error:", action.payload); // Debug log
        state.selectedUserLoading = false;
        state.selectedUserError = action.payload;
      })

      // fetchUserActivity
      .addCase(fetchUserActivity.pending, (state) => {
        console.log("fetchUserActivity.pending: Starting activity fetch"); // Debug log
        state.activityLoading = true;
        state.activityError = null;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        console.log("fetchUserActivity.fulfilled: Activity fetched, count:", action.payload.length); // Debug log
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        console.log("fetchUserActivity.rejected: Error:", action.payload); // Debug log
        state.activityLoading = false;
        state.activityError = action.payload;
      });
  },
});

// Export actions and reducer
export const {
  setToken,
  clearToken,
  clearUserError,
  clearUser,
  logoutUser,
  clearSelectedUser,
} = userSlice.actions;

export default userSlice.reducer;