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

// Public route
// GET /all-comments/:postId - Fetches comments for a post
router.get("/all-comments/:postId", getPostComments);

// Protected routes
router.use(protectedRoute);
// POST /add-comment/:postId - Adds a comment or reply to a post
router.post("/add-comment/:postId", addComment);
// POST /reaction/:commentId - Toggles a reaction on a comment
router.post("/reaction/:commentId", toggleCommentReaction);
// PUT /edit/:commentId - Edits a comment (owner only)
router.put("/edit/:commentId", editComment);
// PUT /block/:commentId - Blocks/hides a comment (owner or post author)
router.put("/block/:commentId", blockComment);
// DELETE /delete/:commentId - Deletes a comment (owner, post author, or admin)
router.delete("/delete/:commentId", deleteComment);

export default router;