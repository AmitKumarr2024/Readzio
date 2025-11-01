// clients/src/store/postlistSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Fetch all postlists for a specific user
 */
export const fetchUserpostlists = createAsyncThunk(
  "postlist/fetchUserpostlists",
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) throw new Error("User ID is required");

      console.log(
        "[fetchUserpostlists] Fetching postlists for userId:",
        userId
      );

      const response = await axiosInstance.get(`/postlists/user/${userId}`, {
        timeout: 30000,
        withCredentials: true,
      });

      console.log("[fetchUserpostlists] Response status:", response.status);
      console.log("[fetchUserpostlists] Response data:", response.data);

      // ✅ Extract the data array from response
      const result = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      console.log(
        "[fetchUserpostlists] Parsed postlists count:",
        result.length
      );
      console.log("[fetchUserpostlists] postlists:", result);

      const privateCount = result.filter((p) => p.isPrivate).length;
      const publicCount = result.filter((p) => !p.isPrivate).length;
      console.log(
        `[fetchUserpostlists] Private: ${privateCount}, Public: ${publicCount}`
      );

      return result;
    } catch (error) {
      console.error("[fetchUserpostlists] Error:", error);
      console.error("[fetchUserpostlists] Error response:", error.response);

      if (error.response?.status === 404) {
        return rejectWithValue("User postlists not found");
      }
      if (error.response?.status === 401) {
        return rejectWithValue("Authentication required");
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch postlists"
      );
    }
  }
);

/**
 * Fetch a single postlist by ID with populated posts
 */
export const fetchpostlistById = createAsyncThunk(
  "postlist/fetchpostlistById",
  async (postlistId, { rejectWithValue }) => {
    try {
      if (!postlistId) {
        throw new Error("postlist ID is required");
      }

      const response = await axiosInstance.get(`/postlists/${postlistId}`, {
        timeout: 30000,
      });

      if (!response.data?.data) {
        throw new Error("No postlist data received");
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return rejectWithValue("postlist not found");
      }
      if (error.response?.status === 403) {
        return rejectWithValue("Access denied to private postlist");
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch postlist"
      );
    }
  }
);

/**
 * Create a new postlist
 */
export const createpostlist = createAsyncThunk(
  "postlist/createpostlist",
  async (postlistData, { rejectWithValue }) => {
    try {
      const { name, description, isPrivate = false } = postlistData;

      if (!name || name.trim().length === 0) {
        throw new Error("postlist name is required");
      }

      if (name.length > 100) {
        throw new Error("postlist name must be less than 100 characters");
      }

      const payload = {
        name: name.trim(),
        description: description?.trim() || "",
        isPrivate,
      };

      console.log("[createpostlist] Creating postlist:", payload);

      const response = await axiosInstance.post("/postlists", payload, {
        timeout: 30000,
        withCredentials: true,
      });

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      console.log("[createpostlist] Created postlist:", response.data.data);

      return response.data.data;
    } catch (error) {
      console.error("[createpostlist] Error:", error);

      if (error.response?.status === 401) {
        return rejectWithValue("Authentication required");
      }
      if (error.response?.status === 400) {
        return rejectWithValue(
          error.response?.data?.message || "Invalid postlist data"
        );
      }
      if (error.response?.status === 409) {
        return rejectWithValue(
          error.response?.data?.message || "postlist name already exists"
        );
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create postlist"
      );
    }
  }
);

/**
 * Add a post to a postlist
 */
export const addTopostlist = createAsyncThunk(
  "postlist/addTopostlist",
  async ({ postlistId, postId }, { rejectWithValue }) => {
    try {
      if (!postlistId || !postId) {
        throw new Error("postlist ID and Post ID are required");
      }

      const response = await axiosInstance.post(
        `/postlists/${postlistId}/add`,
        { postId },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to modify this postlist"
        );
      }
      if (error.response?.status === 404) {
        return rejectWithValue("postlist or post not found");
      }
      if (error.response?.status === 409) {
        return rejectWithValue("Post already exists in this postlist");
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to add post to postlist"
      );
    }
  }
);

