// servers/sockets/playlistSocketHandlers.js

/**
 * Playlist Socket Event Handlers
 * These functions emit real-time events to connected clients
 * Call these from your playlist controller after database operations
 */

import { io } from "./socket.js"; // Import your socket instance

/**
 * Emit playlist created event to relevant users
 * @param {Object} playlist - The created playlist object
 * @param {String} userId - ID of user who created the playlist
 */
export const emitPlaylistCreated = (playlist, userId) => {
  try {
    if (!playlist || !playlist._id) {
      console.warn("[PlaylistSocket] Invalid playlist for creation event");
      return;
    }

    console.log(
      `[PlaylistSocket] 🆕 Emitting playlistCreated: ${playlist._id}`
    );

    // Emit to the creator's room
    io.to(userId.toString()).emit("playlistCreated", {
      playlist,
      userId: userId.toString(),
      timestamp: Date.now(),
    });

    // If playlist is public, broadcast to all users
    if (!playlist.isPrivate) {
      io.emit("playlistCreated", {
        playlist,
        userId: userId.toString(),
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting playlistCreated:",
      error.message
    );
  }
};

/**
 * Emit playlist updated event
 * @param {Object} playlist - The updated playlist object
 * @param {String} userId - ID of user who updated the playlist
 */
export const emitPlaylistUpdated = (playlist, userId) => {
  try {
    if (!playlist || !playlist._id) {
      console.warn("[PlaylistSocket] Invalid playlist for update event");
      return;
    }

    console.log(
      `[PlaylistSocket] ✏️ Emitting playlistUpdated: ${playlist._id}`
    );

    const eventData = {
      playlist,
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("playlistUpdated", eventData);

    // If playlist is public or was changed to public, broadcast
    if (!playlist.isPrivate) {
      io.emit("playlistUpdated", eventData);
    }
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting playlistUpdated:",
      error.message
    );
  }
};

/**
 * Emit playlist deleted event
 * @param {String} playlistId - ID of deleted playlist
 * @param {String} userId - ID of user who deleted the playlist
 * @param {Boolean} wasPrivate - Whether playlist was private
 */
export const emitPlaylistDeleted = (playlistId, userId, wasPrivate = true) => {
  try {
    if (!playlistId) {
      console.warn("[PlaylistSocket] Invalid playlist ID for deletion event");
      return;
    }

    console.log(`[PlaylistSocket] 🗑️ Emitting playlistDeleted: ${playlistId}`);

    const eventData = {
      playlistId: playlistId.toString(),
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("playlistDeleted", eventData);

    // If playlist was public, broadcast to all
    if (!wasPrivate) {
      io.emit("playlistDeleted", eventData);
    }
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting playlistDeleted:",
      error.message
    );
  }
};

/**
 * Emit post added to playlist event
 * @param {String} playlistId - ID of the playlist
 * @param {Object} post - The post object that was added
 * @param {String} userId - ID of user who added the post
 * @param {Boolean} isPrivate - Whether playlist is private
 */
export const emitPostAddedToPlaylist = (
  playlistId,
  post,
  userId,
  isPrivate = true
) => {
  try {
    if (!playlistId || !post || !post._id) {
      console.warn("[PlaylistSocket] Invalid data for post added event");
      return;
    }

    console.log(
      `[PlaylistSocket] ➕ Emitting postAddedToPlaylist: ${playlistId}`
    );

    const eventData = {
      playlistId: playlistId.toString(),
      post,
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postAddedToPlaylist", eventData);

    // If playlist is public, broadcast to all
    if (!isPrivate) {
      io.emit("postAddedToPlaylist", eventData);
    }
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting postAddedToPlaylist:",
      error.message
    );
  }
};

/**
 * Emit post removed from playlist event
 * @param {String} playlistId - ID of the playlist
 * @param {String} postId - ID of the post that was removed
 * @param {String} userId - ID of user who removed the post
 * @param {Boolean} isPrivate - Whether playlist is private
 */
export const emitPostRemovedFromPlaylist = (
  playlistId,
  postId,
  userId,
  isPrivate = true
) => {
  try {
    if (!playlistId || !postId) {
      console.warn("[PlaylistSocket] Invalid data for post removed event");
      return;
    }

    console.log(
      `[PlaylistSocket] ➖ Emitting postRemovedFromPlaylist: ${playlistId}`
    );

    const eventData = {
      playlistId: playlistId.toString(),
      postId: postId.toString(),
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postRemovedFromPlaylist", eventData);

    // If playlist is public, broadcast to all
    if (!isPrivate) {
      io.emit("postRemovedFromPlaylist", eventData);
    }
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting postRemovedFromPlaylist:",
      error.message
    );
  }
};

/**
 * Emit playlist posts reordered event
 * @param {Object} playlist - The playlist with reordered posts
 * @param {String} userId - ID of user who reordered the posts
 */
export const emitPlaylistPostsReordered = (playlist, userId) => {
  try {
    if (!playlist || !playlist._id) {
      console.warn("[PlaylistSocket] Invalid playlist for reorder event");
      return;
    }

    console.log(
      `[PlaylistSocket] 🔄 Emitting playlistPostsReordered: ${playlist._id}`
    );

    const eventData = {
      playlist,
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("playlistPostsReordered", eventData);

    // If playlist is public, broadcast to all
    if (!playlist.isPrivate) {
      io.emit("playlistPostsReordered", eventData);
    }
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting playlistPostsReordered:",
      error.message
    );
  }
};

/**
 * Emit playlist error event to specific user
 * @param {String} userId - ID of user to notify
 * @param {String} message - Error message
 * @param {String} code - Error code
 */
export const emitPlaylistError = (userId, message, code = "PLAYLIST_ERROR") => {
  try {
    if (!userId) {
      console.warn("[PlaylistSocket] No user ID for error event");
      return;
    }

    console.log(
      `[PlaylistSocket] ❌ Emitting playlistError to user: ${userId}`
    );

    io.to(userId.toString()).emit("playlistError", {
      message,
      code,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(
      "[PlaylistSocket] Error emitting playlistError:",
      error.message
    );
  }
};

/**
 * Setup client-side playlist event listeners in socket.js
 * Add these inside your io.on("connection", (socket) => { ... }) handler
 */
export const setupPlaylistSocketEvents = (socket) => {
  /**
   * Client emits playlistCreated after creating a playlist
   */
  socket.on("playlistCreated", (data) => {
    try {
      const { playlist } = data;
      if (!socket.userId) return;

      console.log(`[PlaylistSocket] Client playlist created: ${playlist._id}`);

      // Re-emit to other clients
      emitPlaylistCreated(playlist, socket.userId);
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling client playlistCreated:",
        error.message
      );
      emitPlaylistError(
        socket.userId,
        "Failed to broadcast playlist creation",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits playlistUpdated after updating a playlist
   */
  socket.on("playlistUpdated", (data) => {
    try {
      const { playlist } = data;
      if (!socket.userId) return;

      console.log(`[PlaylistSocket] Client playlist updated: ${playlist._id}`);

      // Re-emit to other clients
      emitPlaylistUpdated(playlist, socket.userId);
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling client playlistUpdated:",
        error.message
      );
      emitPlaylistError(
        socket.userId,
        "Failed to broadcast playlist update",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits playlistDeleted after deleting a playlist
   */
  socket.on("playlistDeleted", (data) => {
    try {
      const { playlistId } = data;
      if (!socket.userId) return;

      console.log(`[PlaylistSocket] Client playlist deleted: ${playlistId}`);

      // Re-emit to other clients
      emitPlaylistDeleted(playlistId, socket.userId);
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling client playlistDeleted:",
        error.message
      );
      emitPlaylistError(
        socket.userId,
        "Failed to broadcast playlist deletion",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits postAddedToPlaylist after adding a post
   */
  socket.on("postAddedToPlaylist", (data) => {
    try {
      const { playlistId, post } = data;
      if (!socket.userId) return;

      console.log(`[PlaylistSocket] Client post added: ${playlistId}`);

      // Re-emit to other clients
      emitPostAddedToPlaylist(playlistId, post, socket.userId);
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling client postAddedToPlaylist:",
        error.message
      );
      emitPlaylistError(
        socket.userId,
        "Failed to broadcast post addition",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits postRemovedFromPlaylist after removing a post
   */
  socket.on("postRemovedFromPlaylist", (data) => {
    try {
      const { playlistId, postId } = data;
      if (!socket.userId) return;

      console.log(`[PlaylistSocket] Client post removed: ${playlistId}`);

      // Re-emit to other clients
      emitPostRemovedFromPlaylist(playlistId, postId, socket.userId);
    } catch (error) {
      console.error(
        "[PlaylistSocket] Error handling client postRemovedFromPlaylist:",
        error.message
      );
      emitPlaylistError(
        socket.userId,
        "Failed to broadcast post removal",
        "BROADCAST_ERROR"
      );
    }
  });
};
