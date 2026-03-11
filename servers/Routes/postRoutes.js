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
  voteOnPoll,
  getFollowingPosts,
  getPostIdBySlug,
  countAllPosts,
  countMyPosts,
  countFollowingPosts,
  getDraftAndPendingPosts,
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

const validatePostId = validateObjectId("postId");

// ---------------------------------------------------------------
// PUBLIC — no auth (specific routes MUST come before /:slug)
// ---------------------------------------------------------------
router.get("/id-by-slug/:slug", getPostIdBySlug);
router.get("/count/all", countAllPosts);
router.get("/all-post", getAllPosts);
router.get("/search-post/search", searchPosts);
router.get("/trending-post/trending", getTrendingPosts);
router.get("/latest-post/latest", getLatestPosts);
router.get("/suggested-post/suggested", suggestPosts);

// ---------------------------------------------------------------
// PROTECTED — counts & feed
// ---------------------------------------------------------------
router.get("/count/my", protectedRoute, countMyPosts);
router.get("/count/following", protectedRoute, countFollowingPosts);
router.get("/following", protectedRoute, getFollowingPosts);
router.get("/drafts", protectedRoute, getDraftAndPendingPosts); // ✅ moved above /:slug

// ---------------------------------------------------------------
// POST CRUD
// ---------------------------------------------------------------
router.post("/post-create", protectedRoute, createPost);
router.patch("/update/:slug", protectedRoute, updatePostBySlug);
router.delete("/delete/:postId", protectedRoute, validatePostId, deletePost);
router.patch(
  "/toggle-block/:postId",
  protectedRoute,
  validatePostId,
  toggleBlockPost,
);
router.post("/appeal/:postId", protectedRoute, validatePostId, submitAppeal);

// ---------------------------------------------------------------
// POST INTERACTIONS
// ---------------------------------------------------------------
router.post("/like/:postId", protectedRoute, validatePostId, toggleLike);
router.post(
  "/bookmark/:postId",
  protectedRoute,
  validatePostId,
  toggleBookmark,
);
router.post(
  "/time-spent/:postId",
  protectedRoute,
  validatePostId,
  trackTimeSpent,
);
router.post(
  "/:postId/share",
  protectedRoute,
  validatePostId,
  incrementShareCount,
);
router.get(
  "/bookmark-status/:postId",
  protectedRoute,
  validatePostId,
  getBookmarkStatus,
);
router.get("/get-post/bookmarks", protectedRoute, getBookmarkedPosts);

// ---------------------------------------------------------------
// POST ANALYTICS
// ---------------------------------------------------------------
router.get("/analytics/post/:postId", protectedRoute, getPostStats);
router.get(
  "/analytics/user-engagement",
  protectedRoute,
  getUserEngagementStats,
);

// ---------------------------------------------------------------
// POLLS & SEARCH USERS
// ---------------------------------------------------------------
router.post("/vote", protectedRoute, voteOnPoll); // ✅ moved above /:slug
router.get("/search-users", protectedRoute, searchUsers);

// ---------------------------------------------------------------
// ⚠️  WILDCARD — must be absolutely LAST
// ---------------------------------------------------------------
router.get("/:slug", protectedRoute, getSinglePost);

export default router;
