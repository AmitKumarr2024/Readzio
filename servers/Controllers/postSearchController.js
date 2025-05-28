import PostModel from '../Models/Post.js';
import { AppError } from '../utils/AppError.js';

/**
 * @desc Search posts by title or tags
 */
export const searchPosts = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      throw new AppError("Query parameter required", 400, "searchPosts Controller");
    }

    const regex = new RegExp(query, 'i'); // case insensitive search

    const posts = await PostModel.find({
      $or: [{ title: regex }, { tags: regex }]
    }).sort({ createdAt: -1 }).populate("author", "name");

    res.status(200).json({
      success: true,
      results: posts.length,
      posts,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "searchPosts Controller"));
  }
};

/**
 * @desc Get trending posts (based on likes or views)
 */
export const getTrendingPosts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const posts = await PostModel.find()
      .sort({ likesCount: -1, views: -1, createdAt: -1 }) // assuming likesCount or views field
      .limit(limit)
      .populate("author", "name");

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getTrendingPosts Controller"));
  }
};

/**
 * @desc Get latest posts
 */
export const getLatestPosts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const posts = await PostModel.find()
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .populate("author", "name");

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