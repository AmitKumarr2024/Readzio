import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  fetchFollowers,
  fetchFollowing,
  followUser,
  getFollowStatus,
  unfollowUser,
  getFollowerLocations,
} from "../Controllers/userFollowController.js";

const router = express.Router();

// Protected routes for user follow operations
router.use(protectedRoute);
// POST /:targetUserId - Follows a user
router.post("/:targetUserId", followUser);
// POST /unfollow/:targetUserId - Unfollows a user
router.post("/unfollow/:targetUserId", unfollowUser);
// GET /status/:targetUserId - Checks follow status
router.get("/status/:targetUserId", getFollowStatus);
// GET /followers - Fetches user's followers
router.get("/followers", fetchFollowers);
// GET /following - Fetches users followed by the user
router.get("/following", fetchFollowing);
// GET /follower-locations - Fetches locations of followers
router.get("/follower-locations", getFollowerLocations);

export default router;