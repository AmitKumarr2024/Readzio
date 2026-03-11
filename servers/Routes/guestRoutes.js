import express from "express";
import {
  getPublicPosts,
  getPublicPostBySlug,
  trackGuestView,
  trackGuestVisit,
  searchPublicPosts,
} from "../../servers/Controllers/publicGuestController.js";
import { AppError } from "../Utils/AppError.js";

const router = express.Router();

// Middleware to validate slug
const validateSlug = (req, res, next) => {
  const { slug } = req.params;
  if (!slug || typeof slug !== "string" || slug.trim() === "") {
    return next(new AppError("Invalid post slug", 400, "ValidateSlug"));
  }
  req.params.slug = slug.trim().toLowerCase();
  next();
};

// Middleware to validate search query
const validateSearchQuery = (req, res, next) => {
  const { query } = req.query;
  if (!query || typeof query !== "string" || query.trim() === "") {
    return next(
      new AppError("Invalid search query", 400, "ValidateSearchQuery"),
    );
  }
  req.query.query = query.trim();
  next();
};

// GET  /api/public/posts           — fetch paginated public posts
router.get("/posts", getPublicPosts);

// GET  /api/public/search-posts    — search public posts (before /post/:slug to avoid conflict)
router.get("/search-posts", validateSearchQuery, searchPublicPosts);

// GET  /api/public/post/:slug      — fetch single public post by slug
router.get("/post/:slug", validateSlug, getPublicPostBySlug);

// POST /api/public/post/:slug/view — track guest view
router.post("/post/:slug/view", validateSlug, trackGuestView);

// POST /api/public/guest/visit     — track guest visit
router.post("/guest/visit", trackGuestVisit);

export default router;
