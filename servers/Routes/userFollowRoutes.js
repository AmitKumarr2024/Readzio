import express from "express";

import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  fetchFollowers,
  fetchFollowing,
  followUser,
  getFollowStatus,
  unfollowUser,
} from "../Controllers/userFollowController.js";

const router = express.Router();

// Require login for all routes
router.use(protectedRoute);

// Follow / Unfollow
router.post("/:targetUserId", followUser);
router.post("/unfollow/:targetUserId", unfollowUser);

// Follow status
router.get("/status/:targetUserId", getFollowStatus);

// Followers / Following list
router.get("/followers", fetchFollowers);
router.get("/following", fetchFollowing);

export default router;