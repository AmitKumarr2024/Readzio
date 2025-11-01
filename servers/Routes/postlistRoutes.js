// servers/routes/postlistRoutes.js

import express from "express";
import {
  createpostlist,
  addTopostlist,
  removeFrompostlist,
  getUserpostlists,
  getpostlistById,
  updatepostlist,
  deletepostlist,
  reorderpostlistPosts,
  getpostlistStats,
  searchpostlists,
  checkPostInpostlists,
  bulkAddTopostlist,
} from "../Controllers/postlistController.js";
import {
  protectedRoute as protect,
  optionalAuth, // ✅ Import the new middleware
} from "../Middlewares/authMiddleware.js";
import { body, param, query } from "express-validator";

const routes = express.Router();

// Public routes with optional auth (for ownership checks)
routes.get(
  "/search",
  [
    query("query")
      .trim()
      .notEmpty()
      .withMessage("Search query is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Search query must be between 2 and 100 characters"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be at least 1"),
  ],
  searchpostlists
);

// ✅ USE optionalAuth instead of no middleware
routes.get(
  "/user/:userId",
  [
    optionalAuth, // ✅ Changed from no middleware to optionalAuth
    param("userId").isMongoId().withMessage("Invalid user ID format"),
  ],
  getUserpostlists
);

// ✅ USE optionalAuth for stats too
routes.get(
  "/user/:userId/stats",
  [
    optionalAuth, // ✅ Added optionalAuth
    param("userId").isMongoId().withMessage("Invalid user ID format"),
  ],
  getpostlistStats
);

// ✅ USE optionalAuth for getting single postlist (to check private access)
routes.get(
  "/:id",
  [
    optionalAuth, // ✅ Changed from no middleware to optionalAuth
    param("id").isMongoId().withMessage("Invalid postlist ID format"),
  ],
  getpostlistById
);

// Protected routes (keep using protect)
routes.post(
  "/",
  [
    protect,
    body("name")
      .trim()
      .notEmpty()
      .withMessage("postlist name is required")
      .isLength({ max: 100 })
      .withMessage("postlist name must be less than 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
    body("isPrivate")
      .optional()
      .isBoolean()
      .withMessage("isPrivate must be a boolean"),
  ],
  createpostlist
);

routes.patch(
  "/:id",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid postlist ID format"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("postlist name cannot be empty")
      .isLength({ max: 100 })
      .withMessage("postlist name must be less than 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
    body("isPrivate")
      .optional()
      .isBoolean()
      .withMessage("isPrivate must be a boolean"),
  ],
  updatepostlist
);

routes.delete(
  "/:id",
  [protect, param("id").isMongoId().withMessage("Invalid postlist ID format")],
  deletepostlist
);

routes.post(
  "/:id/add",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid postlist ID format"),
    body("postId")
      .notEmpty()
      .withMessage("Post ID is required")
      .isMongoId()
      .withMessage("Invalid post ID format"),
  ],
  addTopostlist
);

routes.post(
  "/:id/remove",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid postlist ID format"),
    body("postId")
      .notEmpty()
      .withMessage("Post ID is required")
      .isMongoId()
      .withMessage("Invalid post ID format"),
  ],
  removeFrompostlist
);

routes.patch(
  "/:id/reorder",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid postlist ID format"),
    body("postIds")
      .isArray({ min: 1 })
      .withMessage("postIds must be a non-empty array")
      .custom((value) => {
        if (!value.every((id) => /^[0-9a-fA-F]{24}$/.test(id))) {
          return "All post IDs must be valid MongoDB ObjectIds";
        }
        return true;
      }),
  ],
  reorderpostlistPosts
);

routes.post(
  "/:id/bulk-add",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid postlist ID format"),
    body("postIds")
      .isArray({ min: 1, max: 50 })
      .withMessage("postIds must be an array with 1-50 items")
      .custom((value) => {
        if (!value.every((id) => /^[0-9a-fA-F]{24}$/.test(id))) {
          return "All post IDs must be valid MongoDB ObjectIds";
        }
        return true;
      }),
  ],
  bulkAddTopostlist
);

routes.get(
  "/check/:postId",
  [protect, param("postId").isMongoId().withMessage("Invalid post ID format")],
  checkPostInpostlists
);

export default routes;
