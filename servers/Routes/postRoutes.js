import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

import {
  createPost,
  getAllPosts,
  getSinglePost,
  updatePost,
  deletePost,
} from "../Controllers/postController.js";




import {
  searchPosts,
  getTrendingPosts,
  getLatestPosts,
} from "../Controllers/postSearchController.js";


import { incrementView, toggleBookmark, toggleLike } from "../Controllers/postInteractionController.js";
import { getPostStats, getUserEngagementStats } from "../Controllers/postAnalyticsController.js";

const router = express.Router();

// Post CRUD
router.post("/post-create", protectedRoute, createPost);
router.get("/all-post", getAllPosts);
router.get("/:slug", getSinglePost);
router.patch("/post-update/:postId", protectedRoute, updatePost);
router.delete("/post-delete/:postId", protectedRoute, deletePost);

// Post interactions
router.post("/toggle-like/:postId", protectedRoute, toggleLike);
router.post("/post-bookmark/:postId", protectedRoute, toggleBookmark);
router.post("/view/:postId", incrementView);


// Post search & filters
router.get("/search-post/search",protectedRoute, searchPosts); // e.g. /search?q=keyword&category=tech
router.get("/trending-post/trending",protectedRoute, getTrendingPosts);
router.get("/latest-post/latest",protectedRoute, getLatestPosts);

// Analytics (protected)
router.get("/analytics/post/:postId", protectedRoute, getPostStats);
router.get("/analytics/user-engagement", protectedRoute, getUserEngagementStats);

export default router;
