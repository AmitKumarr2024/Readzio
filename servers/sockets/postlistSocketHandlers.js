// servers/sockets/postlistSocketHandlers.js

/**
 * postlist Socket Event Handlers
 * These functions emit real-time events to connected clients
 * Call these from your postlist controller after database operations
 */

import { io } from "./socket.js"; // Import your socket instance

/**
 * Emit postlist created event to relevant users
 * @param {Object} postlist - The created postlist object
 * @param {String} userId - ID of user who created the postlist
 */
export const emitpostlistCreated = (postlist, userId) => {
  try {
    if (!postlist || !postlist._id) {
      console.warn("[postlistSocket] Invalid postlist for creation event");
      return;
    }

    console.log(
      `[postlistSocket] 🆕 Emitting postlistCreated: ${postlist._id}`
    );

    // Emit to the creator's room
    io.to(userId.toString()).emit("postlistCreated", {
      postlist,
      userId: userId.toString(),
      timestamp: Date.now(),
    });

    // If postlist is public, broadcast to all users
    if (!postlist.isPrivate) {
      io.emit("postlistCreated", {
        postlist,
        userId: userId.toString(),
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postlistCreated:",
      error.message
    );
  }
};

/**
 * Emit postlist updated event
 * @param {Object} postlist - The updated postlist object
 * @param {String} userId - ID of user who updated the postlist
 */
export const emitpostlistUpdated = (postlist, userId) => {
  try {
    if (!postlist || !postlist._id) {
      console.warn("[postlistSocket] Invalid postlist for update event");
      return;
    }

    console.log(
      `[postlistSocket] ✏️ Emitting postlistUpdated: ${postlist._id}`
    );

    const eventData = {
      postlist,
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postlistUpdated", eventData);

    // If postlist is public or was changed to public, broadcast
    if (!postlist.isPrivate) {
      io.emit("postlistUpdated", eventData);
    }
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postlistUpdated:",
      error.message
    );
  }
};

/**
 * Emit postlist deleted event
 * @param {String} postlistId - ID of deleted postlist
 * @param {String} userId - ID of user who deleted the postlist
 * @param {Boolean} wasPrivate - Whether postlist was private
 */
export const emitpostlistDeleted = (postlistId, userId, wasPrivate = true) => {
  try {
    if (!postlistId) {
      console.warn("[postlistSocket] Invalid postlist ID for deletion event");
      return;
    }

    console.log(`[postlistSocket] 🗑️ Emitting postlistDeleted: ${postlistId}`);

    const eventData = {
      postlistId: postlistId.toString(),
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postlistDeleted", eventData);

    // If postlist was public, broadcast to all
    if (!wasPrivate) {
      io.emit("postlistDeleted", eventData);
    }
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postlistDeleted:",
      error.message
    );
  }
};

/**
 * Emit post added to postlist event
 * @param {String} postlistId - ID of the postlist
 * @param {Object} post - The post object that was added
 * @param {String} userId - ID of user who added the post
 * @param {Boolean} isPrivate - Whether postlist is private
 */
export const emitPostAddedTopostlist = (
  postlistId,
  post,
  userId,
  isPrivate = true
) => {
  try {
    if (!postlistId || !post || !post._id) {
      console.warn("[postlistSocket] Invalid data for post added event");
      return;
    }

    console.log(
      `[postlistSocket] ➕ Emitting postAddedTopostlist: ${postlistId}`
    );

    const eventData = {
      postlistId: postlistId.toString(),
      post,
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postAddedTopostlist", eventData);

    // If postlist is public, broadcast to all
    if (!isPrivate) {
      io.emit("postAddedTopostlist", eventData);
    }
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postAddedTopostlist:",
      error.message
    );
  }
};

/**
 * Emit post removed from postlist event
 * @param {String} postlistId - ID of the postlist
 * @param {String} postId - ID of the post that was removed
 * @param {String} userId - ID of user who removed the post
 * @param {Boolean} isPrivate - Whether postlist is private
 */
export const emitPostRemovedFrompostlist = (
  postlistId,
  postId,
  userId,
  isPrivate = true
) => {
  try {
    if (!postlistId || !postId) {
      console.warn("[postlistSocket] Invalid data for post removed event");
      return;
    }

    console.log(
      `[postlistSocket] ➖ Emitting postRemovedFrompostlist: ${postlistId}`
    );

    const eventData = {
      postlistId: postlistId.toString(),
      postId: postId.toString(),
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postRemovedFrompostlist", eventData);

    // If postlist is public, broadcast to all
    if (!isPrivate) {
      io.emit("postRemovedFrompostlist", eventData);
    }
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postRemovedFrompostlist:",
      error.message
    );
  }
};

/**
 * Emit postlist posts reordered event
 * @param {Object} postlist - The postlist with reordered posts
 * @param {String} userId - ID of user who reordered the posts
 */
export const emitpostlistPostsReordered = (postlist, userId) => {
  try {
    if (!postlist || !postlist._id) {
      console.warn("[postlistSocket] Invalid postlist for reorder event");
      return;
    }

    console.log(
      `[postlistSocket] 🔄 Emitting postlistPostsReordered: ${postlist._id}`
    );

    const eventData = {
      postlist,
      userId: userId.toString(),
      timestamp: Date.now(),
    };

    // Emit to the owner's room
    io.to(userId.toString()).emit("postlistPostsReordered", eventData);

    // If postlist is public, broadcast to all
    if (!postlist.isPrivate) {
      io.emit("postlistPostsReordered", eventData);
    }
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postlistPostsReordered:",
      error.message
    );
  }
};

/**
 * Emit postlist error event to specific user
 * @param {String} userId - ID of user to notify
 * @param {String} message - Error message
 * @param {String} code - Error code
 */
export const emitpostlistError = (userId, message, code = "postlist_ERROR") => {
  try {
    if (!userId) {
      console.warn("[postlistSocket] No user ID for error event");
      return;
    }

    console.log(
      `[postlistSocket] ❌ Emitting postlistError to user: ${userId}`
    );

    io.to(userId.toString()).emit("postlistError", {
      message,
      code,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(
      "[postlistSocket] Error emitting postlistError:",
      error.message
    );
  }
};

/**
 * Setup client-side postlist event listeners in socket.js
 * Add these inside your io.on("connection", (socket) => { ... }) handler
 */
export const setuppostlistSocketEvents = (socket) => {
  /**
   * Client emits postlistCreated after creating a postlist
   */
  socket.on("postlistCreated", (data) => {
    try {
      const { postlist } = data;
      if (!socket.userId) return;

      console.log(`[postlistSocket] Client postlist created: ${postlist._id}`);

      // Re-emit to other clients
      emitpostlistCreated(postlist, socket.userId);
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling client postlistCreated:",
        error.message
      );
      emitpostlistError(
        socket.userId,
        "Failed to broadcast postlist creation",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits postlistUpdated after updating a postlist
   */
  socket.on("postlistUpdated", (data) => {
    try {
      const { postlist } = data;
      if (!socket.userId) return;

      console.log(`[postlistSocket] Client postlist updated: ${postlist._id}`);

      // Re-emit to other clients
      emitpostlistUpdated(postlist, socket.userId);
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling client postlistUpdated:",
        error.message
      );
      emitpostlistError(
        socket.userId,
        "Failed to broadcast postlist update",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits postlistDeleted after deleting a postlist
   */
  socket.on("postlistDeleted", (data) => {
    try {
      const { postlistId } = data;
      if (!socket.userId) return;

      console.log(`[postlistSocket] Client postlist deleted: ${postlistId}`);

      // Re-emit to other clients
      emitpostlistDeleted(postlistId, socket.userId);
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling client postlistDeleted:",
        error.message
      );
      emitpostlistError(
        socket.userId,
        "Failed to broadcast postlist deletion",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits postAddedTopostlist after adding a post
   */
  socket.on("postAddedTopostlist", (data) => {
    try {
      const { postlistId, post } = data;
      if (!socket.userId) return;

      console.log(`[postlistSocket] Client post added: ${postlistId}`);

      // Re-emit to other clients
      emitPostAddedTopostlist(postlistId, post, socket.userId);
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling client postAddedTopostlist:",
        error.message
      );
      emitpostlistError(
        socket.userId,
        "Failed to broadcast post addition",
        "BROADCAST_ERROR"
      );
    }
  });

  /**
   * Client emits postRemovedFrompostlist after removing a post
   */
  socket.on("postRemovedFrompostlist", (data) => {
    try {
      const { postlistId, postId } = data;
      if (!socket.userId) return;

      console.log(`[postlistSocket] Client post removed: ${postlistId}`);

      // Re-emit to other clients
      emitPostRemovedFrompostlist(postlistId, postId, socket.userId);
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling client postRemovedFrompostlist:",
        error.message
      );
      emitpostlistError(
        socket.userId,
        "Failed to broadcast post removal",
        "BROADCAST_ERROR"
      );
    }
  });
};
