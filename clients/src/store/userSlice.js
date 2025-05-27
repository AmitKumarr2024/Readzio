import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// Get token from localStorage (if exists)
const token = localStorage.getItem("token");

// Async thunk: fetch current logged-in user
export const getUser = createAsyncThunk(
  "user/getUser",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      if (!token) throw new Error("No token found");

      const res = await axiosInstance.get("user/get-user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to fetch user"
      );
    }
  }
);

// Async thunk: fetch all users (admin functionality)
export const getAllUsers = createAsyncThunk(
  "user/getAllUsers",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      if (!token) throw new Error("No token found");

      const res = await axiosInstance.get("/user/get-all-user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to fetch users"
      );
    }
  }
);

// Async thunk: update user profile
export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (userData, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      if (!token) throw new Error("No token found");

      const res = await axiosInstance.patch("/user/update-user", userData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Flatten social object
      const updatedUser = {
        ...res.data.data,
        ...res.data.social,
      };

      return updatedUser;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to update user"
      );
    }
  }
);


// Async thunk: delete a user (admin functionality)
export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const { token } = state.user;
      if (!token) throw new Error("No token found");

      const res = await axiosInstance.delete("/user/delete-user", {
        headers: { Authorization: `Bearer ${token}` },
        data: { userId },
      });

      return userId;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to delete user"
      );
    }
  }
);

const initialState = {
  token: token || null,
  user: null,
  users: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
    },
    clearToken: (state) => {
      state.token = null;
      localStorage.removeItem("token");
    },
    clearUserError: (state) => {
      state.error = null;
    },
     clearUser(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    logoutUser: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder
      // getUser
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

      // getAllUsers
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        // Merge updated user data
        state.user = {
          ...state.user,
          ...action.payload,
        };
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        // Remove deleted user from users list
        state.users = state.users.filter((user) => user._id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setToken, clearToken, clearUserError, logoutUser ,clearUser} = userSlice.actions;
export default userSlice.reducer;
