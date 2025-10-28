// clients/src/store/playlistSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Fetch all playlists for a specific user
 */
export const fetchUserPlaylists = createAsyncThunk(
  "playlist/fetchUserPlaylists",
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const response = await axiosInstance.get(`/playlists/user/${userId}`, {
        timeout: 30000,
        withCredentials: true,
      });

      if (!response.data) {
        console.warn("[fetchUserPlaylists] No data in response");
        return [];
      }

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("[fetchUserPlaylists] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 404) {
        return rejectWithValue("User playlists not found");
      }

      if (error.response?.status === 401) {
        return rejectWithValue("Authentication required");
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch playlists"
      );
    }
  }
);

/**
 * Fetch a single playlist by ID with populated posts
 */
export const fetchPlaylistById = createAsyncThunk(
  "playlist/fetchPlaylistById",
  async (playlistId, { rejectWithValue }) => {
    try {
      if (!playlistId) {
        throw new Error("Playlist ID is required");
      }

      const response = await axiosInstance.get(`/playlists/${playlistId}`, {
        timeout: 30000,
      });

      if (!response.data) {
        throw new Error("No playlist data received");
      }

      return response.data;
    } catch (error) {
      console.error("[fetchPlaylistById] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 404) {
        return rejectWithValue("Playlist not found");
      }

      if (error.response?.status === 403) {
        return rejectWithValue("Access denied to private playlist");
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch playlist"
      );
    }
  }
);

/**
 * Create a new playlist
 */
export const createPlaylist = createAsyncThunk(
  "playlist/createPlaylist",
  async (playlistData, { rejectWithValue }) => {
    try {
      const { name, description, isPrivate = false } = playlistData;

      if (!name || name.trim().length === 0) {
        throw new Error("Playlist name is required");
      }

      if (name.length > 100) {
        throw new Error("Playlist name must be less than 100 characters");
      }

      const response = await axiosInstance.post(
        "/playlists",
        {
          name: name.trim(),
          description: description?.trim() || "",
          isPrivate,
        },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data) {
        throw new Error("No data received from server");
      }

      return response.data;
    } catch (error) {
      console.error("[createPlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 401) {
        return rejectWithValue("Authentication required");
      }

      if (error.response?.status === 400) {
        return rejectWithValue(
          error.response?.data?.message || "Invalid playlist data"
        );
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create playlist"
      );
    }
  }
);

/**
 * Add a post to a playlist
 */
export const addToPlaylist = createAsyncThunk(
  "playlist/addToPlaylist",
  async ({ playlistId, postId }, { rejectWithValue }) => {
    try {
      if (!playlistId || !postId) {
        throw new Error("Playlist ID and Post ID are required");
      }

      const response = await axiosInstance.post(
        `/playlists/${playlistId}/add`,
        { postId },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data) {
        throw new Error("No data received from server");
      }

      return response.data;
    } catch (error) {
      console.error("[addToPlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to modify this playlist"
        );
      }

      if (error.response?.status === 404) {
        return rejectWithValue("Playlist or post not found");
      }

      if (error.response?.status === 409) {
        return rejectWithValue("Post already exists in this playlist");
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to add post to playlist"
      );
    }
  }
);

/**
 * Remove a post from a playlist
 */
export const removeFromPlaylist = createAsyncThunk(
  "playlist/removeFromPlaylist",
  async ({ playlistId, postId }, { rejectWithValue }) => {
    try {
      if (!playlistId || !postId) {
        throw new Error("Playlist ID and Post ID are required");
      }

      const response = await axiosInstance.post(
        `/playlists/${playlistId}/remove`,
        { postId },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data) {
        throw new Error("No data received from server");
      }

      return response.data;
    } catch (error) {
      console.error("[removeFromPlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to modify this playlist"
        );
      }

      if (error.response?.status === 404) {
        return rejectWithValue("Playlist not found");
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove post from playlist"
      );
    }
  }
);

/**
 * Update playlist details (name, description, privacy)
 */
