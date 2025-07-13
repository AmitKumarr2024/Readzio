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

router.use(protectedRoute);

router.post("/:targetUserId", followUser);
router.post("/unfollow/:targetUserId", unfollowUser);
router.get("/status/:targetUserId", getFollowStatus);
router.get("/followers", fetchFollowers);
router.get("/following", fetchFollowing);
router.get("/follower-locations", getFollowerLocations);

export default router;