import express from "express";
import {
  getPublicPosts,
  getPublicPostBySlug,
  trackGuestView,
} from "../Controllers/publicController.js";

const router = express.Router();

// Public routes (no auth required)
// GET /posts - Fetches public posts
router.get("/posts", getPublicPosts);
// GET /post/:slug - Fetches a public post by slug
router.get("/post/:slug", getPublicPostBySlug);
// POST /post/:slug/view - Tracks guest view of a post
router.post("/post/:slug/view", trackGuestView);

export default router;
