import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  getAllCategories,
  getUserSelectedCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedCategories,
  assignCategoriesToUser,
  checkSlugAvailability,
} from "../Controllers/CategoryController.js";

const router = express.Router();

// Public routes
// GET /all-category - Fetches all categories
router.get("/all-category", getAllCategories);
// GET /check-slug - Checks if a category slug is available
router.get("/check-slug", checkSlugAvailability);

// Protected routes
// GET /user-selected - Fetches categories selected by the authenticated user
router.get("/user-selected", protectedRoute, getUserSelectedCategories);
// POST /seed - Seeds predefined categories (admin-only, adjust middleware if needed)
router.post("/seed", protectedRoute, seedCategories);
// POST / - Creates a new category
router.post("/", protectedRoute, createCategory);
// PATCH /:categoryId - Updates a category
router.patch("/:categoryId", protectedRoute, updateCategory);
// DELETE /:categoryId - Deletes a category
router.delete("/:categoryId", protectedRoute, deleteCategory);
// POST /users/:userId/categories - Assigns categories to a user
router.post("/users/:userId/categories", protectedRoute, assignCategoriesToUser);

export default router;