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
      if (!userId) throw new Error("User ID is required");

      console.log(
        "[fetchUserPlaylists] Fetching playlists for userId:",
        userId
      );

      const response = await axiosInstance.get(`/playlists/user/${userId}`, {
        timeout: 30000,
        withCredentials: true,
      });

      console.log("[fetchUserPlaylists] Response status:", response.status);
      console.log("[fetchUserPlaylists] Response data:", response.data);

      // ✅ Extract the data array from response
      const result = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      console.log(
        "[fetchUserPlaylists] Parsed playlists count:",
        result.length
      );
      console.log("[fetchUserPlaylists] Playlists:", result);

      const privateCount = result.filter((p) => p.isPrivate).length;
      const publicCount = result.filter((p) => !p.isPrivate).length;
      console.log(
        `[fetchUserPlaylists] Private: ${privateCount}, Public: ${publicCount}`
      );

      return result;
    } catch (error) {
      console.error("[fetchUserPlaylists] Error:", error);
      console.error("[fetchUserPlaylists] Error response:", error.response);

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

      if (!response.data?.data) {
        throw new Error("No playlist data received");
      }

      return response.data.data;
    } catch (error) {
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

      const payload = {
        name: name.trim(),
        description: description?.trim() || "",
        isPrivate,
      };

      console.log("[createPlaylist] Creating playlist:", payload);

      const response = await axiosInstance.post("/playlists", payload, {
        timeout: 30000,
        withCredentials: true,
      });

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      console.log("[createPlaylist] Created playlist:", response.data.data);

      return response.data.data;
    } catch (error) {
      console.error("[createPlaylist] Error:", error);

      if (error.response?.status === 401) {
        return rejectWithValue("Authentication required");
      }
      if (error.response?.status === 400) {
        return rejectWithValue(
          error.response?.data?.message || "Invalid playlist data"
        );
      }
      if (error.response?.status === 409) {
        return rejectWithValue(
          error.response?.data?.message || "Playlist name already exists"
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

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
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

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
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

      if (!response.data?.data) {
        throw new Error("No data received from server");
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 403) {
        return rejectWithValue(
          "You don't have permission to update this playlist"
        );
      }
      if (error.response?.status === 404) {
        return rejectWithValue("Playlist not found");
      }
      if (error.response?.status === 409) {
        return rejectWithValue(
          error.response?.data?.message || "Playlist name already exists"
        );
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

      return {
        playlistId,
        message: response.data?.message || "Playlist deleted successfully",
      };
    } catch (error) {
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

const playlistSlice = createSlice({
  name: "playlist",
  initialState: {
    playlists: [],
    currentPlaylist: null,
    status: "idle",
    currentPlaylistStatus: "idle",
    createStatus: "idle",
    updateStatus: "idle",
    deleteStatus: "idle",
    error: null,
    currentPlaylistError: null,
    lastFetch: null,
    selectedPlaylistIds: [],
  },
  reducers: {
    clearPlaylists: (state) => {
      state.playlists = [];
      state.currentPlaylist = null;
      state.status = "idle";
      state.error = null;
      state.lastFetch = null;
    },

    clearCurrentPlaylist: (state) => {
      state.currentPlaylist = null;
      state.currentPlaylistStatus = "idle";
      state.currentPlaylistError = null;
    },

    resetStatus: (state) => {
      state.status = "idle";
      state.currentPlaylistStatus = "idle";
      state.createStatus = "idle";
      state.updateStatus = "idle";
      state.deleteStatus = "idle";
      state.error = null;
      state.currentPlaylistError = null;
    },

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

    // Socket event handlers
    handlePlaylistCreated: (state, action) => {
      const newPlaylist = action.payload;
      console.log("[handlePlaylistCreated] New playlist:", newPlaylist);

      if (!newPlaylist?._id) return;

      const exists = state.playlists.some((p) => p._id === newPlaylist._id);
      if (!exists) {
        state.playlists.unshift(newPlaylist);
        console.log(
          "[handlePlaylistCreated] Added to state. Total:",
          state.playlists.length
        );
      }
    },

    handlePlaylistUpdated: (state, action) => {
      const updatedPlaylist = action.payload;
      if (!updatedPlaylist?._id) return;

      const index = state.playlists.findIndex(
        (p) => p._id === updatedPlaylist._id
      );
      if (index !== -1) {
        state.playlists[index] = updatedPlaylist;
      }

      if (state.currentPlaylist?._id === updatedPlaylist._id) {
        state.currentPlaylist = updatedPlaylist;
      }
    },

    handlePlaylistDeleted: (state, action) => {
      const { playlistId } = action.payload;
      if (!playlistId) return;

      state.playlists = state.playlists.filter((p) => p._id !== playlistId);

      if (state.currentPlaylist?._id === playlistId) {
        state.currentPlaylist = null;
      }

      state.selectedPlaylistIds = state.selectedPlaylistIds.filter(
        (id) => id !== playlistId
      );
    },

    handlePostAddedToPlaylist: (state, action) => {
      const { playlistId, post } = action.payload;
      if (!playlistId || !post) return;

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
    },

    handlePostRemovedFromPlaylist: (state, action) => {
      const { playlistId, postId } = action.payload;
      if (!playlistId || !postId) return;

      const playlistIndex = state.playlists.findIndex(
        (p) => p._id === playlistId
      );
      if (playlistIndex !== -1 && state.playlists[playlistIndex].posts) {
        state.playlists[playlistIndex].posts = state.playlists[
          playlistIndex
        ].posts.filter((p) => p._id !== postId);
      }

      if (
        state.currentPlaylist?._id === playlistId &&
        state.currentPlaylist.posts
      ) {
        state.currentPlaylist.posts = state.currentPlaylist.posts.filter(
          (p) => p._id !== postId
        );
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Playlists
      .addCase(fetchUserPlaylists.pending, (state) => {
        console.log("[PlaylistSlice] fetchUserPlaylists.pending");
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserPlaylists.fulfilled, (state, action) => {
        console.log("[PlaylistSlice] fetchUserPlaylists.fulfilled");
        console.log(
          "[PlaylistSlice] Received playlists:",
          action.payload?.length
        );

        state.status = "succeeded";
        state.playlists = Array.isArray(action.payload) ? action.payload : [];

        const privateCount = state.playlists.filter((p) => p.isPrivate).length;
        const publicCount = state.playlists.filter((p) => !p.isPrivate).length;
        console.log(
          `[PlaylistSlice] State updated - Private: ${privateCount}, Public: ${publicCount}`
        );

        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUserPlaylists.rejected, (state, action) => {
        console.error(
          "[PlaylistSlice] fetchUserPlaylists.rejected:",
          action.payload
        );
        state.status = "failed";
        state.error = action.payload;
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
      })

      // Create Playlist
      .addCase(createPlaylist.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createPlaylist.fulfilled, (state, action) => {
        console.log(
          "[PlaylistSlice] createPlaylist.fulfilled:",
          action.payload
        );
        state.createStatus = "succeeded";

        if (action.payload && action.payload._id) {
          state.playlists.unshift(action.payload);
          console.log(
            "[PlaylistSlice] Playlist added to state. Total:",
            state.playlists.length
          );
        }
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(createPlaylist.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload;
      })

      // Add To Playlist
      .addCase(addToPlaylist.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addToPlaylist.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedPlaylist = action.payload;
        if (!updatedPlaylist?._id) return;

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
      .addCase(addToPlaylist.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Remove From Playlist
      .addCase(removeFromPlaylist.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(removeFromPlaylist.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedPlaylist = action.payload;
        if (!updatedPlaylist?._id) return;

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
      .addCase(removeFromPlaylist.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update Playlist
      .addCase(updatePlaylist.pending, (state) => {
        state.updateStatus = "loading";
        state.error = null;
      })
      .addCase(updatePlaylist.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const updatedPlaylist = action.payload;
        if (!updatedPlaylist?._id) return;

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
        state.lastFetch = new Date().toISOString();
      })
      .addCase(updatePlaylist.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.error = action.payload;
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
        state.lastFetch = new Date().toISOString();
      })
      .addCase(deletePlaylist.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.error = action.payload;
      })

      // Reorder Playlist Posts
      .addCase(reorderPlaylistPosts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(reorderPlaylistPosts.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedPlaylist = action.payload;
        if (!updatedPlaylist?._id) return;

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
      .addCase(reorderPlaylistPosts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
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
