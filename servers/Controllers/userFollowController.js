import { recordActivity } from "../helpers/activityHelper.js";
import { createNotification } from "../utils/createNotification.js";
import { get as getCache, set as setCache, del as delCache } from "../Utils/cache.js";
import { AppError } from "../utils/AppError.js";
import UserLocation from "../Models/UserLocation.js";
import UserModel from "../Models/User.js";
import mongoose from "mongoose";

export const followUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized: User not found in request", 401, "FollowUser");
    }

    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid target user ID", 400, "FollowUser");
    }
    if (userId === targetUserId) {
      throw new AppError("You can't follow yourself", 400, "FollowUser");
    }

    const [me, targetUser] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(targetUserId),
    ]);

    if (!me || !targetUser) {
      throw new AppError("User not found", 404, "FollowUser");
    }

    await Promise.all([
      UserModel.updateOne({ _id: userId }, { $addToSet: { following: targetUserId } }),
      UserModel.updateOne({ _id: targetUserId }, { $addToSet: { followers: userId } }),
    ]);

    const updatedUser = await UserModel.findById(userId).select("following");

    const notification = await createNotification({
      user: targetUserId,
      sender: userId,
      type: "follow",
    });

    if (notification && req.io?.to) {
      req.io.to(targetUserId).emit("newNotification", {
        notificationId: notification._id,
        type: "follow",
        userId,
      });
    }

    await recordActivity({
      userId,
      action: "FOLLOWED_USER",
      message: `Followed ${targetUser.name} from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    await setCache(`follow:${userId}:${targetUserId}`, true);

    res.status(200).json({
      success: true,
      message: "Followed user.",
      data: { following: updatedUser.following },
    });
  } catch (err) {
    console.error("[followUser] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500, "FollowUser"));
  }
};

export const unfollowUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized: User not found in request", 401, "UnfollowUser");
    }

    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid target user ID", 400, "UnfollowUser");
    }
    if (userId === targetUserId) {
      throw new AppError("You can't unfollow yourself", 400, "UnfollowUser");
    }

    const [me, targetUser] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(targetUserId),
    ]);

    if (!me || !targetUser) {
      throw new AppError("User not found", 404, "UnfollowUser");
    }

    await Promise.all([
      UserModel.updateOne({ _id: userId }, { $pull: { following: targetUserId } }),
      UserModel.updateOne({ _id: targetUserId }, { $pull: { followers: userId } }),
    ]);

    const updatedUser = await UserModel.findById(userId).select("following");

    await recordActivity({
      userId,
      action: "UNFOLLOWED_USER",
      message: `Unfollowed user ${targetUser.name} from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    await delCache(`follow:${userId}:${targetUserId}`);

    res.status(200).json({
      success: true,
      message: "Unfollowed user.",
      data: { following: updatedUser.following },
    });
  } catch (err) {
    console.error("[unfollowUser] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500, "UnfollowUser"));
  }
};

export const fetchFollowers = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError("Invalid page number", 400, "FetchFollowers");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError("Invalid limit", 400, "FetchFollowers");
    }

    const skip = (pageNum - 1) * limitNum;

    const user = await UserModel.findById(userId).populate({
      path: "followers",
      select: "_id name username email avatar location",
      options: { skip, limit: limitNum },
    });

    if (!user) throw new AppError("User not found", 404, "FetchFollowers");

    const total = user.followers.length;

    await recordActivity({
      userId,
      action: "FETCHED_FOLLOWERS",
      message: `Fetched ${user.followers.length} followers from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    res.status(200).json({
      success: true,
      list: user.followers,
      count: total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("[fetchFollowers] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500, "FetchFollowers"));
  }
};

export const fetchFollowing = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError("Invalid page number", 400, "FetchFollowing");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError("Invalid limit", 400, "FetchFollowing");
    }

    const skip = (pageNum - 1) * limitNum;

    const user = await UserModel.findById(userId).populate({
      path: "following",
      select: "_id name username email avatar location",
      options: { skip, limit: limitNum },
    });

    if (!user) throw new AppError("User not found", 404, "FetchFollowing");

    const total = user.following.length;

    await recordActivity({
      userId,
      action: "FETCHED_FOLLOWING",
      message: `Fetched ${user.following.length} following from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    res.status(200).json({
      success: true,
      list: user.following,
      count: total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("[fetchFollowing] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500, "FetchFollowing"));
  }
};

export const getFollowStatus = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid target user ID", 400, "GetFollowStatus");
    }

    const cacheKey = `follow:${userId}:${targetUserId}`;
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      return res.status(200).json({ success: true, isFollowing: cached === true });
    }

    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) throw new AppError("Target user not found", 404, "GetFollowStatus");

    const isFollowing = targetUser.followers?.includes(userId) || false;

    await setCache(cacheKey, isFollowing);

    res.status(200).json({ success: true, isFollowing });
  } catch (err) {
    console.error("[getFollowStatus] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500, "GetFollowStatus"));
  }
};

export const getFollowerLocations = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError("Invalid page number", 400, "GetFollowerLocations");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError("Invalid limit", 400, "GetFollowerLocations");
    }

    const user = await UserModel.findById(req.user._id).select("followers");
    if (!user) throw new AppError("User not found", 404, "GetFollowerLocations");

    const followerIds = user.followers || [];

    if (!followerIds.length) {
      console.warn("[getFollowerLocations] No followers found for user:", req.user._id);
      return res.status(200).json({
        success: true,
        list: [],
        page: pageNum,
        total: 0,
        totalPages: 0,
      });
    }

    const followerUsers = await UserModel.find({ _id: { $in: followerIds } }).select("_id name");
    const userIdToName = Object.fromEntries(
      followerUsers.map(u => [u._id.toString(), u.name || "Unknown"])
    );

    const locations = await UserLocation.aggregate([
      { $match: { userId: { $in: followerIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$userId",
          userId: { $first: "$userId" },
          coordinates: { $first: "$coordinates" },
          city: { $first: "$city" },
          country: { $first: "$country" },
          state: { $first: "$state" },
          pincode: { $first: "$pincode" },
          timestamp: { $first: "$timestamp" },
        },
      },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]);

    const total = followerIds.length;

    if (locations.length === 0) {
      console.warn("[getFollowerLocations] No location records found for followers of user:", req.user._id);
    }

    const formatted = locations.map(loc => ({
      userId: loc.userId.toString(),
      name: userIdToName[loc.userId.toString()] || "Unknown",
      coordinates: {
        lat: loc.coordinates?.coordinates?.[1] || 0,
        lon: loc.coordinates?.coordinates?.[0] || 0,
      },
      city: loc.city || "N/A",
      country: loc.country || "N/A",
      state: loc.state || "N/A",
      pincode: loc.pincode || "N/A",
      timestamp: loc.timestamp || Date.now(),
    }));

    res.status(200).json({
      success: true,
      list: formatted,
      page: pageNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("[getFollowerLocations] Error:", error.message);
    next(error instanceof AppError ? error : new AppError(error.message, 500, "GetFollowerLocations"));
  }
};