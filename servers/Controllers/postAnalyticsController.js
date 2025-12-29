import mongoose from "mongoose";
import PostModel from "../../servers/Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";
import logger from "../../servers/Utils/Logger.js";
import { NODE_ENV } from "../../servers/config/dotenv.js";
import pLimit from "p-limit";
import NodeCache from "node-cache";
import { logMemory } from "../../servers/Utils/memoryLogger.js"; // Added import

// Initialize cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

/**
 * @desc Get total views and likes of a post
 */
export const getPostStats = async (req, res, next) => {
  try {
    logMemory("Before getPostStats start");
    const { postId } = req.params;
    if (!postId || postId.trim() === "") {
      throw new AppError("Post ID is required", 400, "getPostStats Controller");
    }

    logMemory("Before processing postIds");
    const postIds = postId
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const validIds = postIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length === 0) {
      throw new AppError("Invalid Post IDs", 400, "getPostStats Controller");
    }

    const cacheKey = `postStats:${validIds.join(",")}`;
    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        stats: cachedStats,
      });
    }

    logMemory("Before PostModel.findOne queries");
    const limit = pLimit(3); // Limit concurrent queries
    const posts = await Promise.all(
      validIds.map((id) =>
        limit(() =>
          PostModel.findOne({
            _id: id,
            isPublished: true,
            blocked: false,
          }).lean()
        )
      )
    );

    logMemory("Before filtering posts");
    const filteredPosts = posts.filter((post) => post); // Remove null results
    if (filteredPosts.length === 0) {
      throw new AppError("No posts found", 404, "getPostStats Controller");
    }

    logMemory("Before mapping stats");
    const stats = filteredPosts.map((post) => ({
      postId: post._id,
      views: post.views || 0,
      likes: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0,
    }));

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, stats);

    if (NODE_ENV !== "production") {
      logMemory("Before logger.info");
      logger.info("[getPostStats] Fetched stats", { postIds: validIds, stats });
    }

    logMemory("After getPostStats complete");
    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    logMemory("Before logger.error");
    logger.error("[getPostStats] Error", {
      message: error.message,
      stack: error.stack,
      context: "getPostStats Controller",
    });
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getPostStats Controller")
    );
  }
};

/**
 * @desc Get engagement stats for the logged-in user
 * @route GET /analytics/user-engagement
 * @access Protected
 */
// new code
export const getUserEngagementStats = async (req, res, next) => {
  try {
    // -----------------------
    // Validate user
    // -----------------------
    if (!req.user?._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      throw new AppError(
        "Invalid user ID",
        401,
        "getUserEngagementStats Controller"
      );
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const cacheKey = `userEngagementStats:${userId.toString()}`;

    // -----------------------
    // Cache check
    // -----------------------
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      return res.status(200).json({
        success: true,
        data: cachedStats,
      });
    }

    // -----------------------
    // Aggregation (schema-aligned)
    // -----------------------
    const [stats] = await PostModel.aggregate([
      {
        $match: {
          author: userId,
          isPublished: true,
          blocked: false,
        },
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $ifNull: ["$likesCount", 0] } },
          totalViews: { $sum: { $ifNull: ["$viewsCount", 0] } },
          totalBookmarks: { $sum: { $ifNull: ["$bookmarksCount", 0] } },
          totalComments: { $sum: { $ifNull: ["$commentsCount", 0] } },
          totalShares: { $sum: { $ifNull: ["$shareCount", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalPosts: 1,
          totalLikes: 1,
          totalViews: 1,
          totalBookmarks: 1,
          totalComments: 1,
          totalShares: 1,
        },
      },
    ]);

    // -----------------------
    // Fallback when no posts
    // -----------------------
    const result = stats || {
      totalPosts: 0,
      totalLikes: 0,
      totalViews: 0,
      totalBookmarks: 0,
      totalComments: 0,
      totalShares: 0,
    };

    // -----------------------
    // Cache result
    // -----------------------
    cache.set(cacheKey, result);

    if (NODE_ENV !== "production") {
      logger.info("[getUserEngagementStats] Stats fetched", {
        userId: userId.toString(),
        result,
      });
    }

    // -----------------------
    // Response
    // -----------------------
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("[getUserEngagementStats] Error", {
      message: error.message,
      stack: error.stack,
    });

    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getUserEngagementStats Controller")
    );
  }
};

// old code
// export const getUserEngagementStats = async (req, res, next) => {
//   try {
//     logMemory("Before getUserEngagementStats start");
//     if (!req.user?._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
//       throw new AppError(
//         "Invalid user ID",
//         401,
//         "getUserEngagementStats Controller"
//       );
//     }

//     const userId = req.user._id;
//     const cacheKey = `userEngagementStats:${userId}`;

//     logMemory(`Before checking cache: ${cacheKey}`);
//     const cachedStats = cache.get(cacheKey);
//     if (cachedStats) {
//       logMemory(`Cache hit: ${cacheKey}`);
//       return res.status(200).json({
//         success: true,
//         data: cachedStats,
//       });
//     }

//     logMemory("Before PostModel.aggregate");
//     const [stats] = await PostModel.aggregate([
//       {
//         $match: {
//           author: new mongoose.Types.ObjectId(userId),
//           isPublished: true,
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalPosts: { $sum: 1 },
//           totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
//           totalViews: { $sum: { $ifNull: ["$views", 0] } },
//           totalBookmarks: { $sum: { $ifNull: ["$bookmarksCount", 0] } },
//           totalComments: { $sum: { $ifNull: ["$commentsCount", 0] } },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           totalPosts: 1,
//           totalLikes: 1,
//           totalViews: 1,
//           totalBookmarks: 1,
//           totalComments: 1,
//         },
//       },
//     ]).exec();

//     logMemory("Before processing stats");
//     const result = stats || {
//       totalPosts: 0,
//       totalLikes: 0,
//       totalViews: 0,
//       totalBookmarks: 0,
//       totalComments: 0,
//     };

//     logMemory(`Before setting cache: ${cacheKey}`);
//     cache.set(cacheKey, result);

//     if (NODE_ENV !== "production") {
//       logMemory("Before logger.info");
//       logger.info("[getUserEngagementStats] Fetched stats", {
//         userId,
//         stats: result,
//       });
//     }

//     logMemory("After getUserEngagementStats complete");
//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     logMemory("Before logger.error");
//     logger.error("[getUserEngagementStats] Error", {
//       message: error.message,
//       stack: error.stack,
//       context: "getUserEngagementStats Controller",
//     });
//     next(
//       error instanceof AppError
//         ? error
//         : new AppError(error.message, 500, "getUserEngagementStats Controller")
//     );
//   }
// };
