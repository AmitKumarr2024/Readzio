import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

export const getUser = createAsyncThunk("user/getUser", async (_, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.get("/user/get-user");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});

export const getAllUsers = createAsyncThunk("user/getAllUsers", async ({ page = 1, limit = 10, search = '', sortField = 'name', sortOrder = 'asc' }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get("/user/get-all-user", {
      params: { page, limit, search, sortField, sortOrder },
    });
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
  }
});

export const updateUser = createAsyncThunk("user/updateUser", async (formData, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.patch("/user/update-user", formData);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update user");
  }
});

export const deleteUser = createAsyncThunk("user/deleteUser", async (userId, { rejectWithValue }) => {
  try {
    await axiosInstance.delete("/user/delete-user", { data: { userId } });
    return userId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete user");
  }
});

export const toggleBlockUser = createAsyncThunk("user/toggleBlockUser", async (userId, { rejectWithValue, getState }) => {
  try {
    const response = await axiosInstance.patch(`/user/toggle-block/${userId}`);
    const updatedUser = response.data.data || response.data;
    console.log('[toggleBlockUser] Backend response:', updatedUser);
    // Ensure blocked field is present; fallback to toggling locally
    if (updatedUser.blocked === undefined) {
      const currentUser = getState().user.users.find((u) => u._id === userId);
      console.log('[toggleBlockUser] Manually toggling blocked for user:', userId, 'from', currentUser?.blocked, 'to', !currentUser?.blocked);
      return { _id: userId, blocked: !currentUser?.blocked };
    }
    return updatedUser;
  } catch (err) {
    console.error('[toggleBlockUser] Error:', err.response?.data || err.message);
    return rejectWithValue(err.response?.data?.message || "Failed to toggle block status");
  }
});

export const toggleUserRole = createAsyncThunk("user/toggleUserRole", async (userId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.patch(`/user/toggle-role/${userId}`);
    return response.data.data || response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to toggle user role");
  }
});

export const getUserById = createAsyncThunk("user/getUserById", async (userId, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.get(`/user/get-single-user/${userId}`);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user by ID");
  }
});

export const fetchUserActivity = createAsyncThunk("user/fetchUserActivity", async (userId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get(`/user/activity/${userId}`);
    return response.data.activity || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch activity");
  }
});

export const clearUserActivity = createAsyncThunk("user/clearUserActivity", async (_, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.delete("/user/activity/clear");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to clear activity");
  }
});

export const clearOldActivity = createAsyncThunk("user/clearOldActivity", async (_, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.delete("/user/activity/clear-old");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to clear old activity");
  }
});

const initialState = {
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
    clearUserError: (state) => {
      state.error = null;
      state.updateError = null;
      state.activityError = null;
    },
    clearUser: (state) => {
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
    clearSelectedUser: (state) => {
      state.selectedUser = null;
      state.selectedUserLoading = false;
      state.selectedUserError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users || [];
        console.log('[getAllUsers] Users updated:', state.users);
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateUser.pending, (state) => {
        state.updateLoading = true;
        state.updateSuccess = false;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.updateSuccess = true;
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, ...action.payload } : u
        );
        if (state.user?._id === action.payload._id) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateSuccess = false;
        state.updateError = action.payload;
      })
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter((u) => u._id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleBlockUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleBlockUser.fulfilled, (state, action) => {
        state.loading = false;
        console.log('[toggleBlockUser] Applying payload:', action.payload);
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, blocked: action.payload.blocked } : u
        );
        if (state.user?._id === action.payload._id) {
          state.user = { ...state.user, blocked: action.payload.blocked };
        }
      })
      .addCase(toggleBlockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to toggle block status";
        console.log('[toggleBlockUser] Rejected:', action.payload);
      })
      .addCase(toggleUserRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleUserRole.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.map((u) =>
          u._id === action.payload._id ? { ...u, role: action.payload.role } : u
        );
        if (state.user?._id === action.payload._id) {
          state.user = { ...state.user, role: action.payload.role };
        }
      })
      .addCase(toggleUserRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserById.pending, (state) => {
        state.selectedUserLoading = true;
        state.selectedUserError = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.selectedUserLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.selectedUserLoading = false;
        state.selectedUserError = action.payload;
      })
      .addCase(fetchUserActivity.pending, (state) => {
        state.activityLoading = true;
        state.activityError = null;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        state.activityLoading = false;
        state.activityError = action.payload;
      })
      .addCase(clearUserActivity.fulfilled, (state) => {
        state.activity = [];
        state.activityLoading = false;
      })
      .addCase(clearOldActivity.fulfilled, (state) => {
        state.activity = state.activity.filter(
          (item) => new Date(item.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        state.activityLoading = false;
      });
  },
});

export const { clearUserError, clearUser, clearSelectedUser } = userSlice.actions;
export default userSlice.reducer;