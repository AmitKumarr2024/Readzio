import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

import {
  createPost,
  getAllPosts,
  getSinglePost,
  updatePost,
  deletePost,
  getSubscribedPosts,
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
router.post("/", protectedRoute, createPost);
router.get("/", getAllPosts);
router.get("/:slug", getSinglePost);
router.patch("/:postId", protectedRoute, updatePost);
router.delete("/:postId", protectedRoute, deletePost);

// Post interactions
router.post("/:postId/like", protectedRoute, toggleLike);
router.post("/:postId/bookmark", protectedRoute, toggleBookmark);
router.post("/:postId/view", incrementView);

// Subscribed posts
router.get("/subscribed/posts", protectedRoute, getSubscribedPosts);

// Post search & filters
router.get("/search", searchPosts); // e.g. /search?q=keyword&category=tech
router.get("/trending", getTrendingPosts);
router.get("/latest", getLatestPosts);

// Analytics (protected)
router.get("/analytics/post/:postId", protectedRoute, getPostStats);
router.get("/analytics/user-engagement", protectedRoute, getUserEngagementStats);

export default router;
