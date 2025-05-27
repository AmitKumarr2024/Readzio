import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { blockUser, unblockUser } from "../Controllers/blockUnblockController.js";

const router = express.Router();

router.post("/block", protectedRoute, blockUser);
router.post("/unblock", protectedRoute, unblockUser);

export default router;
