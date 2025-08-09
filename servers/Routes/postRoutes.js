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
  submitAppeal,
  incrementShareCount,
  getPublicPost,
  voteOnPoll,
  getFollowingPosts,
} from "../Controllers/postController.js";
import {
  searchPosts,
  getTrendingPosts,
  getLatestPosts,
  suggestPosts,
  searchUsers,
} from "../Controllers/postSearchController.js";
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
const validateUserId = validateObjectId("userId");

// Middleware to log only errors (not params or queries)
const logParams = (req, res, next) => {
  try {
    // No log in normal flow
    next();
  } catch (err) {
    console.error("[logParams] ❌ Middleware error:", err);
    next(err); // pass error to error handler
  }
};

// Public routes
// GET /public/posts - Fetches public posts with pagination
router.get("/public/posts", logParams, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const posts = await PostModel.find({
      isPublished: true,
      blocked: false,
    })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("title slug category author createdAt")
      .lean();
    const total = await PostModel.countDocuments({
      isPublished: true,
      blocked: false,
    });
    res.json({ posts, total, page: Number(page) });
  } catch (error) {
    next(new AppError("Failed to fetch public posts", 500));
  }
});

// GET /id-by-slug/:slug - Fetches post ID by slug
router.get("/id-by-slug/:slug", logParams, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const post = await PostModel.findOne({ slug }).select("_id").lean();
    if (!post) {
      throw new AppError("Post not found", 404);
    }
    res.json({ success: true, postId: post._id });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
});

// GET /count/all - Counts all published, non-blocked posts
router.get("/count/all", logParams, async (req, res, next) => {
  try {
    const count = await PostModel.countDocuments({
      blocked: { $ne: true },
      isPublished: true,
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(
      new AppError(
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
    if (!req.user?._id) throw new AppError("Invalid user in request", 400);
    const count = await PostModel.countDocuments({
      author: req.user._id,
      blocked: { $ne: true },
      isPublished: true,
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[Post: /count/my] Error:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to fetch post count", 500, "CountMyPosts")
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
      const count = await PostModel.countDocuments({
        author: { $in: req.user.following || [] },
        blocked: { $ne: true },
        isPublished: true,
      });
      res.status(200).json({ success: true, count });
    } catch (error) {
      next(
        new AppError(
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
// POST /post-create - Creates a new post
router.post("/post-create", protectedRoute, logParams, createPost);
// PATCH /update/:slug - Updates a post by slug
router.patch("/update/:slug", protectedRoute, logParams, updatePostBySlug);
// DELETE /delete/:postId - Deletes a post
router.delete(
  "/delete/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  deletePost
);
// PATCH /toggle-block/:postId - Toggles post block status
router.patch(
  "/toggle-block/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  toggleBlockPost
);
// POST /appeal/:postId - Submits an appeal for a blocked post
router.post(
  "/appeal/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  submitAppeal
);

// Post Interactions
// POST /like/:postId - Toggles like on a post
router.post(
  "/like/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  toggleLike
);
// POST /bookmark/:postId - Toggles bookmark on a post
router.post(
  "/bookmark/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  toggleBookmark
);
// POST /time-spent/:postId - Tracks time spent on a post
router.post(
  "/time-spent/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  trackTimeSpent
);
// POST /:postId/share - Increments share count for a post
router.post(
  "/:postId/share",
  protectedRoute,
  logParams,
  validatePostId,
  incrementShareCount
);
// GET /bookmark-status/:postId - Checks bookmark status for a post
router.get(
  "/bookmark-status/:postId",
  protectedRoute,
  logParams,
  validatePostId,
  getBookmarkStatus
);
// GET /get-post/bookmarks - Fetches bookmarked posts
router.get(
  "/get-post/bookmarks",
  protectedRoute,
  logParams,
  getBookmarkedPosts
);

// Post Analytics
// GET /analytics/post/:postId - Fetches analytics for a post
router.get("/analytics/post/:postId", protectedRoute, logParams, getPostStats);
// GET /analytics/user-engagement - Fetches user engagement stats
router.get(
  "/analytics/user-engagement",
  protectedRoute,
  logParams,
  getUserEngagementStats
);

// Post Search & Feed
// GET /all-post - Fetches all posts
router.get("/all-post", logParams, getAllPosts);
// GET /search-post/search - Searches posts
router.get("/search-post/search", logParams, searchPosts);
// GET /trending-post/trending - Fetches trending posts
router.get("/trending-post/trending", logParams, getTrendingPosts);
// GET /latest-post/latest - Fetches latest posts
router.get("/latest-post/latest", logParams, getLatestPosts);
// GET /suggested-post/suggested - Fetches suggested posts
router.get("/suggested-post/suggested", logParams, suggestPosts);
// GET /search-users - Searches users
router.get("/search-users", protectedRoute, logParams, searchUsers);
// GET /public/:slug - Fetches a public post by slug
router.get("/public/:slug", logParams, getPublicPost);
// GET /:slug - Fetches a post by slug (authenticated)
router.get("/:slug", protectedRoute, logParams, getSinglePost);
// POST /view/:slug - Increments view count for a post
router.post("/view/:slug", logParams, incrementView);
// POST /vote - Votes on a poll
router.post("/vote", protectedRoute, logParams, voteOnPoll);

export default router;
