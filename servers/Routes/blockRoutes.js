import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { blockUser, unblockUser } from "../Controllers/blockUnblockController.js";

const router = express.Router();

// Protected routes for blocking/unblocking users
// POST /block-user/:id - Blocks a user
router.post("/block-user/:id", protectedRoute, blockUser);
// POST /unblock - Unblocks a user
router.post("/unblock", protectedRoute, unblockUser);

export default router;