export const updatePlaylist = createAsyncThunk(
  "playlist/updatePlaylist",
  async ({ playlistId, updates }, { rejectWithValue }) => {
    try {
      if (!playlistId) {
        throw new Error("Playlist ID is required");
      }

      if (updates.name && updates.name.length > 100) {
        throw new Error("Playlist name must be less than 100 characters");
      }

      const response = await axiosInstance.patch(
        `/playlists/${playlistId}`,
        updates,
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      if (!response.data) {
        throw new Error("No data received from server");
      }

      return response.data;
    } catch (error) {
      console.error("[updatePlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to update this playlist"
        );
      }

      if (error.response?.status === 404) {
        return rejectWithValue("Playlist not found");
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to update playlist"
      );
    }
  }
);

/**
 * Delete a playlist
 */
export const deletePlaylist = createAsyncThunk(
  "playlist/deletePlaylist",
  async (playlistId, { rejectWithValue }) => {
    try {
      if (!playlistId) {
        throw new Error("Playlist ID is required");
      }

      const response = await axiosInstance.delete(`/playlists/${playlistId}`, {
        timeout: 30000,
        withCredentials: true,
      });

      return { playlistId, message: response.data?.message || "Deleted" };
    } catch (error) {
      console.error("[deletePlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to delete this playlist"
        );
      }

      if (error.response?.status === 404) {
        return rejectWithValue("Playlist not found");
      }

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete playlist"
      );
    }
  }
);

/**
 * Reorder posts in a playlist
 */
