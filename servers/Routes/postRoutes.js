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
  updatePostBySlug, // New import
} from "../Controllers/postController.js";
import {
  searchPosts,
  getTrendingPosts,
  getLatestPosts,
  suggestPosts,
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
  console.log(`[postRoutes] Route: ${req.originalUrl}, Params:`, req.params);
  next();
};

// Get postId by slug
router.get("/id-by-slug/:slug", logParams, async (req, res, next) => {
  try {
    const { slug } = req.params;
    console.log(`[id-by-slug] Fetching postId for slug: ${slug}`);
    const post = await PostModel.findOne({ slug }).select("_id").lean();
    if (!post) {
      console.error(`[id-by-slug] Post not found for slug: ${slug}`);
      throw new AppError("Post not found", 404);
    }
    res.status(200).json({ success: true, postId: post._id });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
});

// Post CRUD
router.post("/post-create", protectedRoute, logParams, createPost);
router.patch("/update/:slug", protectedRoute, logParams, updatePostBySlug);
router.delete("/delete/:postId", protectedRoute, logParams, validatePostId, deletePost);
router.patch("/toggle-block/:postId", protectedRoute, logParams, validatePostId, toggleBlockPost); // New route

// Time Tracking
router.post("/time-spent/:postId", protectedRoute, logParams, validatePostId, trackTimeSpent);

// Post Interactions
router.post("/like/:postId", protectedRoute, logParams, validatePostId, toggleLike);
router.post("/bookmark/:postId", protectedRoute, logParams, validatePostId, toggleBookmark);
router.post("/view/:slug", logParams, incrementView);
router.get("/bookmark-status/:postId", protectedRoute, logParams, validatePostId, getBookmarkStatus);
router.get("/get-post/bookmarks", protectedRoute, logParams, getBookmarkedPosts);

// Post Search & Feed
router.get("/all-post", logParams, getAllPosts);
router.get("/search-post/search", protectedRoute, logParams, searchPosts);
router.get("/trending-post/trending", logParams, getTrendingPosts);
router.get("/latest-post/latest", logParams, getLatestPosts);
router.get("/suggested-post/suggested", logParams, suggestPosts);

// Post Analytics
router.get("/analytics/post/:postId", protectedRoute, logParams,  getPostStats);
router.get("/analytics/user-engagement", protectedRoute, logParams, getUserEngagementStats);

// Modified slug route
router.get("/:slug", logParams, getSinglePost);

export default router;