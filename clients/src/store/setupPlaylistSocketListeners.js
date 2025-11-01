// clients/src/socket/setuppostlistSocketListeners.js

import {
  handlepostlistCreated,
  handlepostlistUpdated,
  handlepostlistDeleted,
  handlePostAddedTopostlist,
  handlePostRemovedFrompostlist,
} from "../store/postlistSlice";
import { debounce } from "lodash";

/**
 * Setup postlist-related socket event listeners
 * Call this function after socket connection is established
 *
 * @param {Socket} socket - Socket.IO client instance
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} getState - Redux getState function
 */
export const setuppostlistSocketListeners = (socket, dispatch, getState) => {
  if (!socket || !dispatch) {
    console.error("[setuppostlistSocketListeners] Invalid parameters");
    return;
  }

  // console.log("[postlistSocket] 🎵 Setting up postlist socket listeners...");

  // Remove existing listeners to prevent duplicates
  const postlistEvents = [
    "postlistCreated",
    "postlistUpdated",
    "postlistDeleted",
    "postAddedTopostlist",
    "postRemovedFrompostlist",
    "postlistPostsReordered",
  ];

  postlistEvents.forEach((event) => socket.off(event));

  // =========================================================================
  // DEBOUNCED HANDLERS (Prevent rapid-fire updates)
  // =========================================================================

  const debouncedpostlistUpdate = debounce((postlist) => {
    // console.log(
    //   "[postlistSocket] 🔵 Processing debounced postlist update:",
    //   postlist._id
    // );
    dispatch(handlepostlistUpdated(postlist));
  }, 500);

  const debouncedPostAdded = debounce((data) => {
    // console.log("[postlistSocket] 🔵 Processing debounced post added:", data);
    dispatch(handlePostAddedTopostlist(data));
  }, 500);

  const debouncedPostRemoved = debounce((data) => {
    // console.log("[postlistSocket] 🔵 Processing debounced post removed:", data);
    dispatch(handlePostRemovedFrompostlist(data));
  }, 500);

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================

  /**
   * Handle postlist creation events
   * Emitted when any user creates a new postlist
   */
  socket.on("postlistCreated", (data) => {
    try {
      const { postlist, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!postlist || !postlist._id) {
        console.warn("[postlistSocket] Invalid postlist data received");
        return;
      }

      // console.log("[postlistSocket] 🆕 postlist created:", {
      //   postlistId: postlist._id,
      //   name: postlist.name,
      //   createdBy: userId,
      //   isCurrentUser: userId === currentUserId,
      // });

      // Only add to state if it belongs to current user or is public
      if (userId === currentUserId || !postlist.isPrivate) {
        dispatch(handlepostlistCreated(postlist));
      }
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling postlistCreated:",
        error.message
      );
    }
  });

  /**
   * Handle postlist update events
   * Emitted when postlist details are modified (name, description, privacy)
   */
  socket.on("postlistUpdated", (data) => {
    try {
      const { postlist, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!postlist || !postlist._id) {
        console.warn("[postlistSocket] Invalid postlist data received");
        return;
      }

      // console.log("[postlistSocket] ✏️ postlist updated:", {
      //   postlistId: postlist._id,
      //   name: postlist.name,
      //   updatedBy: userId,
      //   isCurrentUser: userId === currentUserId,
      // });

      // Check if user has access to this postlist
      const hasAccess =
        userId === currentUserId ||
        !postlist.isPrivate ||
        postlist.user?.toString() === currentUserId;

      if (hasAccess) {
        debouncedpostlistUpdate(postlist);
      }
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling postlistUpdated:",
        error.message
      );
    }
  });

  /**
   * Handle postlist deletion events
   * Emitted when a postlist is permanently deleted
   */
  socket.on("postlistDeleted", (data) => {
    try {
      const { postlistId, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!postlistId) {
        console.warn("[postlistSocket] Invalid postlist ID received");
        return;
      }

      // console.log("[postlistSocket] 🗑️ postlist deleted:", {
      //   postlistId,
      //   deletedBy: userId,
      //   isCurrentUser: userId === currentUserId,
      // });

      dispatch(handlepostlistDeleted({ postlistId }));
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling postlistDeleted:",
        error.message
      );
    }
  });

  /**
   * Handle post added to postlist events
   * Emitted when a post is added to any postlist
   */
  socket.on("postAddedTopostlist", (data) => {
    try {
      const { postlistId, post, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!postlistId || !post || !post._id) {
        console.warn("[postlistSocket] Invalid post/postlist data received");
        return;
      }

      // console.log("[postlistSocket] ➕ Post added to postlist:", {
      //   postlistId,
      //   postId: post._id,
      //   postTitle: post.title,
      //   addedBy: userId,
      //   isCurrentUser: userId === currentUserId,
      // });

      // Check if current user has access to this postlist
      const postlists = getState().postlist.postlists;
      const targetpostlist = postlists.find((p) => p._id === postlistId);

      const hasAccess =
        userId === currentUserId ||
        targetpostlist ||
        getState().postlist.currentpostlist?._id === postlistId;

      if (hasAccess) {
        debouncedPostAdded({ postlistId, post });
      }
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling postAddedTopostlist:",
        error.message
      );
    }
  });

  /**
   * Handle post removed from postlist events
   * Emitted when a post is removed from any postlist
   */
  socket.on("postRemovedFrompostlist", (data) => {
    try {
      const { postlistId, postId, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!postlistId || !postId) {
        console.warn("[postlistSocket] Invalid post/postlist data received");
        return;
      }

      // console.log("[postlistSocket] ➖ Post removed from postlist:", {
      //   postlistId,
      //   postId,
      //   removedBy: userId,
      //   isCurrentUser: userId === currentUserId,
      // });

      // Check if current user has access to this postlist
      const postlists = getState().postlist.postlists;
      const targetpostlist = postlists.find((p) => p._id === postlistId);

      const hasAccess =
        userId === currentUserId ||
        targetpostlist ||
        getState().postlist.currentpostlist?._id === postlistId;

      if (hasAccess) {
        debouncedPostRemoved({ postlistId, postId });
      }
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling postRemovedFrompostlist:",
        error.message
      );
    }
  });

  /**
   * Handle postlist posts reordered events
   * Emitted when posts in a postlist are reordered
   */
  socket.on("postlistPostsReordered", (data) => {
    try {
      const { postlist, userId } = data;
      const currentUserId = getState().auth.user?._id?.toString();

      if (!postlist || !postlist._id) {
        console.warn("[postlistSocket] Invalid postlist data received");
        return;
      }

      // console.log("[postlistSocket] 🔄 postlist posts reordered:", {
      //   postlistId: postlist._id,
      //   postCount: postlist.posts?.length || 0,
      //   reorderedBy: userId,
      //   isCurrentUser: userId === currentUserId,
      // });

      // Check if user has access to this postlist
      const hasAccess =
        userId === currentUserId ||
        !postlist.isPrivate ||
        postlist.user?.toString() === currentUserId;

      if (hasAccess) {
        dispatch(handlepostlistUpdated(postlist));
      }
    } catch (error) {
      console.error(
        "[postlistSocket] Error handling postlistPostsReordered:",
        error.message
      );
    }
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  socket.on("postlistError", (error) => {
    console.error("[postlistSocket] ❌ Server error:", {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
  });

  // console.log("[postlistSocket] ✅ postlist socket listeners configured");
};

/**
 * Cleanup function to remove all postlist socket listeners
 * Call this when component unmounts or socket disconnects
 *
 * @param {Socket} socket - Socket.IO client instance
 */
export const cleanuppostlistSocketListeners = (socket) => {
  if (!socket) {
    console.warn("[cleanuppostlistSocketListeners] No socket provided");
    return;
  }

  // console.log("[postlistSocket] 🧹 Cleaning up postlist socket listeners...");

  const postlistEvents = [
    "postlistCreated",
    "postlistUpdated",
    "postlistDeleted",
    "postAddedTopostlist",
    "postRemovedFrompostlist",
    "postlistPostsReordered",
    "postlistError",
  ];

  postlistEvents.forEach((event) => {
    socket.off(event);
  });

  // console.log("[postlistSocket] ✅ postlist socket listeners cleaned up");
};

/**
 * Emit postlist events to server (for other clients to receive)
 * These are helper functions to emit events from client side
 */

export const emitpostlistCreated = (socket, postlist) => {
  if (!socket || !postlist) return;
  socket.emit("postlistCreated", { postlist, timestamp: Date.now() });
  // console.log("[postlistSocket] 📤 Emitted postlistCreated");
};

export const emitpostlistUpdated = (socket, postlist) => {
  if (!socket || !postlist) return;
  socket.emit("postlistUpdated", { postlist, timestamp: Date.now() });
  // console.log("[postlistSocket] 📤 Emitted postlistUpdated");
};

export const emitpostlistDeleted = (socket, postlistId) => {
  if (!socket || !postlistId) return;
  socket.emit("postlistDeleted", { postlistId, timestamp: Date.now() });
  // console.log("[postlistSocket] 📤 Emitted postlistDeleted");
};

export const emitPostAddedTopostlist = (socket, postlistId, post) => {
  if (!socket || !postlistId || !post) return;
  socket.emit("postAddedTopostlist", {
    postlistId,
    post,
    timestamp: Date.now(),
  });
  // console.log("[postlistSocket] 📤 Emitted postAddedTopostlist");
};

export const emitPostRemovedFrompostlist = (socket, postlistId, postId) => {
  if (!socket || !postlistId || !postId) return;
  socket.emit("postRemovedFrompostlist", {
    postlistId,
    postId,
    timestamp: Date.now(),
  });
  // console.log("[postlistSocket] 📤 Emitted postRemovedFrompostlist");
};
