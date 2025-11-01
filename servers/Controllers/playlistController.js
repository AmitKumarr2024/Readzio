// servers/controllers/postlistController.js

import mongoose from "mongoose";
import postlist from "../Models/postlistModel.js";
import Post from "../Models/Post.js";
import { AppError } from "../Utils/AppError.js";
import {
  emitpostlistCreated,
  emitpostlistUpdated,
  emitpostlistDeleted,
  emitPostAddedTopostlist,
  emitPostRemovedFrompostlist,
  emitpostlistPostsReordered,
  emitpostlistError,
} from "../sockets/postlistSocketHandlers.js";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const validatepostlistName = (name) => {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new AppError("postlist name is required", 400);
  }
  if (name.length > 100) {
    throw new AppError("postlist name must be less than 100 characters", 400);
  }
  return name.trim();
};

const validatepostlistOwnership = (postlist, userId) => {
  if (postlist.user.toString() !== userId.toString()) {
    throw new AppError(
      "You don't have permission to modify this postlist",
      403
    );
  }
};

const validatepostlistAccess = (postlist, userId) => {
  if (postlist.isPrivate && postlist.user.toString() !== userId.toString()) {
    throw new AppError("This postlist is private", 403);
  }
};

const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
};

const normalizeUserId = (userId) => {
  return userId?.toString() || null;
};

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @desc    Create a new postlist
 * @route   POST /api/postlists
 * @access  Private
 */
export const createpostlist = async (req, res, next) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = req.user._id;

    // Validate input
    const validatedName = validatepostlistName(name);

    // Check for duplicate postlist names for this user
    const existingpostlist = await postlist.findOne({
      user: userId,
      name: validatedName,
    });

    if (existingpostlist) {
      return next(
        new AppError("You already have a postlist with this name", 409)
      );
    }

    // Create postlist
    const postlist = await postlist.create({
      user: userId,
      name: validatedName,
      description: description?.trim() || "",
      isPrivate: isPrivate === true,
      posts: [],
    });

    // Populate user info
    await postlist.populate("user", "name email avatar");

    // Emit socket event
    emitpostlistCreated(postlist.toObject(), userId);

    res.status(201).json({
      success: true,
      message: "postlist created successfully",
      data: postlist,
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "CREATE_ERROR");
    }
    next(error);
  }
};

/**
 * @desc    Delete a postlist
 * @route   DELETE /api/postlists/:id
 * @access  Private
 */
export const deletepostlist = async (req, res, next) => {
  try {
    const postlistId = req.params.id;
    const userId = req.user._id;

    // Validate ObjectId
    validateObjectId(postlistId, "postlist ID");

    // Find postlist
    const postlist = await postlist.findById(postlistId);
    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check ownership
    validatepostlistOwnership(postlist, userId);

    // Store isPrivate before deletion for socket emission
    const wasPrivate = postlist.isPrivate;

    // Delete postlist
    await postlist.findByIdAndDelete(postlistId);

    // Emit socket event
    emitpostlistDeleted(postlistId, userId, wasPrivate);

    res.status(200).json({
      success: true,
      message: "postlist deleted successfully",
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "DELETE_ERROR");
    }
    next(error);
  }
};

/**
 * @desc    Reorder posts in a postlist
 * @route   PATCH /api/postlists/:id/reorder
 * @access  Private
 */
