import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { createCategory, deleteCategory, getAllCategories, updateCategory } from "../Controllers/Category Controller.js";


const router = express.Router();

router.get("/", getAllCategories);
router.post("/", protectedRoute, createCategory);        // Restrict to admins in middleware ideally
router.patch("/:categoryId", protectedRoute, updateCategory);
router.delete("/:categoryId", protectedRoute, deleteCategory);

export default router;