export const reorderPlaylistPosts = createAsyncThunk(
  "playlist/reorderPlaylistPosts",
  async ({ playlistId, postIds }, { rejectWithValue }) => {
    try {
      if (!playlistId || !Array.isArray(postIds)) {
        throw new Error("Invalid parameters for reordering");
      }

      const response = await axiosInstance.patch(
        `/playlists/${playlistId}/reorder`,
        { postIds },
        {
          timeout: 30000,
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      console.error("[reorderPlaylistPosts] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

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

const playlistSlice = createSlice({
  name: "playlist",
  initialState: {
    // All playlists for current user
    playlists: [],
    // Currently viewed playlist (with full details)
    currentPlaylist: null,
    // Loading states
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    currentPlaylistStatus: "idle",
    createStatus: "idle",
    updateStatus: "idle",
    deleteStatus: "idle",
    // Error states
    error: null,
    currentPlaylistError: null,
    // Metadata
    lastFetch: null,
    selectedPlaylistIds: [], // For bulk operations
  },
  reducers: {
    // Clear all playlists
    clearPlaylists: (state) => {
      state.playlists = [];
      state.currentPlaylist = null;
      state.status = "idle";
      state.error = null;
      state.lastFetch = null;
    },

    // Clear current playlist
    clearCurrentPlaylist: (state) => {
      state.currentPlaylist = null;
      state.currentPlaylistStatus = "idle";
      state.currentPlaylistError = null;
    },

    // Reset all statuses
    resetStatus: (state) => {
      state.status = "idle";
      state.currentPlaylistStatus = "idle";
      state.createStatus = "idle";
      state.updateStatus = "idle";
      state.deleteStatus = "idle";
      state.error = null;
      state.currentPlaylistError = null;
    },

    // Select/deselect playlists for bulk operations
    togglePlaylistSelection: (state, action) => {
      const playlistId = action.payload;
      const index = state.selectedPlaylistIds.indexOf(playlistId);
      if (index > -1) {
        state.selectedPlaylistIds.splice(index, 1);
      } else {
        state.selectedPlaylistIds.push(playlistId);
      }
    },

    clearPlaylistSelection: (state) => {
      state.selectedPlaylistIds = [];
    },

    // ========================================================================
    // SOCKET EVENT HANDLERS
    // ========================================================================

    /**
     * Handle real-time playlist creation from socket
     */
    handlePlaylistCreated: (state, action) => {
      const newPlaylist = action.payload;
      if (!newPlaylist || !newPlaylist._id) {
        console.warn("[playlistSlice] Invalid playlist data in socket event");
        return;
      }

      // Check if playlist already exists
      const exists = state.playlists.some((p) => p._id === newPlaylist._id);
      if (!exists) {
        state.playlists.unshift(newPlaylist);
        console.log(
          "[playlistSlice] 🔵 Socket: Playlist created",
          newPlaylist._id
        );
      }
    },

    /**
     * Handle real-time playlist updates from socket
     */
    handlePlaylistUpdated: (state, action) => {
      const updatedPlaylist = action.payload;
      if (!updatedPlaylist || !updatedPlaylist._id) {
        console.warn("[playlistSlice] Invalid playlist data in socket event");
        return;
      }

      // Update in playlists array
      const index = state.playlists.findIndex(
        (p) => p._id === updatedPlaylist._id
      );
      if (index !== -1) {
        state.playlists[index] = updatedPlaylist;
      }

      // Update current playlist if it's the same
      if (state.currentPlaylist?._id === updatedPlaylist._id) {
        state.currentPlaylist = updatedPlaylist;
      }

      console.log(
        "[playlistSlice] 🔵 Socket: Playlist updated",
        updatedPlaylist._id
      );
    },

    /**
     * Handle real-time playlist deletion from socket
     */
    handlePlaylistDeleted: (state, action) => {
      const { playlistId } = action.payload;
      if (!playlistId) {
        console.warn("[playlistSlice] Invalid playlist ID in socket event");
        return;
      }

      // Remove from playlists array
      state.playlists = state.playlists.filter((p) => p._id !== playlistId);

      // Clear current playlist if it was deleted
      if (state.currentPlaylist?._id === playlistId) {
        state.currentPlaylist = null;
      }

      // Remove from selection
      state.selectedPlaylistIds = state.selectedPlaylistIds.filter(
        (id) => id !== playlistId
      );

      console.log("[playlistSlice] 🔵 Socket: Playlist deleted", playlistId);
    },

    /**
     * Handle real-time post added to playlist from socket
     */
    handlePostAddedToPlaylist: (state, action) => {
      const { playlistId, post } = action.payload;
      if (!playlistId || !post) {
        console.warn("[playlistSlice] Invalid data in post added event");
        return;
      }

      // Update playlist in array
      const playlistIndex = state.playlists.findIndex(
        (p) => p._id === playlistId
      );
      if (playlistIndex !== -1) {
        if (!state.playlists[playlistIndex].posts) {
          state.playlists[playlistIndex].posts = [];
        }
        const postExists = state.playlists[playlistIndex].posts.some(
          (p) => p._id === post._id
        );
        if (!postExists) {
          state.playlists[playlistIndex].posts.push(post);
        }
      }

      // Update current playlist
      if (state.currentPlaylist?._id === playlistId) {
        if (!state.currentPlaylist.posts) {
          state.currentPlaylist.posts = [];
        }
        const postExists = state.currentPlaylist.posts.some(
          (p) => p._id === post._id
        );
        if (!postExists) {
          state.currentPlaylist.posts.push(post);
        }
      }

      console.log(
        "[playlistSlice] 🔵 Socket: Post added to playlist",
        playlistId
      );
    },

    /**
     * Handle real-time post removed from playlist from socket
     */
    handlePostRemovedFromPlaylist: (state, action) => {
      const { playlistId, postId } = action.payload;
      if (!playlistId || !postId) {
        console.warn("[playlistSlice] Invalid data in post removed event");
        return;
      }

      // Update playlist in array
      const playlistIndex = state.playlists.findIndex(
        (p) => p._id === playlistId
      );
      if (playlistIndex !== -1 && state.playlists[playlistIndex].posts) {
        state.playlists[playlistIndex].posts = state.playlists[
          playlistIndex
        ].posts.filter((p) => p._id !== postId);
      }

      // Update current playlist
      if (
        state.currentPlaylist?._id === playlistId &&
        state.currentPlaylist.posts
      ) {
        state.currentPlaylist.posts = state.currentPlaylist.posts.filter(
          (p) => p._id !== postId
        );
      }

      console.log(
        "[playlistSlice] 🔵 Socket: Post removed from playlist",
        playlistId
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Playlists
      .addCase(fetchUserPlaylists.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserPlaylists.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.playlists = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUserPlaylists.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error(
          "[playlistSlice] Fetch user playlists failed:",
          action.payload
        );
      })

      // Fetch Playlist By ID
      .addCase(fetchPlaylistById.pending, (state) => {
        state.currentPlaylistStatus = "loading";
        state.currentPlaylistError = null;
      })
      .addCase(fetchPlaylistById.fulfilled, (state, action) => {
        state.currentPlaylistStatus = "succeeded";
        state.currentPlaylist = action.payload;
        state.currentPlaylistError = null;
      })
      .addCase(fetchPlaylistById.rejected, (state, action) => {
        state.currentPlaylistStatus = "failed";
        state.currentPlaylistError = action.payload;
        console.error(
          "[playlistSlice] Fetch playlist by ID failed:",
          action.payload
        );
      })

      // Create Playlist
      .addCase(createPlaylist.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createPlaylist.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.playlists.unshift(action.payload);
        state.error = null;
      })
      .addCase(createPlaylist.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload;
        console.error(
          "[playlistSlice] Create playlist failed:",
          action.payload
        );
      })

      // Add To Playlist
      .addCase(addToPlaylist.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1) {
          state.playlists[index] = updatedPlaylist;
        }
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = updatedPlaylist;
        }
      })
      .addCase(addToPlaylist.rejected, (state, action) => {
        state.error = action.payload;
        console.error(
          "[playlistSlice] Add to playlist failed:",
          action.payload
        );
      })

      // Remove From Playlist
      .addCase(removeFromPlaylist.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1) {
          state.playlists[index] = updatedPlaylist;
        }
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = updatedPlaylist;
        }
      })
      .addCase(removeFromPlaylist.rejected, (state, action) => {
        state.error = action.payload;
        console.error(
          "[playlistSlice] Remove from playlist failed:",
          action.payload
        );
      })

      // Update Playlist
      .addCase(updatePlaylist.pending, (state) => {
        state.updateStatus = "loading";
        state.error = null;
      })
      .addCase(updatePlaylist.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const updatedPlaylist = action.payload;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1) {
          state.playlists[index] = updatedPlaylist;
        }
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = updatedPlaylist;
        }
        state.error = null;
      })
      .addCase(updatePlaylist.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.error = action.payload;
        console.error(
          "[playlistSlice] Update playlist failed:",
          action.payload
        );
      })

      // Delete Playlist
      .addCase(deletePlaylist.pending, (state) => {
        state.deleteStatus = "loading";
        state.error = null;
      })
      .addCase(deletePlaylist.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        const { playlistId } = action.payload;
        state.playlists = state.playlists.filter((p) => p._id !== playlistId);
        if (state.currentPlaylist?._id === playlistId) {
          state.currentPlaylist = null;
        }
        state.error = null;
      })
      .addCase(deletePlaylist.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.error = action.payload;
        console.error(
          "[playlistSlice] Delete playlist failed:",
          action.payload
        );
      })

      // Reorder Playlist Posts
      .addCase(reorderPlaylistPosts.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1) {
          state.playlists[index] = updatedPlaylist;
        }
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = updatedPlaylist;
        }
      })
      .addCase(reorderPlaylistPosts.rejected, (state, action) => {
        state.error = action.payload;
        console.error("[playlistSlice] Reorder posts failed:", action.payload);
      });
  },
});

export const {
  clearPlaylists,
  clearCurrentPlaylist,
  resetStatus,
  togglePlaylistSelection,
  clearPlaylistSelection,
  handlePlaylistCreated,
  handlePlaylistUpdated,
  handlePlaylistDeleted,
  handlePostAddedToPlaylist,
  handlePostRemovedFromPlaylist,
} = playlistSlice.actions;

export default playlistSlice.reducer;
