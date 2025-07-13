import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  addComment,
  getPostComments,
  toggleCommentReaction,
  editComment,
  blockComment,
  deleteComment,
} from "../Controllers/commentController.js";

const router = express.Router();

// ✅ Public route: Get comments for a post
router.get("/all-comments/:postId", getPostComments);

// All routes below this require auth
router.use(protectedRoute);

// 🔒 Add a new comment or reply
router.post("/add-comment/:postId", addComment);

// 🔒 Toggle emoji reaction
router.post("/reaction/:commentId", toggleCommentReaction);

// 🔒 Edit comment (owner only)
router.put("/edit/:commentId", editComment);

// 🔒 Block/hide comment (owner or post author)
router.put("/block/:commentId", blockComment);

// 🔒 Delete permanently (owner, post author, or admin)
router.delete("/delete/:commentId", deleteComment);

export default router;
