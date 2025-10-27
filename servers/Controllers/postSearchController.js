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
import { logMemory } from "../../servers/Utils/memoryLogger.js"; // Added import

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
/**
 * @desc Search posts with strict matching - only near-exact matches
 */
export const searchPosts = async (req, res, next) => {
  try {
    logMemory("Before searchPosts start");
    const userId = req.user?._id?.toString();
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      throw new AppError(
        "Query parameter required (min 2 characters)",
        400,
        "searchPosts"
      );
    }

    const trimmedQuery = query.trim();
    const cacheKey = `searchPosts:${trimmedQuery}`;

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

    // Create strict regex - escape special characters and use word boundaries
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const strictRegex = new RegExp(`\\b${escapedQuery}`, "i");

    // Also create exact phrase match for multi-word queries
    const phraseRegex = new RegExp(escapedQuery, "i");

    logMemory("Before PostModel.find");
    const posts = await PostModel.find({
      $or: [
        { title: phraseRegex },
        { tags: strictRegex },
        { excerpt: phraseRegex },
      ],
      isPublished: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    logMemory("Before processing and scoring posts");

    // Score and filter posts for strict matching
    const queryLower = trimmedQuery.toLowerCase();
    const scoredPosts = posts
      .map((post) => {
        const title = (post.title || "").toLowerCase();
        const excerpt = (post.excerpt || "").toLowerCase();
        const tags = (post.tags || []).map((tag) => tag.toLowerCase());

        let score = 0;

        // STRICT MATCHING SCORING:

        // 1. Exact title match (highest priority)
        if (title === queryLower) {
          score = 10000;
        }
        // 2. Title starts with query (very high priority)
        else if (title.startsWith(queryLower)) {
          score = 5000;
        }
        // 3. Title contains exact phrase (high priority)
        else if (title.includes(queryLower)) {
          // Earlier position = higher score
          const position = title.indexOf(queryLower);
          score = 3000 - position;
        }
        // 4. Exact tag match
        else if (tags.some((tag) => tag === queryLower)) {
          score = 4000;
        }
        // 5. Tag starts with query
        else if (tags.some((tag) => tag.startsWith(queryLower))) {
          score = 2000;
        }
        // 6. Excerpt contains exact phrase (lower priority)
        else if (excerpt.includes(queryLower)) {
          score = 500;
        }

        // Only return posts with meaningful matches
        if (score > 0) {
          return {
            ...post,
            blocks: Array.isArray(post.blocks) ? post.blocks : [],
            _searchScore: score,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b._searchScore - a._searchScore)
      .slice(0, 10) // Limit to top 10 most relevant results
      .map((post) => {
        // Remove internal search score before sending
        const { _searchScore, ...postWithoutScore } = post;
        return postWithoutScore;
      });

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, scoredPosts);

    if (userId) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId,
        action: "SEARCHED_POSTS",
        message: `Searched posts with query: ${trimmedQuery}`,
      });
    }

    logMemory("After searchPosts complete");
    res.status(200).json({
      success: true,
      results: scoredPosts.length,
      posts: scoredPosts,
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

    // ✅ Create cache key based on user & limit
    const cacheKey = `suggestedPosts:${userId || "guest"}:${limit}`;

    logMemory(`Checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`✅ Cache hit for key: ${cacheKey}`);
      return res.status(200).json({ success: true, posts: cachedPosts });
    }

    let query = { isPublished: true, blocked: false, author: { $ne: userId } };
    let tags = [];

    // ✅ Personalized suggestions if user is logged in
    if (userId) {
      logMemory("Fetching user activities for personalization");
      const userActivities = await ActivityModel.find({ userId })
        .select("message")
        .lean();

      tags = userActivities
        .filter((activity) =>
          activity.message.includes("Searched posts with query")
        )
        .map((activity) => activity.message.split(": ")[1])
        .slice(0, 5);

      if (tags.length > 0) {
        const regex = new RegExp(tags.join("|"), "i");
        query.$or = [{ tags: regex }, { title: regex }];
      }
    }

    logMemory("Fetching posts from DB...");
    const posts = await PostModel.find(query)
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    // ✅ Normalize blocks field
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    // ✅ Cache the processed posts
    cache.set(cacheKey, processedPosts);
    logMemory(`Cached data for key: ${cacheKey}`);

    // ✅ Log activity for analytics
    if (userId) {
      await recordActivity({
        userId,
        action: "VIEWED_SUGGESTED_POSTS",
        message: `Viewed ${limit} suggested posts`,
      });
    }

    logMemory("Completed suggestPosts successfully");
    res.status(200).json({ success: true, posts: processedPosts });
  } catch (error) {
    console.error("❌ suggestPosts Error:", error);

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
