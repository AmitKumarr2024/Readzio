import { v4 as uuidv4 } from "uuid";
import PostModel from "../../servers/Models/Post.js";
import ActivityModel from "../../servers/Models/ActivityModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import UserModel from "../../servers/Models/User.js";
import mongoose from "mongoose";
import { io } from "../../servers/sockets/socket.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import pLimit from "p-limit";
import NodeCache from "node-cache";
import { logMemory } from "../Utils/memoryLogger.js"; // Added import

// Initialize cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Validates ObjectId
const validateObjectId = (id, type = "ID") => {
  logMemory(`Before validateObjectId: ${type}`);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid ${type}`,
      400,
      "ValidateObjectId",
      `Invalid ${type} provided`
    );
  }
  logMemory(`After validateObjectId: ${type}`);
};

/**
 * @desc Search posts by title or tags
 */
export const searchPosts = async (req, res, next) => {
  try {
    logMemory("Before searchPosts start");
    const userId = req.user?._id?.toString(); // May be undefined for guests
    const { query } = req.query;
    const cacheKey = `searchPosts:${query || "none"}`;

    if (!query) {
      throw new AppError("Query parameter required", 400, "searchPosts");
    }

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        results: cachedPosts.length,
        posts: cachedPosts,
      });
    }

    const regex = new RegExp(query, "i");

    logMemory("Before PostModel.find");
    const posts = await PostModel.find({
      $or: [{ title: regex }, { tags: regex }],
      isPublished: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, processedPosts);

    if (userId) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId,
        action: "SEARCHED_POSTS",
        message: `Searched posts with query: ${query}`,
      });
    }

    logMemory("After searchPosts complete");
    res.status(200).json({
      success: true,
      results: processedPosts.length,
      posts: processedPosts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to search posts",
            500,
            "searchPosts"
          )
    );
  }
};

/**
 * @desc Get trending posts (based on likes or views)
 */
export const getTrendingPosts = async (req, res, next) => {
  try {
    logMemory("Before getTrendingPosts start");
    const userId = req.user?._id?.toString(); // May be undefined for unauthenticated users
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const cacheKey = `trendingPosts:${limit}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        posts: cachedPosts,
      });
    }

    logMemory("Before PostModel.find");
    const posts = await PostModel.find({
      isPublished: true,
      blocked: false,
    })
      .sort({ likesCount: -1, viewsCount: -1, createdAt: -1 })
      .limit(limit)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, processedPosts);

    if (userId) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId,
        action: "VIEWED_TRENDING_POSTS",
        message: `Viewed ${limit} trending posts`,
      });
    }

    logMemory("After getTrendingPosts complete");
    res.status(200).json({
      success: true,
      posts: processedPosts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch trending posts",
            500,
            "getTrendingPosts"
          )
    );
  }
};

/**
 * @desc Get latest posts
 */
export const getLatestPosts = async (req, res, next) => {
  try {
    logMemory("Before getLatestPosts start");
    const userId = req.user?._id?.toString(); // May be undefined for unauthenticated users
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const cacheKey = `latestPosts:${limit}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        posts: cachedPosts,
      });
    }

    logMemory("Before PostModel.find");
    const posts = await PostModel.find({
      isPublished: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, processedPosts);

    if (userId) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId,
        action: "VIEWED_LATEST_POSTS",
        message: `Viewed ${limit} latest posts`,
      });
    }

    logMemory("After getLatestPosts complete");
    res.status(200).json({
      success: true,
      posts: processedPosts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch latest posts",
            500,
            "getLatestPosts"
          )
    );
  }
};

/**
 * @desc Suggest posts based on user activity
 */
export const suggestPosts = async (req, res, next) => {
  try {
    logMemory("Before suggestPosts start");
    const userId = req.user?._id?.toString(); // May be undefined for guest users
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const cacheKey = `suggestedPosts:${userId || "guest"}:${limit}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        posts: cachedPosts,
      });
    }

    let regex = /.*/; // Default: match everything
    let query = { isPublished: true, blocked: false };
    let tags = [];

    if (userId) {
      logMemory("Before ActivityModel.find");
      const userActivities = await ActivityModel.find({ userId })
        .select("message")
        .lean();

      logMemory("Before processing user activities");
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
          isPublished: true,
          blocked: false,
        };
      } else {
        query = { author: { $ne: userId }, isPublished: true, blocked: false };
      }
    }

    logMemory("Before PostModel.find");
    const posts = await PostModel.find(query)
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, processedPosts);

    if (userId) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId,
        action: "VIEWED_SUGGESTED_POSTS",
        message: `Viewed ${limit} suggested posts`,
      });
    }

    logMemory("After suggestPosts complete");
    res.status(200).json({
      success: true,
      posts: processedPosts,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch suggested posts",
            500,
            "suggestPosts"
          )
    );
  }
};

/**
 * @desc Search for a single user by name, email, or username
 */
export const searchUsers = async (req, res, next) => {
  try {
    logMemory("Before searchUsers start");
    const query = req.query.query?.trim();
    const cacheKey = `searchUsers:${query || "none"}`;

    if (!query || query.length < 3) {
      throw new AppError(
        "Query must be at least 3 characters",
        400,
        "searchUsers"
      );
    }

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedUsers = cache.get(cacheKey);
    if (cachedUsers) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ users: cachedUsers });
    }

    const regex = new RegExp(query, "i");

    const conditions = [{ name: regex }, { email: regex }];
    if (UserModel.schema.paths.username) {
      conditions.push({ username: regex });
    }

    const limit = pLimit(3);
    logMemory("Before UserModel.find");
    const users = await UserModel.find({ $or: conditions })
      .select("name email avatar username _id")
      .limit(10)
      .lean();

    if (!users || users.length === 0) {
      logMemory("No users found");
      return res.status(200).json({ users: [] });
    }

    logMemory("Before PostModel.aggregate");
    const userIds = users.map((u) => u._id);
    const postCounts = await PostModel.aggregate([
      {
        $match: { author: { $in: userIds }, isPublished: true, blocked: false },
      },
      { $group: { _id: "$author", count: { $sum: 1 } } },
    ]).exec();

    logMemory("Before processing post counts");
    const countMap = {};
    postCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    const enrichedUsers = users.map((user) => ({
      ...user,
      totalPosts: countMap[user._id.toString()] || 0,
    }));

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, enrichedUsers);

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "SEARCHED_USERS",
        message: `Searched users with query: ${query}`,
      });
    }

    logMemory("After searchUsers complete");
    res.status(200).json({ users: enrichedUsers });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to search users",
            500,
            "searchUsers"
          )
    );
  }
};
