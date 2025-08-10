import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { validateObjectId } from "../Middlewares/validateObjectId.js";
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
  getPublicPosts,
  getPostIdBySlug,
  countAllPosts,
  countMyPosts,
  countFollowingPosts,
  incrementView,
  getDraftAndPendingPosts,
  trackGuestView,
  trackGuestVisit,
} from "../Controllers/postController.js";
import {
  searchPosts,
  getTrendingPosts,
  getLatestPosts,
  suggestPosts,
  searchUsers,
} from "../Controllers/postSearchController.js";
import {
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

// Public routes
router.get("/public/posts", getPublicPosts);
router.get("/id-by-slug/:slug", getPostIdBySlug);
router.get("/count/all", countAllPosts);
router.get("/public/:slug", getPublicPost);
router.post("/view/:slug", incrementView);

// Protected routes
router.get("/count/my", protectedRoute, countMyPosts);
router.get("/count/following", protectedRoute, countFollowingPosts);
router.get("/following", protectedRoute, getFollowingPosts);

// Post CRUD
router.post("/post-create", protectedRoute, createPost);
router.patch("/update/:slug", protectedRoute, updatePostBySlug);
router.delete("/delete/:postId", protectedRoute, validatePostId, deletePost);
router.patch(
  "/toggle-block/:postId",
  protectedRoute,
  validatePostId,
  toggleBlockPost
);
router.post("/appeal/:postId", protectedRoute, validatePostId, submitAppeal);

// Post Interactions
router.post("/like/:postId", protectedRoute, validatePostId, toggleLike);
router.post(
  "/bookmark/:postId",
  protectedRoute,
  validatePostId,
  toggleBookmark
);
router.post(
  "/time-spent/:postId",
  protectedRoute,
  validatePostId,
  trackTimeSpent
);
router.post(
  "/:postId/share",
  protectedRoute,
  validatePostId,
  incrementShareCount
);
router.get(
  "/bookmark-status/:postId",
  protectedRoute,
  validatePostId,
  getBookmarkStatus
);
router.get("/get-post/bookmarks", protectedRoute, getBookmarkedPosts);

// Post Analytics
router.get("/analytics/post/:postId", protectedRoute, getPostStats);
router.get(
  "/analytics/user-engagement",
  protectedRoute,
  getUserEngagementStats
);

// Post Search & Feed
router.get("/all-post", getAllPosts);
router.get("/search-post/search", searchPosts);
router.get("/trending-post/trending", getTrendingPosts);
router.get("/latest-post/latest", getLatestPosts);
router.get("/suggested-post/suggested", suggestPosts);
router.get("/search-users", protectedRoute, searchUsers);
router.get("/:slug", protectedRoute, getSinglePost);
router.post("/vote", protectedRoute, voteOnPoll);
router.get("/drafts", protectedRoute, getDraftAndPendingPosts);
router.post("/track-guest-view/:slug", trackGuestView);
router.post("/track-guest-visit", trackGuestVisit);

export default router;