export const reorderpostlistPosts = async (req, res, next) => {
  try {
    const postlistId = req.params.id;
    const userId = req.user._id;
    const { postIds } = req.body;

    // Validate ObjectId
    validateObjectId(postlistId, "postlist ID");

    // Validate input
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return next(new AppError("Invalid post IDs array", 400));
    }

    // Validate all postIds are valid ObjectIds
    postIds.forEach((id) => validateObjectId(id, "Post ID"));

    // Find postlist
    const postlist = await postlist.findById(postlistId);
    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check ownership
    validatepostlistOwnership(postlist, userId);

    // Validate all postIds exist in the postlist
    const currentPostIds = postlist.posts.map((p) => p.toString());
    const allPostsValid = postIds.every((id) =>
      currentPostIds.includes(id.toString())
    );

    if (!allPostsValid) {
      return next(new AppError("Some post IDs are not in this postlist", 400));
    }

    // Check if all posts are included
    if (postIds.length !== currentPostIds.length) {
      return next(new AppError("All posts must be included in reorder", 400));
    }

    // Reorder posts
    postlist.posts = postIds;
    await postlist.save();

    // Populate for response
    await postlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    // Emit socket event
    emitpostlistPostsReordered(postlist.toObject(), userId);

    res.status(200).json({
      success: true,
      message: "postlist posts reordered successfully",
      data: postlist,
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "REORDER_ERROR");
    }
    next(error);
  }
};

/**
 * @desc    Get postlist statistics for a user
 * @route   GET /api/postlists/user/:userId/stats
 * @access  Public
 */
export const getpostlistStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = normalizeUserId(req.user?._id);

    // Validate ObjectId
    validateObjectId(userId, "User ID");

    // Determine if requester is the owner
    const isOwner = requestingUserId && requestingUserId === userId.toString();

    // Build query
    const query = { user: userId };

    // If not requesting own stats, only count public postlists
    if (!isOwner) {
      query.isPrivate = false;
    }

    // Get statistics
    const [totalpostlists, postlists] = await Promise.all([
      postlist.countDocuments(query),
      postlist.find(query).select("posts").lean(),
    ]);

    const totalPosts = postlists.reduce(
      (sum, postlist) => sum + (postlist.posts?.length || 0),
      0
    );

    const averagePostsPerpostlist =
      totalpostlists > 0 ? Math.round(totalPosts / totalpostlists) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalpostlists,
        totalPosts,
        averagePostsPerpostlist,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search postlists by name or description
 * @route   GET /api/postlists/search
 * @access  Public (only searches public postlists)
 */
