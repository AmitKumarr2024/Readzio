import express from "express";
import {
  getPublicPosts,
  getPublicPostBySlug,
  trackGuestView,
} from "../Controllers/publicController.js";
import { trackGuestVisit } from "../Controllers/publicGuestController.js";

const router = express.Router();

// GET /posts - Fetches public posts
router.get("/posts", getPublicPosts);

// GET /post/:slug - Fetches a public post by slug
router.get("/post/:slug", getPublicPostBySlug);

// POST /post/:slug/view - Tracks guest view of a post
router.post("/post/:slug/view", trackGuestView);

// ✅ POST /guest/visit - Tracks guest visit (total visit count)
router.post("/guest/visit", trackGuestVisit);

export default router;
