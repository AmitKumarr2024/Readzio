// Routes/adminRoutes.js
import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  getAllUsers,
  toggleBlockUser,
  toggleUserRole,
  deleteUser,
  getAllPosts,
  toggleBlockPost,
  deletePost,
} from "../Controllers/adminController.js";
import { adminOnly } from "../Middlewares/AdminMiddleware.js";

const router = express.Router();

// Protect all routes & allow only admins
router.use(protectedRoute, adminOnly);

// User Management
router.get("/users", getAllUsers);
router.patch("/users/block/:userId", toggleBlockUser);
router.patch("/users/role/:userId", toggleUserRole);
router.delete("/users/:userId", deleteUser);

// Post Management
router.get("/posts", getAllPosts);
router.patch("/posts/block/:postId", toggleBlockPost);
router.delete("/posts/:postId", deletePost);

export default router;
