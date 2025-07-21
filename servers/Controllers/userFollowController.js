import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { createNotification } from "../../servers/Utils/createNotification.js";
import { get as getCache, set as setCache, del as delCache } from "../Utils/cache.js";
import { AppError } from "../../servers/Utils/AppError.js";
import UserLocation from "../Models/UserLocation.js";
import UserModel from "../../servers/Models/User.js";
import mongoose from "mongoose";

// Allows a user to follow another user
export const followUser = async (req, res, next) => {
  try {
    // Validates authentication
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized: User not found in request", 401, "FollowUser", "User not authenticated");
    }

    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    // Validates target user ID
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid target user ID", 400, "FollowUser", "Invalid MongoDB ObjectId for target user");
    }
    if (userId === targetUserId) {
      throw new AppError("You can't follow yourself", 400, "FollowUser", "Self-follow not allowed");
    }

    // Fetches both users
    const [me, targetUser] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(targetUserId),
    ]);

    if (!me || !targetUser) {
      throw new AppError("User not found", 404, "FollowUser", "Either current user or target user does not exist");
    }

    // Updates follow relationships
    await Promise.all([
      UserModel.updateOne({ _id: userId }, { $addToSet: { following: targetUserId } }),
      UserModel.updateOne({ _id: targetUserId }, { $addToSet: { followers: userId } }),
    ]);

    // Fetches updated user data
    const updatedUser = await UserModel.findById(userId).select("following");

    // Creates notification for target user
    const notification = await createNotification({
      user: targetUserId,
      sender: userId,
      type: "follow",
    });

    // Emits notification if created
    if (notification && req.io?.to) {
      req.io.to(targetUserId).emit("newNotification", {
        notificationId: notification._id,
        type: "follow",
        userId,
      });
    }

    // Logs activity
    await recordActivity({
      userId,
      action: "FOLLOWED_USER",
      message: `Followed ${targetUser.name} from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    // Caches follow status
    await setCache(`follow:${userId}:${targetUserId}`, true);

    res.status(200).json({
      success: true,
      message: "Followed user.",
      data: { following: updatedUser.following },
    });
  } catch (error) {
    // AppError with context for following user
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to follow user", 500, "FollowUser", "Error in followUser")
    );
  }
};

// Allows a user to unfollow another user
export const unfollowUser = async (req, res, next) => {
  try {
    // Validates authentication
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized: User not found in request", 401, "UnfollowUser", "User not authenticated");
    }

    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    // Validates target user ID
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid target user ID", 400, "UnfollowUser", "Invalid MongoDB ObjectId for target user");
    }
    if (userId === targetUserId) {
      throw new AppError("You can't unfollow yourself", 400, "UnfollowUser", "Self-unfollow not allowed");
    }

    // Fetches both users
    const [me, targetUser] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(targetUserId),
    ]);

    if (!me || !targetUser) {
      throw new AppError("User not found", 404, "UnfollowUser", "Either current user or target user does not exist");
    }

    // Updates follow relationships
    await Promise.all([
      UserModel.updateOne({ _id: userId }, { $pull: { following: targetUserId } }),
      UserModel.updateOne({ _id: targetUserId }, { $pull: { followers: userId } }),
    ]);

    // Fetches updated user data
    const updatedUser = await UserModel.findById(userId).select("following");

    // Logs activity
    await recordActivity({
      userId,
      action: "UNFOLLOWED_USER",
      message: `Unfollowed user ${targetUser.name} from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    // Removes follow status from cache
    await delCache(`follow:${userId}:${targetUserId}`);

    res.status(200).json({
      success: true,
      message: "Unfollowed user.",
      data: { following: updatedUser.following },
    });
  } catch (error) {
    // AppError with context for unfollowing user
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to unfollow user", 500, "UnfollowUser", "Error in unfollowUser")
    );
  }
};

