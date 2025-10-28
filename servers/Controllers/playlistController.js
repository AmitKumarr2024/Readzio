// servers/controllers/playlistController.js

import Playlist from "../../servers/Models/PlaylistModel.js";
import Post from "../../servers/Models/Post.js";
import {AppError} from "../../servers/Utils/AppError.js";
import {
  emitPlaylistCreated,
  emitPlaylistUpdated,
  emitPlaylistDeleted,
  emitPostAddedToPlaylist,
  emitPostRemovedFromPlaylist,
  emitPlaylistPostsReordered,
  emitPlaylistError,
} from "../../servers/sockets/playlistSocketHandlers.js";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const validatePlaylistName = (name) => {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new AppError("Playlist name is required", 400);
  }
  if (name.length > 100) {
    throw new AppError("Playlist name must be less than 100 characters", 400);
  }
  return name.trim();
};

const validatePlaylistOwnership = (playlist, userId) => {
  if (!playlist.user.equals(userId)) {
    throw new AppError(
      "You don't have permission to modify this playlist",
      403
    );
  }
};

const validatePlaylistAccess = (playlist, userId) => {
  if (playlist.isPrivate && !playlist.user.equals(userId)) {
    throw new AppError("This playlist is private", 403);
  }
};

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @desc    Create a new playlist
 * @route   POST /api/playlists
 * @access  Private
 */
export const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = req.user._id;

    // Validate input
    const validatedName = validatePlaylistName(name);

    // Check for duplicate playlist names for this user
    const existingPlaylist = await Playlist.findOne({
      user: userId,
      name: validatedName,
    });

    if (existingPlaylist) {
      return next(
        new AppError("You already have a playlist with this name", 409)
      );
    }

    // Create playlist
    const playlist = await Playlist.create({
      user: userId,
      name: validatedName,
      description: description?.trim() || "",
      isPrivate: isPrivate === true,
      posts: [],
    });

    // Populate user info
    await playlist.populate("user", "name email avatar");

    console.log(
      `[PlaylistController] 🆕 Playlist created: ${playlist._id} by ${userId}`
    );

    // Emit socket event
    emitPlaylistCreated(playlist.toObject(), userId);

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("[PlaylistController] Create playlist error:", error.message);

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "CREATE_ERROR");
    }

    next(error);
  }
};

/**
 * @desc    Delete a playlist
 * @route   DELETE /api/playlists/:id
 * @access  Private
 */
export const deletePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user._id;

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check ownership
    validatePlaylistOwnership(playlist, userId);

    // Store isPrivate before deletion for socket emission
    const wasPrivate = playlist.isPrivate;

    // Delete playlist
    await Playlist.findByIdAndDelete(playlistId);

    console.log(`[PlaylistController] 🗑️ Playlist ${playlistId} deleted`);

    // Emit socket event
    emitPlaylistDeleted(playlistId, userId, wasPrivate);

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    console.error("[PlaylistController] Delete playlist error:", error.message);

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "DELETE_ERROR");
    }

    next(error);
  }
};

/**
 * @desc    Reorder posts in a playlist
 * @route   PATCH /api/playlists/:id/reorder
 * @access  Private
 */
export const reorderPlaylistPosts = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user._id;
    const { postIds } = req.body;

    // Validate input
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return next(new AppError("Invalid post IDs array", 400));
    }

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check ownership
    validatePlaylistOwnership(playlist, userId);

    // Validate all postIds exist in the playlist
    const currentPostIds = playlist.posts.map((p) => p.toString());
    const allPostsValid = postIds.every((id) =>
      currentPostIds.includes(id.toString())
    );

    if (!allPostsValid) {
      return next(new AppError("Some post IDs are not in this playlist", 400));
    }

    // Check if all posts are included
    if (postIds.length !== currentPostIds.length) {
      return next(new AppError("All posts must be included in reorder", 400));
    }

    // Reorder posts
    playlist.posts = postIds;
    await playlist.save();

    // Populate for response
    await playlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    console.log(
      `[PlaylistController] 🔄 Playlist ${playlistId} posts reordered`
    );

    // Emit socket event
    emitPlaylistPostsReordered(playlist.toObject(), userId);

    res.status(200).json({
      success: true,
      message: "Playlist posts reordered successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("[PlaylistController] Reorder posts error:", error.message);

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "REORDER_ERROR");
    }

    next(error);
  }
};

/**
 * @desc    Get playlist statistics for a user
 * @route   GET /api/playlists/user/:userId/stats
 * @access  Public
 */