export const searchpostlists = async (req, res, next) => {
  try {
    const { query, limit = 20, page = 1 } = req.query;

    if (!query || query.trim().length === 0) {
      return next(new AppError("Search query is required", 400));
    }

    // Sanitize and validate pagination
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Search in public postlists only
    const searchQuery = {
      isPrivate: false,
      $or: [
        { name: { $regex: query.trim(), $options: "i" } },
        { description: { $regex: query.trim(), $options: "i" } },
      ],
    };

    const [postlists, total] = await Promise.all([
      postlist.find(searchQuery)
        .populate("user", "name avatar")
        .populate({
          path: "posts",
          select: "title coverImage",
          options: { limit: 3 },
        })
        .limit(sanitizedLimit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .lean(),
      postlist.countDocuments(searchQuery),
    ]);

    res.status(200).json({
      success: true,
      count: postlists.length,
      total,
      page: sanitizedPage,
      pages: Math.ceil(total / sanitizedLimit),
      data: postlists,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if a post is in any of user's postlists
 * @route   GET /api/postlists/check/:postId
 * @access  Private
 */
export const checkPostInpostlists = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId
    validateObjectId(postId, "Post ID");

    const postlists = await postlist.find({
      user: userId,
      posts: postId,
    })
      .select("_id name")
      .lean();

    res.status(200).json({
      success: true,
      inpostlists: postlists.length > 0,
      postlists,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk add posts to a postlist
 * @route   POST /api/postlists/:id/bulk-add
 * @access  Private
 */
export const bulkAddTopostlist = async (req, res, next) => {
  try {
    const postlistId = req.params.id;
    const userId = req.user._id;
    const { postIds } = req.body;

    // Validate ObjectId
    validateObjectId(postlistId, "postlist ID");

    // Validate input
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return next(new AppError("Post IDs array is required", 400));
    }

    if (postIds.length > 50) {
      return next(new AppError("Cannot add more than 50 posts at once", 400));
    }

    // Validate all postIds are valid ObjectIds
    postIds.forEach((id) => validateObjectId(id, "Post ID"));

    // Find postlist
    const postlist = await postlist.findById(postlistId);
    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check ownership
    validatepostlistOwnership(postlist, userId);

    // Verify all posts exist
    const posts = await Post.find({ _id: { $in: postIds } }).lean();
    if (posts.length !== postIds.length) {
      return next(new AppError("Some posts were not found", 404));
    }

    // Add only new posts
    const existingPostIds = new Set(postlist.posts.map((p) => p.toString()));
    const newPostIds = postIds.filter(
      (id) => !existingPostIds.has(id.toString())
    );

    if (newPostIds.length === 0) {
      return next(new AppError("All posts already exist in postlist", 409));
    }

    postlist.posts.push(...newPostIds);
    await postlist.save();

    // Populate for response
    await postlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    // Emit socket event for each added post
    posts.forEach((post) => {
      if (newPostIds.includes(post._id.toString())) {
        emitPostAddedTopostlist(postlistId, post, userId, postlist.isPrivate);
      }
    });

    res.status(200).json({
      success: true,
      message: `${newPostIds.length} post${
        newPostIds.length > 1 ? "s" : ""
      } added to postlist successfully`,
      data: postlist,
      addedCount: newPostIds.length,
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "BULK_ADD_ERROR");
    }
    next(error);
  }
};

/**
 * @desc    Add a post to a postlist
 * @route   POST /api/postlists/:id/add
 * @access  Private
 */
export const addTopostlist = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const postlistId = req.params.id;
    const userId = req.user._id;

    // Validate ObjectIds
    validateObjectId(postlistId, "postlist ID");
    if (!postId) {
      return next(new AppError("Post ID is required", 400));
    }
    validateObjectId(postId, "Post ID");

    // Find postlist
    const postlist = await postlist.findById(postlistId);
    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check ownership
    validatepostlistOwnership(postlist, userId);

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return next(new AppError("Post not found", 404));
    }

    // Check if post already in postlist
    const postExists = postlist.posts.some(
      (p) => p.toString() === postId.toString()
    );

    if (postExists) {
      return next(new AppError("Post already exists in this postlist", 409));
    }

    // Add post to postlist
    postlist.posts.push(postId);
    await postlist.save();

    // Populate posts for response
    await postlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    // Emit socket event
    emitPostAddedTopostlist(
      postlistId,
      post.toObject(),
      userId,
      postlist.isPrivate
    );

    res.status(200).json({
      success: true,
      message: "Post added to postlist successfully",
      data: postlist,
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "ADD_POST_ERROR");
    }
    next(error);
  }
};

/**
 * @desc    Remove a post from a postlist
 * @route   POST /api/postlists/:id/remove
 * @access  Private
 */
export const removeFrompostlist = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const postlistId = req.params.id;
    const userId = req.user._id;

    // Validate ObjectIds
    validateObjectId(postlistId, "postlist ID");
    if (!postId) {
      return next(new AppError("Post ID is required", 400));
    }
    validateObjectId(postId, "Post ID");

    // Find postlist
    const postlist = await postlist.findById(postlistId);
    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check ownership
    validatepostlistOwnership(postlist, userId);

    // Remove post from postlist
    const initialLength = postlist.posts.length;
    postlist.posts = postlist.posts.filter(
      (p) => p.toString() !== postId.toString()
    );

    if (postlist.posts.length === initialLength) {
      return next(new AppError("Post not found in postlist", 404));
    }

    await postlist.save();

    // Populate posts for response
    await postlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    // Emit socket event
    emitPostRemovedFrompostlist(postlistId, postId, userId, postlist.isPrivate);

    res.status(200).json({
      success: true,
      message: "Post removed from postlist successfully",
      data: postlist,
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "REMOVE_POST_ERROR");
    }
    next(error);
  }
};

/**
 * @desc    Get all postlists for a user
 * @route   GET /api/postlists/user/:userId
 * @access  Public (only returns public postlists unless requesting own)
 */
export const getUserpostlists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = normalizeUserId(req.user?._id);

    console.log("[getUserpostlists] Debug Info:");
    console.log("  Requested userId:", userId);
    console.log("  Requesting userId:", requestingUserId);
    console.log("  req.user:", req.user);

    // Validate ObjectId
    validateObjectId(userId, "User ID");

    // Determine if requester is the owner - normalize both sides
    const normalizedUserId = userId.toString().trim();
    const normalizedRequestingUserId = requestingUserId
      ? requestingUserId.toString().trim()
      : null;
    const isOwner =
      normalizedRequestingUserId &&
      normalizedRequestingUserId === normalizedUserId;

    console.log("  Is Owner:", isOwner);

    // Build query
    const query = { user: userId };

    // Only restrict to public postlists if viewer ≠ owner
    if (!isOwner) {
      query.isPrivate = false;
    }

    console.log("  Query:", query);

    const postlists = await postlist.find(query)
      .populate("user", "name email avatar")
      .populate({
        path: "posts",
        select: "title description category coverImage author createdAt",
        populate: {
          path: "author",
          select: "name avatar",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log("  Found postlists:", postlists.length);

    res.status(200).json({
      success: true,
      count: postlists.length,
      data: postlists,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get a single postlist by ID
 * @route   GET /api/postlists/:id
 * @access  Public (if public postlist) / Private (if own private postlist)
 */
export const getpostlistById = async (req, res, next) => {
  try {
    const postlistId = req.params.id;
    const userId = normalizeUserId(req.user?._id);

    // Validate ObjectId
    validateObjectId(postlistId, "postlist ID");

    const postlist = await postlist.findById(postlistId)
      .populate("user", "name email avatar")
      .populate({
        path: "posts",
        select: "title description category coverImage author createdAt",
        populate: {
          path: "author",
          select: "name avatar",
        },
      })
      .lean();

    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check access for private postlists
    if (postlist.isPrivate) {
      if (!userId || postlist.user._id.toString() !== userId) {
        return next(new AppError("This postlist is private", 403));
      }
    }

    res.status(200).json({
      success: true,
      data: postlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update postlist details
 * @route   PATCH /api/postlists/:id
 * @access  Private
 */
export const updatepostlist = async (req, res, next) => {
  try {
    const postlistId = req.params.id;
    const userId = req.user._id;
    const { name, description, isPrivate } = req.body;

    // Validate ObjectId
    validateObjectId(postlistId, "postlist ID");

    // Find postlist
    const postlist = await postlist.findById(postlistId);
    if (!postlist) {
      return next(new AppError("postlist not found", 404));
    }

    // Check ownership
    validatepostlistOwnership(postlist, userId);

    // Check for duplicate name if name is being updated
    if (name !== undefined && name !== postlist.name) {
      const validatedName = validatepostlistName(name);
      const existingpostlist = await postlist.findOne({
        user: userId,
        name: validatedName,
        _id: { $ne: postlistId },
      });

      if (existingpostlist) {
        return next(
          new AppError("You already have a postlist with this name", 409)
        );
      }

      postlist.name = validatedName;
    }

    // Update other fields
    if (description !== undefined) {
      postlist.description = description.trim();
    }
    if (isPrivate !== undefined) {
      postlist.isPrivate = isPrivate === true;
    }

    await postlist.save();

    // Populate for response
    await postlist.populate("user", "name email avatar");
    await postlist.populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    });

    // Emit socket event
    emitpostlistUpdated(postlist.toObject(), userId);

    res.status(200).json({
      success: true,
      message: "postlist updated successfully",
      data: postlist,
    });
  } catch (error) {
    if (req.user?._id) {
      emitpostlistError(req.user._id, error.message, "UPDATE_ERROR");
    }
    next(error);
  }
};