// Retrieves paginated list of followers for the authenticated user
export const fetchFollowers = async (req, res, next) => {
  try {
    // Validates authentication
    const userId = req.user._id;
    if (!userId) {
      throw new AppError("Unauthorized: User not found in request", 401, "FetchFollowers", "User not authenticated");
    }

    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 100);

    // Validates pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError("Invalid page number", 400, "FetchFollowers", "Page number must be a positive integer");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError("Invalid limit", 400, "FetchFollowers", "Limit must be a positive integer");
    }

    const skip = (pageNum - 1) * limitNum;

    // Fetches user with followers
    const user = await UserModel.findById(userId).populate({
      path: "followers",
      select: "_id name username email avatar location",
      options: { skip, limit: limitNum },
    });

    if (!user) {
      throw new AppError("User not found", 404, "FetchFollowers", "Authenticated user does not exist");
    }

    const total = user.followers.length;

    // Logs activity
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
  } catch (error) {
    // AppError with context for fetching followers
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to fetch followers", 500, "FetchFollowers", "Error in fetchFollowers")
    );
  }
};

// Retrieves paginated list of users the authenticated user is following
export const fetchFollowing = async (req, res, next) => {
  try {
    // Validates authentication
    const userId = req.user._id;
    if (!userId) {
      throw new AppError("Unauthorized: User not found in request", 401, "FetchFollowing", "User not authenticated");
    }

    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 100);

    // Validates pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError("Invalid page number", 400, "FetchFollowing", "Page number must be a positive integer");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError("Invalid limit", 400, "FetchFollowing", "Limit must be a positive integer");
    }

    const skip = (pageNum - 1) * limitNum;

    // Fetches user with following
    const user = await UserModel.findById(userId).populate({
      path: "following",
      select: "_id name username email avatar location",
      options: { skip, limit: limitNum },
    });

    if (!user) {
      throw new AppError("User not found", 404, "FetchFollowing", "Authenticated user does not exist");
    }

    const total = user.following.length;

    // Logs activity
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
  } catch (error) {
    // AppError with context for fetching following
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to fetch following", 500, "FetchFollowing", "Error in fetchFollowing")
    );
  }
};

// Checks if the authenticated user is following a target user
export const getFollowStatus = async (req, res, next) => {
  try {
    // Validates authentication
    const userId = req.user._id.toString();
    if (!userId) {
      throw new AppError("Unauthorized: User not found in request", 401, "GetFollowStatus", "User not authenticated");
    }

    const { targetUserId } = req.params;

    // Validates target user ID
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid target user ID", 400, "GetFollowStatus", "Invalid MongoDB ObjectId for target user");
    }

    // Checks cache for follow status
    const cacheKey = `follow:${userId}:${targetUserId}`;
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      return res.status(200).json({ success: true, isFollowing: cached === true });
    }

    // Fetches target user
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      throw new AppError("Target user not found", 404, "GetFollowStatus", "Target user does not exist");
    }

    // Determines follow status
    const isFollowing = targetUser.followers?.includes(userId) || false;

    // Caches result
    await setCache(cacheKey, isFollowing);

    res.status(200).json({ success: true, isFollowing });
  } catch (error) {
    // AppError with context for checking follow status
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to check follow status", 500, "GetFollowStatus", "Error in getFollowStatus")
    );
  }
};

// Retrieves paginated locations of the authenticated user's followers
export const getFollowerLocations = async (req, res, next) => {
  try {
    // Validates authentication
    const userId = req.user._id;
    if (!userId) {
      throw new AppError("Unauthorized: User not found in request", 401, "GetFollowerLocations", "User not authenticated");
    }

    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 100);

    // Validates pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError("Invalid page number", 400, "GetFollowerLocations", "Page number must be a positive integer");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError("Invalid limit", 400, "GetFollowerLocations", "Limit must be a positive integer");
    }

    // Fetches user and their followers
    const user = await UserModel.findById(userId).select("followers");
    if (!user) {
      throw new AppError("User not found", 404, "GetFollowerLocations", "Authenticated user does not exist");
    }

    const followerIds = user.followers || [];

    // Handles case with no followers
    if (!followerIds.length) {
      return res.status(200).json({
        success: true,
        list: [],
        page: pageNum,
        total: 0,
        totalPages: 0,
      });
    }

    // Fetches follower names
    const followerUsers = await UserModel.find({ _id: { $in: followerIds } }).select("_id name");
    const userIdToName = Object.fromEntries(
      followerUsers.map(u => [u._id.toString(), u.name || "Unknown"])
    );

    // Aggregates latest locations for followers
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

    // Formats location data
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
    // AppError with context for fetching follower locations
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to fetch follower locations", 500, "GetFollowerLocations", "Error in getFollowerLocations")
    );
  }
};