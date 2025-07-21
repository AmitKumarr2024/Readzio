import { recordActivity } from "../../servers/helpers/activityHelper.js";
import PostModel from "../../servers/Models/Post.js";
import ActivityModel from "../Models/ActivityModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import UserModel from "../../servers/Models/User.js";

/**
 * @desc Search posts by title or tags
 */
export const searchPosts = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString(); // May be undefined for guests
    const { query } = req.query;

    if (!query) {
      throw new AppError(
        "Query parameter required",
        400,
        "searchPosts Controller"
      );
    }

    const regex = new RegExp(query, "i");

    const posts = await PostModel.find({
      $or: [{ title: regex }, { tags: regex }],
    })
      .sort({ createdAt: -1 })
      .populate("author", "name");

    // Record search activity only for logged-in users
    if (userId) {
      await recordActivity({
        userId,
        action: "SEARCHED_POSTS",
        message: `Searched posts with query: ${query}`,
      });
    }

    res.status(200).json({
      success: true,
      results: posts.length,
      posts,
    });
  } catch (error) {
    console.error(`[searchPosts Controller] Error: ${error.message}`, {
      userId: req.user?._id,
      query: req.query.query,
    });
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
    const userId = req.user?._id?.toString(); // May be undefined for unauthenticated users
    const limit = parseInt(req.query.limit) || 10;

    const posts = await PostModel.find()
      .sort({ likesCount: -1, views: -1, createdAt: -1 })
      .limit(limit)
      .populate("author", "name");

    if (userId) {
      await recordActivity({
        userId,
        action: "VIEWED_TRENDING_POSTS",
        message: `Viewed ${limit} trending posts`,
      });
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error(`[getTrendingPosts Controller] Error: ${error.message}`, {
      userId: req.user?._id,
      limit: req.query.limit,
    });
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
    const userId = req.user?._id?.toString(); // May be undefined for unauthenticated users
    const limit = parseInt(req.query.limit) || 10;

    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("author", "name");

    if (userId) {
      await recordActivity({
        userId,
        action: "VIEWED_LATEST_POSTS",
        message: `Viewed ${limit} latest posts`,
      });
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error(`[getLatestPosts Controller] Error: ${error.message}`, {
      userId: req.user?._id,
      limit: req.query.limit,
      route: req.originalUrl,
    });
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getLatestPosts Controller")
    );
  }
};

/**
 * @desc Suggest posts based on user activity
 */
export const suggestPosts = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString(); // May be undefined for guest users
    const limit = parseInt(req.query.limit) || 10;

    let regex = /.*/; // Default: match everything
    let query = {};
    let tags = [];

    if (userId) {
      // For logged-in users: use activity to filter
      const userActivities = await ActivityModel.find({ userId }).select(
        "message"
      );

      tags = userActivities
        .filter((activity) =>
          activity.message.includes("Searched posts with query")
        )
        .map((activity) => activity.message.split(": ")[1])
        .slice(0, 5);

      if (tags.length) {
        regex = new RegExp(tags.join("|"), "i");
        query = {
          $or: [{ tags: regex }, { title: regex }],
          author: { $ne: userId },
        };
      } else {
        query = { author: { $ne: userId } };
      }
    } else {
      // Guest user: suggest trending posts
      query = {};
    }

    const posts = await PostModel.find(query)
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit)
      .populate("author", "name");

    if (userId) {
      await recordActivity({
        userId,
        action: "VIEWED_SUGGESTED_POSTS",
        message: `Viewed ${limit} suggested posts`,
      });
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error(`[suggestPosts Controller] Error: ${error.message}`, {
      userId: req.user?._id,
      limit: req.query.limit,
    });
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "suggestPosts Controller")
    );
  }
};

/**
 * @desc Search for a single user by name, email, or username
 */
export const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.query?.trim();

    console.log(`[searchUsers] Query: "${query}"`);

    if (!query || query.length < 3) {
      throw new AppError(
        "Query must be at least 3 characters",
        400,
        "searchUsers"
      );
    }

    const regex = new RegExp(query, "i");

    const conditions = [{ name: regex }, { email: regex }];
    if (UserModel.schema.paths.username) {
      conditions.push({ username: regex });
    }

    const users = await UserModel.find({ $or: conditions })
      .select("name email avatar username _id")
      .limit(10); // optional: limit results

    if (!users || users.length === 0) {
      return res.status(200).json({ users: [] }); // not error, just empty
    }

    // Fetch total post counts in parallel
    const userIds = users.map((u) => u._id);
    const postCounts = await PostModel.aggregate([
      { $match: { author: { $in: userIds } } },
      { $group: { _id: "$author", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    postCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    const enrichedUsers = users.map((user) => ({
      ...user.toObject(),
      totalPosts: countMap[user._id.toString()] || 0,
    }));

    res.status(200).json({ users: enrichedUsers });
  } catch (error) {
    console.error(`[searchUsers Controller] Error:`, error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "searchUsers")
    );
  }
};
