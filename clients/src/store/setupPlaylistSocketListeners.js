// clients/src/socket/setupPlaylistSocketListeners.js

import {
  handlePlaylistCreated,
  handlePlaylistUpdated,
  handlePlaylistDeleted,
  handlePostAddedToPlaylist,
  handlePostRemovedFromPlaylist,
} from "../store/playlistSlice";
import { debounce } from "lodash";

/**
 * Setup playlist-related socket event listeners
 * Call this function after socket connection is established
 *
 * @param {Socket} socket - Socket.IO client instance
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} getState - Redux getState function
 */
export const setupPlaylistSocketListeners = (socket, dispatch, getState) => {
  if (!socket || !dispatch) {
    console.error("[setupPlaylistSocketListeners] Invalid parameters");
    return;
  }

  console.log("[PlaylistSocket] 🎵 Setting up playlist socket listeners...");

  // Remove existing listeners to prevent duplicates
  const playlistEvents = [
    "playlistCreated",
    "playlistUpdated",
    "playlistDeleted",
    "postAddedToPlaylist",
    "postRemovedFromPlaylist",
    "playlistPostsReordered",
  ];

  playlistEvents.forEach((event) => socket.off(event));

  // =========================================================================
  // DEBOUNCED HANDLERS (Prevent rapid-fire updates)
  // =========================================================================

  const debouncedPlaylistUpdate = debounce((playlist) => {
    console.log(
      "[PlaylistSocket] 🔵 Processing debounced playlist update:",
      playlist._id
    );
    dispatch(handlePlaylistUpdated(playlist));
  }, 500);

  const debouncedPostAdded = debounce((data) => {
    console.log("[PlaylistSocket] 🔵 Processing debounced post added:", data);
    dispatch(handlePostAddedToPlaylist(data));
  }, 500);

  const debouncedPostRemoved = debounce((data) => {
    console.log("[PlaylistSocket] 🔵 Processing debounced post removed:", data);
    dispatch(handlePostRemovedFromPlaylist(data));
  }, 500);

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================

  /**
   * Handle playlist creation events
   * Emitted when any user creates a new playlist
   */
  socket.on("playlistCreated", (data) => {
    try {
      const { playlist, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!playlist || !playlist._id) {
        console.warn("[PlaylistSocket] Invalid playlist data received");
        return;
      }

      console.log("[PlaylistSocket] 🆕 Playlist created:", {
        playlistId: playlist._id,
        name: playlist.name,
        createdBy: userId,
        isCurrentUser: userId === currentUserId,
      });

      // Only add to state if it belongs to current user or is public
      if (userId === currentUserId || !playlist.isPrivate) {
        dispatch(handlePlaylistCreated(playlist));
      }
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling playlistCreated:",
        error.message
      );
    }
  });

  /**
   * Handle playlist update events
   * Emitted when playlist details are modified (name, description, privacy)
   */
  socket.on("playlistUpdated", (data) => {
    try {
      const { playlist, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!playlist || !playlist._id) {
        console.warn("[PlaylistSocket] Invalid playlist data received");
        return;
      }

      console.log("[PlaylistSocket] ✏️ Playlist updated:", {
        playlistId: playlist._id,
        name: playlist.name,
        updatedBy: userId,
        isCurrentUser: userId === currentUserId,
      });

      // Check if user has access to this playlist
      const hasAccess =
        userId === currentUserId ||
        !playlist.isPrivate ||
        playlist.user?.toString() === currentUserId;

      if (hasAccess) {
        debouncedPlaylistUpdate(playlist);
      }
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling playlistUpdated:",
        error.message
      );
    }
  });

  /**
   * Handle playlist deletion events
   * Emitted when a playlist is permanently deleted
   */
  socket.on("playlistDeleted", (data) => {
    try {
      const { playlistId, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!playlistId) {
        console.warn("[PlaylistSocket] Invalid playlist ID received");
        return;
      }

      console.log("[PlaylistSocket] 🗑️ Playlist deleted:", {
        playlistId,
        deletedBy: userId,
        isCurrentUser: userId === currentUserId,
      });

      dispatch(handlePlaylistDeleted({ playlistId }));
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling playlistDeleted:",
        error.message
      );
    }
  });

  /**
   * Handle post added to playlist events
   * Emitted when a post is added to any playlist
   */
  socket.on("postAddedToPlaylist", (data) => {
    try {
      const { playlistId, post, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!playlistId || !post || !post._id) {
        console.warn("[PlaylistSocket] Invalid post/playlist data received");
        return;
      }

      console.log("[PlaylistSocket] ➕ Post added to playlist:", {
        playlistId,
        postId: post._id,
        postTitle: post.title,
        addedBy: userId,
        isCurrentUser: userId === currentUserId,
      });

      // Check if current user has access to this playlist
      const playlists = getState().playlist.playlists;
      const targetPlaylist = playlists.find((p) => p._id === playlistId);

      const hasAccess =
        userId === currentUserId ||
        targetPlaylist ||
        getState().playlist.currentPlaylist?._id === playlistId;

      if (hasAccess) {
        debouncedPostAdded({ playlistId, post });
      }
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling postAddedToPlaylist:",
        error.message
      );
    }
  });

  /**
   * Handle post removed from playlist events
   * Emitted when a post is removed from any playlist
   */
  socket.on("postRemovedFromPlaylist", (data) => {
    try {
      const { playlistId, postId, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!playlistId || !postId) {
        console.warn("[PlaylistSocket] Invalid post/playlist data received");
        return;
      }

      console.log("[PlaylistSocket] ➖ Post removed from playlist:", {
        playlistId,
        postId,
        removedBy: userId,
        isCurrentUser: userId === currentUserId,
      });

      // Check if current user has access to this playlist
      const playlists = getState().playlist.playlists;
      const targetPlaylist = playlists.find((p) => p._id === playlistId);

      const hasAccess =
        userId === currentUserId ||
        targetPlaylist ||
        getState().playlist.currentPlaylist?._id === playlistId;

      if (hasAccess) {
        debouncedPostRemoved({ playlistId, postId });
      }
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling postRemovedFromPlaylist:",
        error.message
      );
    }
  });

  /**
   * Handle playlist posts reordered events
   * Emitted when posts in a playlist are reordered
   */
  socket.on("playlistPostsReordered", (data) => {
    try {
      const { playlist, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!playlist || !playlist._id) {
        console.warn("[PlaylistSocket] Invalid playlist data received");
        return;
      }

      console.log("[PlaylistSocket] 🔄 Playlist posts reordered:", {
        playlistId: playlist._id,
        postCount: playlist.posts?.length || 0,
        reorderedBy: userId,
        isCurrentUser: userId === currentUserId,
      });

      // Check if user has access to this playlist
      const hasAccess =
        userId === currentUserId ||
        !playlist.isPrivate ||
        playlist.user?.toString() === currentUserId;

      if (hasAccess) {
        dispatch(handlePlaylistUpdated(playlist));
      }
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling playlistPostsReordered:",
        error.message
      );
    }
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  socket.on("playlistError", (error) => {
    console.error("[PlaylistSocket] ❌ Server error:", {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[PlaylistSocket] ✅ Playlist socket listeners configured");
};

/**
 * Cleanup function to remove all playlist socket listeners
 * Call this when component unmounts or socket disconnects
 *
 * @param {Socket} socket - Socket.IO client instance
 */
export const cleanupPlaylistSocketListeners = (socket) => {
  if (!socket) {
    console.warn("[cleanupPlaylistSocketListeners] No socket provided");
    return;
  }

  console.log("[PlaylistSocket] 🧹 Cleaning up playlist socket listeners...");

  const playlistEvents = [
    "playlistCreated",
    "playlistUpdated",
    "playlistDeleted",
    "postAddedToPlaylist",
    "postRemovedFromPlaylist",
    "playlistPostsReordered",
    "playlistError",
  ];

  playlistEvents.forEach((event) => {
    socket.off(event);
  });

  console.log("[PlaylistSocket] ✅ Playlist socket listeners cleaned up");
};

/**
 * Emit playlist events to server (for other clients to receive)
 * These are helper functions to emit events from client side
 */

export const emitPlaylistCreated = (socket, playlist) => {
  if (!socket || !playlist) return;
  socket.emit("playlistCreated", { playlist, timestamp: Date.now() });
  console.log("[PlaylistSocket] 📤 Emitted playlistCreated");
};

export const emitPlaylistUpdated = (socket, playlist) => {
  if (!socket || !playlist) return;
  socket.emit("playlistUpdated", { playlist, timestamp: Date.now() });
  console.log("[PlaylistSocket] 📤 Emitted playlistUpdated");
};

export const emitPlaylistDeleted = (socket, playlistId) => {
  if (!socket || !playlistId) return;
  socket.emit("playlistDeleted", { playlistId, timestamp: Date.now() });
  console.log("[PlaylistSocket] 📤 Emitted playlistDeleted");
};

export const emitPostAddedToPlaylist = (socket, playlistId, post) => {
  if (!socket || !playlistId || !post) return;
  socket.emit("postAddedToPlaylist", {
    playlistId,
    post,
    timestamp: Date.now(),
  });
  console.log("[PlaylistSocket] 📤 Emitted postAddedToPlaylist");
};

export const emitPostRemovedFromPlaylist = (socket, playlistId, postId) => {
  if (!socket || !playlistId || !postId) return;
  socket.emit("postRemovedFromPlaylist", {
    playlistId,
    postId,
    timestamp: Date.now(),
  });
  console.log("[PlaylistSocket] 📤 Emitted postRemovedFromPlaylist");
};
