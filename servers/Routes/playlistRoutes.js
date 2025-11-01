// servers/routes/playlistRoutes.js

import express from "express";
import {
  createPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  getUserPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  reorderPlaylistPosts,
  getPlaylistStats,
  searchPlaylists,
  checkPostInPlaylists,
  bulkAddToPlaylist,
} from "../../servers/Controllers/playlistController.js";
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
  searchPlaylists
);

// ✅ USE optionalAuth instead of no middleware
routes.get(
  "/user/:userId",
  [
    optionalAuth, // ✅ Changed from no middleware to optionalAuth
    param("userId").isMongoId().withMessage("Invalid user ID format"),
  ],
  getUserPlaylists
);

// ✅ USE optionalAuth for stats too
routes.get(
  "/user/:userId/stats",
  [
    optionalAuth, // ✅ Added optionalAuth
    param("userId").isMongoId().withMessage("Invalid user ID format"),
  ],
  getPlaylistStats
);

// ✅ USE optionalAuth for getting single playlist (to check private access)
routes.get(
  "/:id",
  [
    optionalAuth, // ✅ Changed from no middleware to optionalAuth
    param("id").isMongoId().withMessage("Invalid playlist ID format"),
  ],
  getPlaylistById
);

// Protected routes (keep using protect)
routes.post(
  "/",
  [
    protect,
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Playlist name is required")
      .isLength({ max: 100 })
      .withMessage("Playlist name must be less than 100 characters"),
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
  createPlaylist
);

routes.patch(
  "/:id",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid playlist ID format"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Playlist name cannot be empty")
      .isLength({ max: 100 })
      .withMessage("Playlist name must be less than 100 characters"),
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
  updatePlaylist
);

routes.delete(
  "/:id",
  [protect, param("id").isMongoId().withMessage("Invalid playlist ID format")],
  deletePlaylist
);

routes.post(
  "/:id/add",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid playlist ID format"),
    body("postId")
      .notEmpty()
      .withMessage("Post ID is required")
      .isMongoId()
      .withMessage("Invalid post ID format"),
  ],
  addToPlaylist
);

routes.post(
  "/:id/remove",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid playlist ID format"),
    body("postId")
      .notEmpty()
      .withMessage("Post ID is required")
      .isMongoId()
      .withMessage("Invalid post ID format"),
  ],
  removeFromPlaylist
);

routes.patch(
  "/:id/reorder",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid playlist ID format"),
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
  reorderPlaylistPosts
);

routes.post(
  "/:id/bulk-add",
  [
    protect,
    param("id").isMongoId().withMessage("Invalid playlist ID format"),
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
  bulkAddToPlaylist
);

routes.get(
  "/check/:postId",
  [protect, param("postId").isMongoId().withMessage("Invalid post ID format")],
  checkPostInPlaylists
);

export default routes;
