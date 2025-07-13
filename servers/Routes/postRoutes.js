import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { validateObjectId } from "../Middlewares/validateObjectId.js";
import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";
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

const validatePostId = validateObjectId("postId");
const validateUserId = validateObjectId("userId");

const logParams = (req, res, next) => {
  console.log(
    `[postRoutes] Route: ${req.originalUrl}, Params:`,
    req.params,
    "Query:",
    req.query
  );
  next();
};

// Public posts for guests
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
    console.log("[postRoutes] Public posts fetched:", {
      page,
      limit,
      count: posts.length,
    });
    res.json({ posts, total, page: Number(page) });
  } catch (error) {
    console.error("[postRoutes] Public posts error:", error.message);
    next(new AppError("Failed to fetch public posts", 500));
  }
});

// Get postId by slug
router.get("/id-by-slug/:slug", logParams, async (req, res, next) => {
  try {
    const { slug } = req.params;
    console.log(`[postRoutes] Fetching postId for slug: ${slug}`);
    const post = await PostModel.findOne({ slug }).select("_id").lean();
    if (!post) {
      console.error(`[postRoutes] Post not found for slug: ${slug}`);
      throw new AppError("Post not found", 404);
    }
    res.json({ success: true, postId: post._id });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
});

// Count endpoints for post counts
router.get("/count/all", logParams, async (req, res, next) => {
  try {
    const count = await PostModel.countDocuments({ blocked: { $ne: true }, isPublished: true });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[postRoutes] Count all posts error:", error.message);
    next(new AppError(error.message || "Failed to fetch all posts count", 500, "CountAllPosts"));
  }
});

router.get("/count/my", protectedRoute, logParams, async (req, res, next) => {
  try {
    const count = await PostModel.countDocuments({ author: req.user._id, blocked: { $ne: true }, isPublished: true });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[postRoutes] Count my posts error:", error.message);
    next(new AppError(error.message || "Failed to fetch my posts count", 500, "CountMyPosts"));
  }
});

router.get("/count/following", protectedRoute, logParams, async (req, res, next) => {
  try {
    const count = await PostModel.countDocuments({
      author: { $in: req.user.following || [] },
      blocked: { $ne: true },
      isPublished: true,
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[postRoutes] Count following posts error:", error.message);
    next(new AppError(error.message || "Failed to fetch following posts count", 500, "CountFollowingPosts"));
  }
});

// Following posts (Authenticated)
router.get("/following", protectedRoute, logParams, getFollowingPosts);

// Post CRUD (Authenticated)
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
  submitAppeal
);

// Post Interactions (Authenticated)
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

// Post Analytics (Authenticated)
router.get("/analytics/post/:postId", protectedRoute, logParams, getPostStats);
router.get(
  "/analytics/user-engagement",
  protectedRoute,
  logParams,
  getUserEngagementStats
);

// Post Search & Feed (Authenticated or Guest)
router.get("/all-post", logParams, getAllPosts);
router.get("/search-post/search", logParams, searchPosts);
router.get("/trending-post/trending", logParams, getTrendingPosts);
router.get("/latest-post/latest", logParams, getLatestPosts);
router.get("/suggested-post/suggested", logParams, suggestPosts);
router.get("/search-users", protectedRoute, logParams, searchUsers);
router.get("/public/:slug", logParams, getPublicPost);
router.get("/:slug", protectedRoute, logParams, getSinglePost);
router.post("/view/:slug", logParams, incrementView);
router.post("/vote", protectedRoute, logParams, voteOnPoll);

export default router;