export const getPlaylistStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?._id;

    // Build query
    const query = { user: userId };

    // If not requesting own stats, only count public playlists
    if (!requestingUserId || !requestingUserId.equals(userId)) {
      query.isPrivate = false;
    }

    // Get statistics
    const [totalPlaylists, playlists] = await Promise.all([
      Playlist.countDocuments(query),
      Playlist.find(query).select("posts"),
    ]);

    const totalPosts = playlists.reduce(
      (sum, playlist) => sum + playlist.posts.length,
      0
    );

    const averagePostsPerPlaylist =
      totalPlaylists > 0 ? Math.round(totalPosts / totalPlaylists) : 0;

    console.log(`[PlaylistController] 📊 Fetched stats for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        totalPlaylists,
        totalPosts,
        averagePostsPerPlaylist,
      },
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Get playlist stats error:",
      error.message
    );
    next(error);
  }
};

/**
 * @desc    Search playlists by name or description
 * @route   GET /api/playlists/search
 * @access  Public (only searches public playlists)
 */
export const searchPlaylists = async (req, res, next) => {
  try {
    const { query, limit = 20, page = 1 } = req.query;

    if (!query || query.trim().length === 0) {
      return next(new AppError("Search query is required", 400));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search in public playlists only
    const searchQuery = {
      isPrivate: false,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };

    const [playlists, total] = await Promise.all([
      Playlist.find(searchQuery)
        .populate("user", "name avatar")
        .populate({
          path: "posts",
          select: "title coverImage",
          options: { limit: 3 }, // Only show first 3 posts
        })
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 }),
      Playlist.countDocuments(searchQuery),
    ]);

    console.log(
      `[PlaylistController] 🔍 Search results: ${playlists.length} playlists`
    );

    res.status(200).json({
      success: true,
      count: playlists.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: playlists,
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Search playlists error:",
      error.message
    );
    next(error);
  }
};

/**
 * @desc    Check if a post is in any of user's playlists
 * @route   GET /api/playlists/check/:postId
 * @access  Private
 */
export const checkPostInPlaylists = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const playlists = await Playlist.find({
      user: userId,
      posts: postId,
    }).select("_id name");

    console.log(
      `[PlaylistController] ✅ Post ${postId} found in ${playlists.length} playlists`
    );

    res.status(200).json({
      success: true,
      inPlaylists: playlists.length > 0,
      playlists,
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Check post in playlists error:",
      error.message
    );
    next(error);
  }
};

/**
 * @desc    Bulk add posts to a playlist
 * @route   POST /api/playlists/:id/bulk-add
 * @access  Private
 */
export const bulkAddToPlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user._id;
    const { postIds } = req.body;

    // Validate input
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return next(new AppError("Post IDs array is required", 400));
    }

    if (postIds.length > 50) {
      return next(new AppError("Cannot add more than 50 posts at once", 400));
    }

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check ownership
    validatePlaylistOwnership(playlist, userId);

    // Verify all posts exist
    const posts = await Post.find({ _id: { $in: postIds } });
    if (posts.length !== postIds.length) {
      return next(new AppError("Some posts were not found", 404));
    }

    // Add only new posts
    const existingPostIds = new Set(playlist.posts.map((p) => p.toString()));
    const newPostIds = postIds.filter(
      (id) => !existingPostIds.has(id.toString())
    );

    if (newPostIds.length === 0) {
      return next(new AppError("All posts already exist in playlist", 409));
    }

    playlist.posts.push(...newPostIds);
    await playlist.save();

    // Populate for response
    await playlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    console.log(
      `[PlaylistController] ➕➕ Bulk added ${newPostIds.length} posts to playlist ${playlistId}`
    );

    // Emit socket event for each added post
    posts.forEach((post) => {
      if (newPostIds.includes(post._id.toString())) {
        emitPostAddedToPlaylist(
          playlistId,
          post.toObject(),
          userId,
          playlist.isPrivate
        );
      }
    });

    res.status(200).json({
      success: true,
      message: `${newPostIds.length} posts added to playlist successfully`,
      data: playlist,
      addedCount: newPostIds.length,
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Bulk add to playlist error:",
      error.message
    );

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "BULK_ADD_ERROR");
    }

    next(error);
  }
};

/**
 * @desc    Add a post to a playlist
 * @route   POST /api/playlists/:id/add
 * @access  Private
 */
export const addToPlaylist = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const playlistId = req.params.id;
    const userId = req.user._id;

    // Validate inputs
    if (!postId) {
      return next(new AppError("Post ID is required", 400));
    }

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check ownership
    validatePlaylistOwnership(playlist, userId);

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return next(new AppError("Post not found", 404));
    }

    // Check if post already in playlist
    const postExists = playlist.posts.some(
      (p) => p.toString() === postId.toString()
    );

    if (postExists) {
      return next(new AppError("Post already exists in this playlist", 409));
    }

    // Add post to playlist
    playlist.posts.push(postId);
    await playlist.save();

    // Populate posts for response
    await playlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    console.log(
      `[PlaylistController] ➕ Post ${postId} added to playlist ${playlistId}`
    );

    // Emit socket event
    emitPostAddedToPlaylist(
      playlistId,
      post.toObject(),
      userId,
      playlist.isPrivate
    );

    res.status(200).json({
      success: true,
      message: "Post added to playlist successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("[PlaylistController] Add to playlist error:", error.message);

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "ADD_POST_ERROR");
    }

    next(error);
  }
};

/**
 * @desc    Remove a post from a playlist
 * @route   POST /api/playlists/:id/remove
 * @access  Private
 */
export const removeFromPlaylist = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const playlistId = req.params.id;
    const userId = req.user._id;

    // Validate inputs
    if (!postId) {
      return next(new AppError("Post ID is required", 400));
    }

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check ownership
    validatePlaylistOwnership(playlist, userId);

    // Remove post from playlist
    const initialLength = playlist.posts.length;
    playlist.posts = playlist.posts.filter(
      (p) => p.toString() !== postId.toString()
    );

    if (playlist.posts.length === initialLength) {
      return next(new AppError("Post not found in playlist", 404));
    }

    await playlist.save();

    // Populate posts for response
    await playlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    console.log(
      `[PlaylistController] ➖ Post ${postId} removed from playlist ${playlistId}`
    );

    // Emit socket event
    emitPostRemovedFromPlaylist(playlistId, postId, userId, playlist.isPrivate);

    res.status(200).json({
      success: true,
      message: "Post removed from playlist successfully",
      data: playlist,
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Remove from playlist error:",
      error.message
    );

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "REMOVE_POST_ERROR");
    }

    next(error);
  }
};

/**
 * @desc    Get all playlists for a user
 * @route   GET /api/playlists/user/:userId
 * @access  Public (only returns public playlists unless requesting own)
 */
export const getUserPlaylists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?._id;

    // Build query
    const query = { user: userId };

    // If not requesting own playlists, only show public ones
    if (!requestingUserId || !requestingUserId.equals(userId)) {
      query.isPrivate = false;
    }

    const playlists = await Playlist.find(query)
      .populate("user", "name email avatar")
      .populate({
        path: "posts",
        select: "title description category coverImage author createdAt",
        populate: {
          path: "author",
          select: "name avatar",
        },
      })
      .sort({ createdAt: -1 });

    console.log(
      `[PlaylistController] 📋 Fetched ${playlists.length} playlists for user ${userId}`
    );

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Get user playlists error:",
      error.message
    );
    next(error);
  }
};

/**
 * @desc    Get a single playlist by ID
 * @route   GET /api/playlists/:id
 * @access  Public (if public playlist) / Private (if own private playlist)
 */
export const getPlaylistById = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user?._id;

    const playlist = await Playlist.findById(playlistId)
      .populate("user", "name email avatar")
      .populate({
        path: "posts",
        select: "title description category coverImage author createdAt",
        populate: {
          path: "author",
          select: "name avatar",
        },
      });

    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check access for private playlists
    if (userId) {
      validatePlaylistAccess(playlist, userId);
    } else if (playlist.isPrivate) {
      return next(new AppError("This playlist is private", 403));
    }

    console.log(`[PlaylistController] 📄 Fetched playlist ${playlistId}`);

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    console.error(
      "[PlaylistController] Get playlist by ID error:",
      error.message
    );
    next(error);
  }
};

/**
 * @desc    Update playlist details
 * @route   PATCH /api/playlists/:id
 * @access  Private
 */
export const updatePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user._id;
    const { name, description, isPrivate } = req.body;

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return next(new AppError("Playlist not found", 404));
    }

    // Check ownership
    validatePlaylistOwnership(playlist, userId);

    // Update fields
    if (name !== undefined) {
      playlist.name = validatePlaylistName(name);
    }
    if (description !== undefined) {
      playlist.description = description.trim();
    }
    if (isPrivate !== undefined) {
      playlist.isPrivate = isPrivate === true;
    }

    await playlist.save();

    // Populate for response
    await playlist.populate("user", "name email avatar");
    await playlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    console.log(`[PlaylistController] ✏️ Playlist ${playlistId} updated`);

    // Emit socket event
    emitPlaylistUpdated(playlist.toObject(), userId);

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("[PlaylistController] Update playlist error:", error.message);

    if (req.user?._id) {
      emitPlaylistError(req.user._id, error.message, "UPDATE_ERROR");
    }

    next(error);
  }
};
