import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { createCategory, deleteCategory, getAllCategories, updateCategory } from "../Controllers/Category Controller.js";


const router = express.Router();

router.get("/AllCategories", getAllCategories);
router.post("/create-Category", protectedRoute, createCategory);        // Restrict to admins in middleware ideally
router.patch("/update-Category/:categoryId", protectedRoute, updateCategory);
router.delete("/delete-Category/:categoryId", protectedRoute, deleteCategory);

export default router;
