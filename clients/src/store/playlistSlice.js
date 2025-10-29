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
    console.log("[fetchUserPlaylists] Start:", { userId });
    try {
      if (!userId) throw new Error("User ID is required");

      const response = await axiosInstance.get(`/playlists/user/${userId}`, {
        timeout: 30000,
        withCredentials: true,
      });

      console.log("[fetchUserPlaylists] Full API response:", response.data);

      // ✅ FIX: unwrap actual playlists array
      const result = Array.isArray(response.data?.data)
        ? response.data?.data
        : [];

      console.log("[fetchUserPlaylists] Success, returning:", {
        count: result.length,
      });

      return result;
    } catch (error) {
      console.error("[fetchUserPlaylists] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 404) {
        console.log(
          "[fetchUserPlaylists] 404, rejecting with:",
          "User playlists not found"
        );
        return rejectWithValue("User playlists not found");
      }

      if (error.response?.status === 401) {
        console.log(
          "[fetchUserPlaylists] 401, rejecting with:",
          "Authentication required"
        );
        return rejectWithValue("Authentication required");
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch playlists";
      console.log("[fetchUserPlaylists] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Fetch a single playlist by ID with populated posts
 */
export const fetchPlaylistById = createAsyncThunk(
  "playlist/fetchPlaylistById",
  async (playlistId, { rejectWithValue }) => {
    console.log("[fetchPlaylistById] Start:", { playlistId });
    try {
      if (!playlistId) {
        const error = new Error("Playlist ID is required");
        console.error("[fetchPlaylistById] Validation error:", error.message);
        throw error;
      }
      console.log(
        "[fetchPlaylistById] Making API request for playlistId:",
        playlistId
      );

      const response = await axiosInstance.get(`/playlists/${playlistId}`, {
        timeout: 30000,
      });
      console.log("[fetchPlaylistById] API response:", {
        status: response.status,
        data: response.data,
      });

      if (!response.data) {
        const error = new Error("No playlist data received");
        console.error("[fetchPlaylistById] No data error:", error.message);
        throw error;
      }

      console.log("[fetchPlaylistById] Success, returning:", response.data);
      return response.data;
    } catch (error) {
      console.error("[fetchPlaylistById] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 404) {
        console.log(
          "[fetchPlaylistById] 404, rejecting with:",
          "Playlist not found"
        );
        return rejectWithValue("Playlist not found");
      }

      if (error.response?.status === 403) {
        console.log(
          "[fetchPlaylistById] 403, rejecting with:",
          "Access denied to private playlist"
        );
        return rejectWithValue("Access denied to private playlist");
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch playlist";
      console.log("[fetchPlaylistById] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Create a new playlist
 */
export const createPlaylist = createAsyncThunk(
  "playlist/createPlaylist",
  async (playlistData, { rejectWithValue }) => {
    console.log("[createPlaylist] Start:", { playlistData });
    try {
      const { name, description, isPrivate = false } = playlistData;
      console.log("[createPlaylist] Parsed data:", {
        name,
        description,
        isPrivate,
      });

      if (!name || name.trim().length === 0) {
        const error = new Error("Playlist name is required");
        console.error("[createPlaylist] Validation error:", error.message);
        throw error;
      }

      if (name.length > 100) {
        const error = new Error(
          "Playlist name must be less than 100 characters"
        );
        console.error("[createPlaylist] Validation error:", error.message);
        throw error;
      }

      const payload = {
        name: name.trim(),
        description: description?.trim() || "",
        isPrivate,
      };
      console.log("[createPlaylist] Making API request with payload:", payload);

      const response = await axiosInstance.post("/playlists", payload, {
        timeout: 30000,
        withCredentials: true,
      });
      console.log("[createPlaylist] API response:", {
        status: response.status,
        data: response.data,
      });

      if (!response.data) {
        const error = new Error("No data received from server");
        console.error("[createPlaylist] No data error:", error.message);
        throw error;
      }

      console.log("[createPlaylist] Success, returning:", response.data);
      return response.data;
    } catch (error) {
      console.error("[createPlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 401) {
        console.log(
          "[createPlaylist] 401, rejecting with:",
          "Authentication required"
        );
        return rejectWithValue("Authentication required");
      }

      if (error.response?.status === 400) {
        const rejectMsg =
          error.response?.data?.message || "Invalid playlist data";
        console.log("[createPlaylist] 400, rejecting with:", rejectMsg);
        return rejectWithValue(rejectMsg);
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create playlist";
      console.log("[createPlaylist] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Add a post to a playlist
 */
export const addToPlaylist = createAsyncThunk(
  "playlist/addToPlaylist",
  async ({ playlistId, postId }, { rejectWithValue }) => {
    console.log("[addToPlaylist] Start:", { playlistId, postId });
    try {
      if (!playlistId || !postId) {
        const error = new Error("Playlist ID and Post ID are required");
        console.error("[addToPlaylist] Validation error:", error.message);
        throw error;
      }

      const payload = { postId };
      console.log("[addToPlaylist] Making API request with payload:", payload);

      const response = await axiosInstance.post(
        `/playlists/${playlistId}/add`,
        payload,
        {
          timeout: 30000,
          withCredentials: true,
        }
      );
      console.log("[addToPlaylist] API response:", {
        status: response.status,
        data: response.data,
      });

      if (!response.data) {
        const error = new Error("No data received from server");
        console.error("[addToPlaylist] No data error:", error.message);
        throw error;
      }

      console.log("[addToPlaylist] Success, returning:", response.data);
      return response.data;
    } catch (error) {
      console.error("[addToPlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        console.log(
          "[addToPlaylist] 403, rejecting with:",
          "You don't have permission to modify this playlist"
        );
        return rejectWithValue(
          "You don't have permission to modify this playlist"
        );
      }

      if (error.response?.status === 404) {
        console.log(
          "[addToPlaylist] 404, rejecting with:",
          "Playlist or post not found"
        );
        return rejectWithValue("Playlist or post not found");
      }

      if (error.response?.status === 409) {
        console.log(
          "[addToPlaylist] 409, rejecting with:",
          "Post already exists in this playlist"
        );
        return rejectWithValue("Post already exists in this playlist");
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to add post to playlist";
      console.log("[addToPlaylist] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Remove a post from a playlist
 */
export const removeFromPlaylist = createAsyncThunk(
  "playlist/removeFromPlaylist",
  async ({ playlistId, postId }, { rejectWithValue }) => {
    console.log("[removeFromPlaylist] Start:", { playlistId, postId });
    try {
      if (!playlistId || !postId) {
        const error = new Error("Playlist ID and Post ID are required");
        console.error("[removeFromPlaylist] Validation error:", error.message);
        throw error;
      }

      const payload = { postId };
      console.log(
        "[removeFromPlaylist] Making API request with payload:",
        payload
      );

      const response = await axiosInstance.post(
        `/playlists/${playlistId}/remove`,
        payload,
        {
          timeout: 30000,
          withCredentials: true,
        }
      );
      console.log("[removeFromPlaylist] API response:", {
        status: response.status,
        data: response.data,
      });

      if (!response.data) {
        const error = new Error("No data received from server");
        console.error("[removeFromPlaylist] No data error:", error.message);
        throw error;
      }

      console.log("[removeFromPlaylist] Success, returning:", response.data);
      return response.data;
    } catch (error) {
      console.error("[removeFromPlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        console.log(
          "[removeFromPlaylist] 403, rejecting with:",
          "You don't have permission to modify this playlist"
        );
        return rejectWithValue(
          "You don't have permission to modify this playlist"
        );
      }

      if (error.response?.status === 404) {
        console.log(
          "[removeFromPlaylist] 404, rejecting with:",
          "Playlist not found"
        );
        return rejectWithValue("Playlist not found");
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to remove post from playlist";
      console.log("[removeFromPlaylist] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Update playlist details (name, description, privacy)
 */
export const updatePlaylist = createAsyncThunk(
  "playlist/updatePlaylist",
  async ({ playlistId, updates }, { rejectWithValue }) => {
    console.log("[updatePlaylist] Start:", { playlistId, updates });
    try {
      if (!playlistId) {
        const error = new Error("Playlist ID is required");
        console.error("[updatePlaylist] Validation error:", error.message);
        throw error;
      }

      if (updates.name && updates.name.length > 100) {
        const error = new Error(
          "Playlist name must be less than 100 characters"
        );
        console.error("[updatePlaylist] Validation error:", error.message);
        throw error;
      }

      console.log("[updatePlaylist] Making API request with updates:", updates);

      const response = await axiosInstance.patch(
        `/playlists/${playlistId}`,
        updates,
        {
          timeout: 30000,
          withCredentials: true,
        }
      );
      console.log("[updatePlaylist] API response:", {
        status: response.status,
        data: response.data,
      });

      if (!response.data) {
        const error = new Error("No data received from server");
        console.error("[updatePlaylist] No data error:", error.message);
        throw error;
      }

      console.log("[updatePlaylist] Success, returning:", response.data);
      return response.data;
    } catch (error) {
      console.error("[updatePlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        console.log(
          "[updatePlaylist] 403, rejecting with:",
          "You don't have permission to update this playlist"
        );
        return rejectWithValue(
          "You don't have permission to update this playlist"
        );
      }

      if (error.response?.status === 404) {
        console.log(
          "[updatePlaylist] 404, rejecting with:",
          "Playlist not found"
        );
        return rejectWithValue("Playlist not found");
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update playlist";
      console.log("[updatePlaylist] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Delete a playlist
 */
export const deletePlaylist = createAsyncThunk(
  "playlist/deletePlaylist",
  async (playlistId, { rejectWithValue }) => {
    console.log("[deletePlaylist] Start:", { playlistId });
    try {
      if (!playlistId) {
        const error = new Error("Playlist ID is required");
        console.error("[deletePlaylist] Validation error:", error.message);
        throw error;
      }

      console.log(
        "[deletePlaylist] Making API request for playlistId:",
        playlistId
      );

      const response = await axiosInstance.delete(`/playlists/${playlistId}`, {
        timeout: 30000,
        withCredentials: true,
      });
      console.log("[deletePlaylist] API response:", {
        status: response.status,
        data: response.data,
      });

      const result = {
        playlistId,
        message: response.data?.message || "Deleted",
      };
      console.log("[deletePlaylist] Success, returning:", result);
      return result;
    } catch (error) {
      console.error("[deletePlaylist] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 403) {
        console.log(
          "[deletePlaylist] 403, rejecting with:",
          "You don't have permission to delete this playlist"
        );
        return rejectWithValue(
          "You don't have permission to delete this playlist"
        );
      }

      if (error.response?.status === 404) {
        console.log(
          "[deletePlaylist] 404, rejecting with:",
          "Playlist not found"
        );
        return rejectWithValue("Playlist not found");
      }

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete playlist";
      console.log("[deletePlaylist] General reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
    }
  }
);

/**
 * Reorder posts in a playlist
 */
export const reorderPlaylistPosts = createAsyncThunk(
  "playlist/reorderPlaylistPosts",
  async ({ playlistId, postIds }, { rejectWithValue }) => {
    console.log("[reorderPlaylistPosts] Start:", {
      playlistId,
      postIdsLength: postIds?.length,
    });
    try {
      if (!playlistId || !Array.isArray(postIds)) {
        const error = new Error("Invalid parameters for reordering");
        console.error(
          "[reorderPlaylistPosts] Validation error:",
          error.message
        );
        throw error;
      }

      const payload = { postIds };
      console.log("[reorderPlaylistPosts] Making API request with payload:", {
        postIdsLength: postIds.length,
      });

      const response = await axiosInstance.patch(
        `/playlists/${playlistId}/reorder`,
        payload,
        {
          timeout: 30000,
          withCredentials: true,
        }
      );
      console.log("[reorderPlaylistPosts] API response:", {
        status: response.status,
        data: response.data,
      });

      console.log("[reorderPlaylistPosts] Success, returning:", response.data);
      return response.data;
    } catch (error) {
      console.error("[reorderPlaylistPosts] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      const rejectMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to reorder posts";
      console.log("[reorderPlaylistPosts] Reject with:", rejectMsg);
      return rejectWithValue(rejectMsg);
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
      console.log("[playlistSlice] clearPlaylists: Clearing state");
      state.playlists = [];
      state.currentPlaylist = null;
      state.status = "idle";
      state.error = null;
      state.lastFetch = null;
      console.log("[playlistSlice] clearPlaylists: State cleared");
    },

    // Clear current playlist
    clearCurrentPlaylist: (state) => {
      console.log("[playlistSlice] clearCurrentPlaylist: Clearing current");
      state.currentPlaylist = null;
      state.currentPlaylistStatus = "idle";
      state.currentPlaylistError = null;
      console.log("[playlistSlice] clearCurrentPlaylist: Current cleared");
    },

    // Reset all statuses
    resetStatus: (state) => {
      console.log("[playlistSlice] resetStatus: Resetting statuses");
      state.status = "idle";
      state.currentPlaylistStatus = "idle";
      state.createStatus = "idle";
      state.updateStatus = "idle";
      state.deleteStatus = "idle";
      state.error = null;
      state.currentPlaylistError = null;
      console.log("[playlistSlice] resetStatus: Statuses reset");
    },

    // Select/deselect playlists for bulk operations
    togglePlaylistSelection: (state, action) => {
      const playlistId = action.payload;
      console.log("[playlistSlice] togglePlaylistSelection:", {
        playlistId,
        currentSelected: state.selectedPlaylistIds,
      });
      const index = state.selectedPlaylistIds.indexOf(playlistId);
      if (index > -1) {
        state.selectedPlaylistIds.splice(index, 1);
        console.log("[playlistSlice] Deselected:", playlistId);
      } else {
        state.selectedPlaylistIds.push(playlistId);
        console.log("[playlistSlice] Selected:", playlistId);
      }
    },

    clearPlaylistSelection: (state) => {
      console.log(
        "[playlistSlice] clearPlaylistSelection: Clearing selection",
        state.selectedPlaylistIds
      );
      state.selectedPlaylistIds = [];
      console.log("[playlistSlice] clearPlaylistSelection: Selection cleared");
    },

    // ========================================================================
    // SOCKET EVENT HANDLERS
    // ========================================================================

    /**
     * Handle real-time playlist creation from socket
     */
    handlePlaylistCreated: (state, action) => {
      const newPlaylist = action.payload;
      console.log("[playlistSlice] handlePlaylistCreated:", {
        newPlaylistId: newPlaylist?._id,
      });
      if (!newPlaylist || !newPlaylist._id) {
        console.warn("[playlistSlice] Invalid playlist data in socket event");
        return;
      }

      // Check if playlist already exists
      const exists = state.playlists.some((p) => p._id === newPlaylist._id);
      console.log("[playlistSlice] Playlist exists?", exists);
      if (!exists) {
        state.playlists.unshift(newPlaylist);
        console.log(
          "[playlistSlice] 🔵 Socket: Playlist created",
          newPlaylist._id
        );
      } else {
        console.log(
          "[playlistSlice] 🔵 Socket: Playlist already exists, skipping"
        );
      }
    },

    /**
     * Handle real-time playlist updates from socket
     */
    handlePlaylistUpdated: (state, action) => {
      const updatedPlaylist = action.payload;
      console.log("[playlistSlice] handlePlaylistUpdated:", {
        updatedPlaylistId: updatedPlaylist?._id,
      });
      if (!updatedPlaylist || !updatedPlaylist._id) {
        console.warn("[playlistSlice] Invalid playlist data in socket event");
        return;
      }

      // Update in playlists array
      const index = state.playlists.findIndex(
        (p) => p._id === updatedPlaylist._id
      );
      console.log("[playlistSlice] Found index:", index);
      if (index !== -1) {
        state.playlists[index] = updatedPlaylist;
        console.log("[playlistSlice] Updated in playlists array");
      }

      // Update current playlist if it's the same
      if (state.currentPlaylist?._id === updatedPlaylist._id) {
        state.currentPlaylist = updatedPlaylist;
        console.log("[playlistSlice] Updated current playlist");
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
      console.log("[playlistSlice] handlePlaylistDeleted:", { playlistId });
      if (!playlistId) {
        console.warn("[playlistSlice] Invalid playlist ID in socket event");
        return;
      }

      // Remove from playlists array
      const beforeLength = state.playlists.length;
      state.playlists = state.playlists.filter((p) => p._id !== playlistId);
      console.log("[playlistSlice] Removed from playlists, length:", {
        before: beforeLength,
        after: state.playlists.length,
      });

      // Clear current playlist if it was deleted
      const wasCurrent = state.currentPlaylist?._id === playlistId;
      if (wasCurrent) {
        state.currentPlaylist = null;
        console.log("[playlistSlice] Cleared current playlist");
      }

      // Remove from selection
      const beforeSelLength = state.selectedPlaylistIds.length;
      state.selectedPlaylistIds = state.selectedPlaylistIds.filter(
        (id) => id !== playlistId
      );
      console.log("[playlistSlice] Selection updated, length:", {
        before: beforeSelLength,
        after: state.selectedPlaylistIds.length,
      });

      console.log("[playlistSlice] 🔵 Socket: Playlist deleted", playlistId);
    },

    /**
     * Handle real-time post added to playlist from socket
     */
    handlePostAddedToPlaylist: (state, action) => {
      const { playlistId, post } = action.payload;
      console.log("[playlistSlice] handlePostAddedToPlaylist:", {
        playlistId,
        postId: post?._id,
      });
      if (!playlistId || !post) {
        console.warn("[playlistSlice] Invalid data in post added event");
        return;
      }

      // Update playlist in array
      const playlistIndex = state.playlists.findIndex(
        (p) => p._id === playlistId
      );
      console.log("[playlistSlice] Playlist index:", playlistIndex);
      if (playlistIndex !== -1) {
        if (!state.playlists[playlistIndex].posts) {
          state.playlists[playlistIndex].posts = [];
          console.log("[playlistSlice] Initialized posts array");
        }
        const postExists = state.playlists[playlistIndex].posts.some(
          (p) => p._id === post._id
        );
        console.log("[playlistSlice] Post exists?", postExists);
        if (!postExists) {
          state.playlists[playlistIndex].posts.push(post);
          console.log("[playlistSlice] Added post to playlists array");
        }
      }

      // Update current playlist
      if (state.currentPlaylist?._id === playlistId) {
        if (!state.currentPlaylist.posts) {
          state.currentPlaylist.posts = [];
          console.log("[playlistSlice] Initialized current posts array");
        }
        const postExists = state.currentPlaylist.posts.some(
          (p) => p._id === post._id
        );
        console.log("[playlistSlice] Post exists in current?", postExists);
        if (!postExists) {
          state.currentPlaylist.posts.push(post);
          console.log("[playlistSlice] Added post to current playlist");
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
      console.log("[playlistSlice] handlePostRemovedFromPlaylist:", {
        playlistId,
        postId,
      });
      if (!playlistId || !postId) {
        console.warn("[playlistSlice] Invalid data in post removed event");
        return;
      }

      // Update playlist in array
      const playlistIndex = state.playlists.findIndex(
        (p) => p._id === playlistId
      );
      console.log("[playlistSlice] Playlist index:", playlistIndex);
      if (playlistIndex !== -1 && state.playlists[playlistIndex].posts) {
        const beforeLength = state.playlists[playlistIndex].posts.length;
        state.playlists[playlistIndex].posts = state.playlists[
          playlistIndex
        ].posts.filter((p) => p._id !== postId);
        console.log("[playlistSlice] Removed from playlists array, length:", {
          before: beforeLength,
          after: state.playlists[playlistIndex].posts.length,
        });
      }

      // Update current playlist
      if (
        state.currentPlaylist?._id === playlistId &&
        state.currentPlaylist.posts
      ) {
        const beforeLength = state.currentPlaylist.posts.length;
        state.currentPlaylist.posts = state.currentPlaylist.posts.filter(
          (p) => p._id !== postId
        );
        console.log("[playlistSlice] Removed from current, length:", {
          before: beforeLength,
          after: state.currentPlaylist.posts.length,
        });
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
        console.log(
          "[playlistSlice] fetchUserPlaylists.pending: Setting loading"
        );
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserPlaylists.fulfilled, (state, action) => {
        console.log("[playlistSlice] fetchUserPlaylists.fulfilled:", {
          payloadLength: action.payload?.length,
        });
        state.status = "succeeded";
        state.playlists = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
        state.lastFetch = new Date().toISOString();
        console.log("[playlistSlice] State updated:", {
          playlistsLength: state.playlists.length,
        });
      })
      .addCase(fetchUserPlaylists.rejected, (state, action) => {
        console.error(
          "[playlistSlice] fetchUserPlaylists.rejected:",
          action.payload
        );
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch Playlist By ID
      .addCase(fetchPlaylistById.pending, (state) => {
        console.log(
          "[playlistSlice] fetchPlaylistById.pending: Setting current loading"
        );
        state.currentPlaylistStatus = "loading";
        state.currentPlaylistError = null;
      })
      .addCase(fetchPlaylistById.fulfilled, (state, action) => {
        console.log("[playlistSlice] fetchPlaylistById.fulfilled:", {
          playlistId: action.payload?._id,
        });
        state.currentPlaylistStatus = "succeeded";
        state.currentPlaylist = action.payload;
        state.currentPlaylistError = null;
      })
      .addCase(fetchPlaylistById.rejected, (state, action) => {
        console.error(
          "[playlistSlice] fetchPlaylistById.rejected:",
          action.payload
        );
        state.currentPlaylistStatus = "failed";
        state.currentPlaylistError = action.payload;
      })

      // Create Playlist
      .addCase(createPlaylist.pending, (state) => {
        console.log(
          "[playlistSlice] createPlaylist.pending: Setting create loading"
        );
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createPlaylist.fulfilled, (state, action) => {
        console.log("[playlistSlice] createPlaylist.fulfilled:", {
          newPlaylistId: action.payload?._id,
        });
        state.createStatus = "succeeded";
        state.playlists.unshift(action.payload);
        state.error = null;
        state.lastFetch = new Date().toISOString();
        console.log(
          "[playlistSlice] Added to playlists, new length:",
          state.playlists.length
        );
      })
      .addCase(createPlaylist.rejected, (state, action) => {
        console.error(
          "[playlistSlice] createPlaylist.rejected:",
          action.payload
        );
        state.createStatus = "failed";
        state.error = action.payload;
      })

      // Add To Playlist
      .addCase(addToPlaylist.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addToPlaylist.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        if (!updatedPlaylist?._id) return;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1)
          state.playlists[index] = {
            ...state.playlists[index],
            ...updatedPlaylist,
          };
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = {
            ...state.currentPlaylist,
            ...updatedPlaylist,
          };
        }
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(addToPlaylist.rejected, (state, action) => {
        console.error(
          "[playlistSlice] addToPlaylist.rejected:",
          action.payload
        );
        state.error = action.payload;
        state.status = "failed";
      })

      // Remove From Playlist
      .addCase(removeFromPlaylist.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(removeFromPlaylist.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        console.log("[playlistSlice] removeFromPlaylist.fulfilled:", {
          playlistId: updatedPlaylist?._id,
        });
        if (!updatedPlaylist?._id) return;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1)
          state.playlists[index] = {
            ...state.playlists[index],
            ...updatedPlaylist,
          };
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = {
            ...state.currentPlaylist,
            ...updatedPlaylist,
          };
        }
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(removeFromPlaylist.rejected, (state, action) => {
        console.error(
          "[playlistSlice] removeFromPlaylist.rejected:",
          action.payload
        );
        state.error = action.payload;
        state.status = "failed";
      })

      // Update Playlist
      .addCase(updatePlaylist.pending, (state) => {
        console.log(
          "[playlistSlice] updatePlaylist.pending: Setting update loading"
        );
        state.updateStatus = "loading";
        state.error = null;
      })
      .addCase(updatePlaylist.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        console.log("[playlistSlice] updatePlaylist.fulfilled:", {
          playlistId: updatedPlaylist?._id,
        });
        state.updateStatus = "succeeded";
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        console.log("[playlistSlice] Found index:", index);
        if (index !== -1) {
          state.playlists[index] = updatedPlaylist;
          console.log("[playlistSlice] Updated playlists array");
        }
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = updatedPlaylist;
          console.log("[playlistSlice] Updated current playlist");
        }
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(updatePlaylist.rejected, (state, action) => {
        console.error(
          "[playlistSlice] updatePlaylist.rejected:",
          action.payload
        );
        state.updateStatus = "failed";
        state.error = action.payload;
      })

      // Delete Playlist
      .addCase(deletePlaylist.pending, (state) => {
        console.log(
          "[playlistSlice] deletePlaylist.pending: Setting delete loading"
        );
        state.deleteStatus = "loading";
        state.error = null;
      })
      .addCase(deletePlaylist.fulfilled, (state, action) => {
        const { playlistId } = action.payload;
        console.log("[playlistSlice] deletePlaylist.fulfilled:", {
          playlistId,
        });
        state.deleteStatus = "succeeded";
        const beforeLength = state.playlists.length;
        state.playlists = state.playlists.filter((p) => p._id !== playlistId);
        console.log("[playlistSlice] Removed from playlists, length:", {
          before: beforeLength,
          after: state.playlists.length,
        });
        if (state.currentPlaylist?._id === playlistId) {
          state.currentPlaylist = null;
          console.log("[playlistSlice] Cleared current playlist");
        }
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(deletePlaylist.rejected, (state, action) => {
        console.error(
          "[playlistSlice] deletePlaylist.rejected:",
          action.payload
        );
        state.deleteStatus = "failed";
        state.error = action.payload;
      })

      // Reorder Playlist Posts
      .addCase(reorderPlaylistPosts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(reorderPlaylistPosts.fulfilled, (state, action) => {
        const updatedPlaylist = action.payload;
        console.log("[playlistSlice] reorderPlaylistPosts.fulfilled:", {
          playlistId: updatedPlaylist?._id,
        });
        if (!updatedPlaylist?._id) return;
        const index = state.playlists.findIndex(
          (p) => p._id === updatedPlaylist._id
        );
        if (index !== -1)
          state.playlists[index] = {
            ...state.playlists[index],
            ...updatedPlaylist,
          };
        if (state.currentPlaylist?._id === updatedPlaylist._id) {
          state.currentPlaylist = {
            ...state.currentPlaylist,
            ...updatedPlaylist,
          };
        }
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(reorderPlaylistPosts.rejected, (state, action) => {
        console.error(
          "[playlistSlice] reorderPlaylistPosts.rejected:",
          action.payload
        );
        state.error = action.payload;
        state.status = "failed";
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