/**
 * Remove a post from a postlist
 */
export const removeFrompostlist = createAsyncThunk(
  "postlist/removeFrompostlist",
  async ({ postlistId, postId }, { rejectWithValue }) => {
    try {
      if (!postlistId || !postId) {
        throw new Error("postlist ID and Post ID are required");
      }

      const response = await axiosInstance.post(
        `/postlists/${postlistId}/remove`,
        { postId },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to modify this postlist"
        );
      }
      if (error.response?.status === 404) {
        return rejectWithValue("postlist not found");
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove post from postlist"
      );
    }
  }
);

/**
 * Update postlist details (name, description, privacy)
 */
export const updatepostlist = createAsyncThunk(
  "postlist/updatepostlist",
  async ({ postlistId, updates }, { rejectWithValue }) => {
    try {
      if (!postlistId) {
        throw new Error("postlist ID is required");
      }

      if (updates.name && updates.name.length > 100) {
        throw new Error("postlist name must be less than 100 characters");
      }

      const response = await axiosInstance.patch(
        `/postlists/${postlistId}`,
        updates,
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to update this postlist"
        );
      }
      if (error.response?.status === 404) {
        return rejectWithValue("postlist not found");
      }
      if (error.response?.status === 409) {
        return rejectWithValue(
          error.response?.data?.message || "postlist name already exists"
        );
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to update postlist"
      );
    }
  }
);

/**
 * Delete a postlist
 */
export const deletepostlist = createAsyncThunk(
  "postlist/deletepostlist",
  async (postlistId, { rejectWithValue }) => {
    try {
      if (!postlistId) {
        throw new Error("postlist ID is required");
      }

      const response = await axiosInstance.delete(`/postlists/${postlistId}`, {
        timeout: 30000,
        withCredentials: true,
      });

      return {
        postlistId,
        message: response.data?.message || "postlist deleted successfully",
      };
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to delete this postlist"
        );
      }
      if (error.response?.status === 404) {
        return rejectWithValue("postlist not found");
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete postlist"
      );
    }
  }
);

/**
 * Reorder posts in a postlist
 */
