import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { validateObjectId } from "../Middlewares/validateObjectId.js";
import PostModel from "../../servers/Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";
import {
  createPost,
  getAllPosts,
  getSinglePost,
  deletePost,
  trackTimeSpent,
  toggleBlockPost,
  updatePostBySlug,
  sendAdminAppeal,
  incrementShareCount,
  getPublicPosts,
  voteOnPoll,
  getFollowingPosts,
  getLatestPosts,
  getTrendingPosts,
  searchPosts,
} from "../Controllers/postController.js";
import {
  incrementView,
  toggleBookmark,
  toggleLike,
  getBookmarkedPosts,
  getBookmarkStatus,
} from "../Controllers/postInteractionController.js";
import {
  getPostStats,
  getUserEngagementStats,
} from "../Controllers/postAnalyticsController.js";

const router = express.Router();

// Middleware to validate ObjectIds
const validatePostId = validateObjectId("postId");

// Middleware to log errors only
const logParams = (req, res, next) => {
  try {
    next();
  } catch (err) {
    console.error("[logParams] ❌ Middleware error:", err.message, err.stack);
    next(
      err instanceof AppError
        ? err
        : new AppError("Middleware error", 500, "LogParams")
    );
  }
};

// Public routes
// GET /public/posts - Fetches public posts with pagination and optional tag filtering
router.get("/public/posts", logParams, getPublicPosts);

// GET /id-by-slug/:slug - Fetches post ID by slug
router.get("/id-by-slug/:slug", logParams, async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetPostIdBySlug");
    }
    const post = await PostModel.findOne({ slug: slug.trim().toLowerCase() })
      .select("_id")
      .lean();
    if (!post) {
      throw new AppError("Post not found", 404, "GetPostIdBySlug");
    }
    res.json({ success: true, postId: post._id });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch post ID",
            500,
            "GetPostIdBySlug"
          )
    );
  }
});

// GET /count/all - Counts all published, non-blocked posts
router.get("/count/all", logParams, async (req, res, next) => {
  try {
    const count = await PostModel.countDocuments({
      blocked: { $ne: true },
      isPublished: true,
    }).lean();
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch all posts count",
            500,
            "CountAllPosts"
          )
    );
  }
});

// Protected routes
// GET /count/my - Counts authenticated user's posts
router.get("/count/my", protectedRoute, logParams, async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError("Invalid user in request", 401, "CountMyPosts");
    }
    const count = await PostModel.countDocuments({
      author: req.user._id,
      blocked: { $ne: true },
      isPublished: true,
    }).lean();
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[Post: /count/my] Error:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch post count",
            500,
            "CountMyPosts"
          )
    );
  }
});

// GET /count/following - Counts posts from followed users
router.get(
  "/count/following",
  protectedRoute,
  logParams,
  async (req, res, next) => {
    try {
      if (!req.user?._id) {
        throw new AppError(
          "Invalid user in request",
          401,
          "CountFollowingPosts"
        );
      }
      const count = await PostModel.countDocuments({
        author: { $in: req.user.following || [] },
        blocked: { $ne: true },
        isPublished: true,
      }).lean();
      res.status(200).json({ success: true, count });
    } catch (error) {
      console.error(
        "[Post: /count/following] Error:",
        error.message,
        error.stack
      );
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to fetch following posts count",
              500,
              "CountFollowingPosts"
            )
      );
    }
  }
);

// GET /following - Fetches posts from followed users
router.get("/following", protectedRoute, logParams, getFollowingPosts);

// Post CRUD
router.post("/post-create", protectedRoute, logParams, createPost);
router.patch("/update/:slug", protectedRoute, logParams, updatePostBySlug);
router.delete(
  "/delete/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  deletePost
);
router.patch(
  "/toggle-block/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  toggleBlockPost
);
router.post(
  "/appeal/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  sendAdminAppeal
);

// Post Interactions
router.post(
  "/like/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  toggleLike
);
router.post(
  "/bookmark/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  toggleBookmark
);
router.post(
  "/time-spent/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  trackTimeSpent
);
router.post(
  "/:postId/share",
  protectedRoute,
  logParams,
  validatePostId,
  incrementShareCount
);
router.get(
  "/bookmark-status/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  getBookmarkStatus
);
router.get(
  "/get-post/bookmarks",
  protectedRoute,
  logParams,
  getBookmarkedPosts
);

// Post Analytics
router.get(
  "/analytics/post/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  getPostStats
);
router.get(
  "/analytics/user-engagement",
  protectedRoute,
  logParams,
  getUserEngagementStats
);

// Post Search & Feed
router.get("/all-post", logParams, getAllPosts);
router.get("/search-post/search", logParams, searchPosts);
router.get("/trending-post/trending", logParams, getTrendingPosts);
router.get("/latest-post/latest", logParams, getLatestPosts);
router.get("/public/:slug", logParams, getSinglePost);
router.post("/view/:slug", logParams, incrementView);
router.post("/vote", protectedRoute, logParams, voteOnPoll);

export default router;
