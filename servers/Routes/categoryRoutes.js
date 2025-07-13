// routes/categoryRoutes.js
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
  checkSlugAvailability, // Add import
} from "../Controllers/CategoryController.js";

const router = express.Router();

// Public route to get all categories (for category management)
router.get("/all-category", getAllCategories);

// Protected route to get user-selected categories
router.get("/user-selected", protectedRoute, getUserSelectedCategories);

// Protected route to seed predefined categories (admin-only, adjust middleware if needed)
router.post("/seed", protectedRoute, seedCategories);

// Public slug check endpoint
router.get("/check-slug", checkSlugAvailability);

// Protected routes for category CRUD
router.post("/", protectedRoute, createCategory);
router.patch("/:categoryId", protectedRoute, updateCategory);
router.delete("/:categoryId", protectedRoute, deleteCategory);

// Protected route to assign categories to a user
router.post(
  "/users/:userId/categories",
  protectedRoute,
  assignCategoriesToUser
);

export default router;