export const reorderpostlistPosts = createAsyncThunk(
  "postlist/reorderpostlistPosts",
  async ({ postlistId, postIds }, { rejectWithValue }) => {
    try {
      if (!postlistId || !Array.isArray(postIds)) {
        throw new Error("Invalid parameters for reordering");
      }

      const response = await axiosInstance.patch(
        `/postlists/${postlistId}/reorder`,
        { postIds },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to reorder posts"
      );
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const postlistSlice = createSlice({
  name: "postlist",
  initialState: {
    postlists: [],
    currentpostlist: null,
    status: "idle",
    currentpostlistStatus: "idle",
    createStatus: "idle",
    updateStatus: "idle",
    deleteStatus: "idle",
    error: null,
    currentpostlistError: null,
    lastFetch: null,
    selectedpostlistIds: [],
  },
  reducers: {
    clearpostlists: (state) => {
      state.postlists = [];
      state.currentpostlist = null;
      state.status = "idle";
      state.error = null;
      state.lastFetch = null;
    },

    clearCurrentpostlist: (state) => {
      state.currentpostlist = null;
      state.currentpostlistStatus = "idle";
      state.currentpostlistError = null;
    },

    resetStatus: (state) => {
      state.status = "idle";
      state.currentpostlistStatus = "idle";
      state.createStatus = "idle";
      state.updateStatus = "idle";
      state.deleteStatus = "idle";
      state.error = null;
      state.currentpostlistError = null;
    },

    togglepostlistSelection: (state, action) => {
      const postlistId = action.payload;
      const index = state.selectedpostlistIds.indexOf(postlistId);
      if (index > -1) {
        state.selectedpostlistIds.splice(index, 1);
      } else {
        state.selectedpostlistIds.push(postlistId);
      }
    },

    clearpostlistSelection: (state) => {
      state.selectedpostlistIds = [];
    },

    // Socket event handlers
    handlepostlistCreated: (state, action) => {
      const newpostlist = action.payload;
      console.log("[handlepostlistCreated] New postlist:", newpostlist);

      if (!newpostlist?._id) return;

      const exists = state.postlists.some((p) => p._id === newpostlist._id);
      if (!exists) {
        state.postlists.unshift(newpostlist);
        console.log(
          "[handlepostlistCreated] Added to state. Total:",
          state.postlists.length
        );
      }
    },

    handlepostlistUpdated: (state, action) => {
      const updatedpostlist = action.payload;
      if (!updatedpostlist?._id) return;

      const index = state.postlists.findIndex(
        (p) => p._id === updatedpostlist._id
      );
      if (index !== -1) {
        state.postlists[index] = updatedpostlist;
      }

      if (state.currentpostlist?._id === updatedpostlist._id) {
        state.currentpostlist = updatedpostlist;
      }
    },

    handlepostlistDeleted: (state, action) => {
      const { postlistId } = action.payload;
      if (!postlistId) return;

      state.postlists = state.postlists.filter((p) => p._id !== postlistId);

      if (state.currentpostlist?._id === postlistId) {
        state.currentpostlist = null;
      }

      state.selectedpostlistIds = state.selectedpostlistIds.filter(
        (id) => id !== postlistId
      );
    },

    handlePostAddedTopostlist: (state, action) => {
      const { postlistId, post } = action.payload;
      if (!postlistId || !post) return;

      const postlistIndex = state.postlists.findIndex(
        (p) => p._id === postlistId
      );
      if (postlistIndex !== -1) {
        if (!state.postlists[postlistIndex].posts) {
          state.postlists[postlistIndex].posts = [];
        }
        const postExists = state.postlists[postlistIndex].posts.some(
          (p) => p._id === post._id
        );
        if (!postExists) {
          state.postlists[postlistIndex].posts.push(post);
        }
      }

      if (state.currentpostlist?._id === postlistId) {
        if (!state.currentpostlist.posts) {
          state.currentpostlist.posts = [];
        }
        const postExists = state.currentpostlist.posts.some(
          (p) => p._id === post._id
        );
        if (!postExists) {
          state.currentpostlist.posts.push(post);
        }
      }
    },

    handlePostRemovedFrompostlist: (state, action) => {
      const { postlistId, postId } = action.payload;
      if (!postlistId || !postId) return;

      const postlistIndex = state.postlists.findIndex(
        (p) => p._id === postlistId
      );
      if (postlistIndex !== -1 && state.postlists[postlistIndex].posts) {
        state.postlists[postlistIndex].posts = state.postlists[
          postlistIndex
        ].posts.filter((p) => p._id !== postId);
      }

      if (
        state.currentpostlist?._id === postlistId &&
        state.currentpostlist.posts
      ) {
        state.currentpostlist.posts = state.currentpostlist.posts.filter(
          (p) => p._id !== postId
        );
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User postlists
      .addCase(fetchUserpostlists.pending, (state) => {
        console.log("[postlistSlice] fetchUserpostlists.pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserpostlists.fulfilled, (state, action) => {
        console.log("[postlistSlice] fetchUserpostlists.fulfilled");
        console.log(
          "[postlistSlice] Received postlists:",
          action.payload?.length
        );

        state.status = "succeeded";
        state.postlists = Array.isArray(action.payload) ? action.payload : [];

        const privateCount = state.postlists.filter((p) => p.isPrivate).length;
        const publicCount = state.postlists.filter((p) => !p.isPrivate).length;
        console.log(
          `[postlistSlice] State updated - Private: ${privateCount}, Public: ${publicCount}`
        );

        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUserpostlists.rejected, (state, action) => {
        console.error(
          "[postlistSlice] fetchUserpostlists.rejected:",
          action.payload
        );
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch postlist By ID
      .addCase(fetchpostlistById.pending, (state) => {
        state.currentpostlistStatus = "loading";
        state.currentpostlistError = null;
      })
      .addCase(fetchpostlistById.fulfilled, (state, action) => {
        state.currentpostlistStatus = "succeeded";
        state.currentpostlist = action.payload;
        state.currentpostlistError = null;
      })
      .addCase(fetchpostlistById.rejected, (state, action) => {
        state.currentpostlistStatus = "failed";
        state.currentpostlistError = action.payload;
      })

      // Create postlist
      .addCase(createpostlist.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createpostlist.fulfilled, (state, action) => {
        console.log(
          "[postlistSlice] createpostlist.fulfilled:",
          action.payload
        );
        state.createStatus = "succeeded";

        if (action.payload && action.payload._id) {
          state.postlists.unshift(action.payload);
          console.log(
            "[postlistSlice] postlist added to state. Total:",
            state.postlists.length
          );
        }
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(createpostlist.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload;
      })

      // Add To postlist
      .addCase(addTopostlist.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addTopostlist.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedpostlist = action.payload;
        if (!updatedpostlist?._id) return;

        const index = state.postlists.findIndex(
          (p) => p._id === updatedpostlist._id
        );
        if (index !== -1) {
          state.postlists[index] = updatedpostlist;
        }

        if (state.currentpostlist?._id === updatedpostlist._id) {
          state.currentpostlist = updatedpostlist;
        }
        state.error = null;
      })
      .addCase(addTopostlist.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Remove From postlist
      .addCase(removeFrompostlist.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(removeFrompostlist.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedpostlist = action.payload;
        if (!updatedpostlist?._id) return;

        const index = state.postlists.findIndex(
          (p) => p._id === updatedpostlist._id
        );
        if (index !== -1) {
          state.postlists[index] = updatedpostlist;
        }

        if (state.currentpostlist?._id === updatedpostlist._id) {
          state.currentpostlist = updatedpostlist;
        }
        state.error = null;
      })
      .addCase(removeFrompostlist.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update postlist
      .addCase(updatepostlist.pending, (state) => {
        state.updateStatus = "loading";
        state.error = null;
      })
      .addCase(updatepostlist.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const updatedpostlist = action.payload;
        if (!updatedpostlist?._id) return;

        const index = state.postlists.findIndex(
          (p) => p._id === updatedpostlist._id
        );
        if (index !== -1) {
          state.postlists[index] = updatedpostlist;
        }

        if (state.currentpostlist?._id === updatedpostlist._id) {
          state.currentpostlist = updatedpostlist;
        }
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(updatepostlist.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.error = action.payload;
      })

      // Delete postlist
      .addCase(deletepostlist.pending, (state) => {
        state.deleteStatus = "loading";
        state.error = null;
      })
      .addCase(deletepostlist.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        const { postlistId } = action.payload;

        state.postlists = state.postlists.filter((p) => p._id !== postlistId);

        if (state.currentpostlist?._id === postlistId) {
          state.currentpostlist = null;
        }
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(deletepostlist.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.error = action.payload;
      })

      // Reorder postlist Posts
      .addCase(reorderpostlistPosts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(reorderpostlistPosts.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedpostlist = action.payload;
        if (!updatedpostlist?._id) return;

        const index = state.postlists.findIndex(
          (p) => p._id === updatedpostlist._id
        );
        if (index !== -1) {
          state.postlists[index] = updatedpostlist;
        }

        if (state.currentpostlist?._id === updatedpostlist._id) {
          state.currentpostlist = updatedpostlist;
        }
        state.error = null;
      })
      .addCase(reorderpostlistPosts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const {
  clearpostlists,
  clearCurrentpostlist,
  resetStatus,
  togglepostlistSelection,
  clearpostlistSelection,
  handlepostlistCreated,
  handlepostlistUpdated,
  handlepostlistDeleted,
  handlePostAddedTopostlist,
  handlePostRemovedFrompostlist,
} = postlistSlice.actions;

export default postlistSlice.reducer;
