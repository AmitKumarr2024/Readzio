import { recordActivity } from '../helpers/activityHelper.js';
import PostModel from '../models/Post.js';
import { AppError } from '../utils/AppError.js';

/**
 * @desc Search posts by title or tags
 */
export const searchPosts = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString(); // optional

    if (!userId) {
      throw new AppError("Unauthorized - No user found", 401, "searchPosts Controller");
    }

    const { query } = req.query;

    if (!query) {
      throw new AppError("Query parameter required", 400, "searchPosts Controller");
    }

    const regex = new RegExp(query, 'i');

    const posts = await PostModel.find({
      $or: [{ title: regex }, { tags: regex }]
    }).sort({ createdAt: -1 }).populate("author", "name");

    // Record search activity
    await recordActivity({
      userId,
      action: "SEARCHED_POSTS", // New enum value needed in ActivityModel
      message: `Searched posts with query: ${query}`,
    });

    res.status(200).json({
      success: true,
      results: posts.length,
      posts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "searchPosts Controller")
    );
  }
};

/**
 * @desc Get trending posts (based on likes or views)
 */
export const getTrendingPosts = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString(); // optional

    if (!userId) {
      throw new AppError("Unauthorized - No user found", 401, "getTrendingPosts Controller");
    }

    const limit = parseInt(req.query.limit) || 10;

    const posts = await PostModel.find()
      .sort({ likesCount: -1, views: -1, createdAt: -1 })
      .limit(limit)
      .populate("author", "name");

    // Record activity
    await recordActivity({
      userId,
      action: "VIEWED_TRENDING_POSTS", // New enum value needed in ActivityModel
      message: `Viewed ${limit} trending posts`,
    });

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getTrendingPosts Controller")
    );
  }
};

/**
 * @desc Get latest posts
 */
export const getLatestPosts = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString(); // optional

    if (!userId) {
      throw new AppError("Unauthorized - No user found", 401, "getLatestPosts Controller");
    }

    const limit = parseInt(req.query.limit) || 10;

    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("author", "name");

    // Record activity
    await recordActivity({
      userId,
      action: "VIEWED_LATEST_POSTS", // New enum value needed in ActivityModel
      message: `Viewed ${limit} latest posts`,
    });

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getLatestPosts Controller")
    );
  }
};