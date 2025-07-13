// routes/guestRoutes.js
import express from "express";
import {
  getPublicPosts,
  getPublicPostBySlug,
  trackGuestView,
} from "../Controllers/publicController.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/posts", getPublicPosts); // 👈 /api/public/posts
router.get("/post/:slug", getPublicPostBySlug); // 👈 /api/public/post/:slug
router.post("/post/:slug/view", trackGuestView); // 👈 /api/public/post/:slug/view

export default router;
