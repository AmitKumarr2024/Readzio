// Router file (unchanged, as no fixes needed)
import express from "express";
import {
  getPublicPosts,
  getPublicPostBySlug,
  trackGuestView,
  trackGuestVisit,
  searchPublicPosts,
} from "../../servers/Controllers/publicGuestController.js";

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
      new AppError("Invalid search query", 400, "ValidateSearchQuery")
    );
  }
  req.query.query = query.trim();
  next();
};

// GET /public/posts - Fetches public posts
router.get("/public/posts", getPublicPosts);

// GET /public/post/:slug - Fetches a public post by slug
router.get("/public/post/:slug", validateSlug, getPublicPostBySlug);

// POST /public/post/:slug/view - Tracks guest view of a post
router.post("/public/post/:slug/view", validateSlug, trackGuestView);

// POST /guest/visit - Tracks guest visit
router.post("/guest/visit", trackGuestVisit);

// GET /public/search-posts - Searches public posts
router.get("/public/search-posts", validateSearchQuery, searchPublicPosts);

export default router;
