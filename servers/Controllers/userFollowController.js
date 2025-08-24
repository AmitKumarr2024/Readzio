import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { createNotification } from "../../servers/Utils/createNotification.js";
import {
  get as getCache,
  set as setCache,
  del as delCache,
} from "../Utils/cache.js";
import { AppError } from "../../servers/Utils/AppError.js";
import UserLocation from "../Models/UserLocation.js";
import UserModel from "../../servers/Models/User.js";
import mongoose from "mongoose";
import { logMemory } from "../../servers/Utils/memoryLogger.js";

// ✅ Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// ✅ Helper function to validate user authentication
const validateAuth = (req) => {
  if (!req.user || !req.user._id) {
    throw new AppError(
      "Unauthorized: User not found in request",
      401,
      "Auth",
      "User not authenticated"
    );
  }
  return req.user._id.toString();
};

// ✅ Helper function to validate pagination
const validatePagination = (page, limit) => {
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 12, 1), 100);

  if (isNaN(pageNum) || pageNum < 1) {
    throw new AppError(
      "Invalid page number",
      400,
      "Pagination",
      "Page number must be a positive integer"
    );
  }
  if (isNaN(limitNum) || limitNum < 1) {
    throw new AppError(
      "Invalid limit",
      400,
      "Pagination",
      "Limit must be a positive integer"
    );
  }

  return { pageNum, limitNum };
};

// Allows a user to follow another user
export const followUser = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    logMemory("🤝 Start followUser");

    const userId = validateAuth(req);
    const { targetUserId } = req.params;

    // ✅ Enhanced validation
    if (!isValidObjectId(targetUserId)) {
      throw new AppError(
        "Invalid target user ID",
        400,
        "FollowUser",
        "Invalid MongoDB ObjectId for target user"
      );
    }

    if (userId === targetUserId) {
      throw new AppError(
        "You cannot follow yourself",
        400,
        "FollowUser",
        "Self-follow not allowed"
      );
    }

    // ✅ Start transaction for data consistency
    session.startTransaction();

    // ✅ Check if already following (prevent duplicate follows)
    logMemory("🔍 Checking existing follow relationship");
    const existingFollow = await UserModel.findOne(
      {
        _id: userId,
        following: targetUserId,
      },
      null,
      { session }
    );

    if (existingFollow) {
      await session.abortTransaction();
      return res.status(200).json({
        success: true,
        message: "Already following this user.",
        data: { isFollowing: true },
      });
    }

    // ✅ Verify both users exist in single query
    logMemory("📖 Verifying users exist");
    const [currentUser, targetUser] = await Promise.all([
      UserModel.findById(userId, "_id name", { session }),
      UserModel.findById(targetUserId, "_id name followers", { session }),
    ]);

    if (!currentUser) {
      throw new AppError(
        "Current user not found",
        404,
        "FollowUser",
        "Current user does not exist"
      );
    }

    if (!targetUser) {
      throw new AppError(
        "Target user not found",
        404,
        "FollowUser",
        "Target user does not exist"
      );
    }

    // ✅ Update both users atomically
    logMemory("💾 Updating follow relationships");
    const [updateResult1, updateResult2] = await Promise.all([
      UserModel.updateOne(
        { _id: userId },
        { $addToSet: { following: targetUserId } },
        { session }
      ),
      UserModel.updateOne(
        { _id: targetUserId },
        { $addToSet: { followers: userId } },
        { session }
      ),
    ]);

    // ✅ Check if updates were successful
    if (updateResult1.matchedCount === 0 || updateResult2.matchedCount === 0) {
      throw new AppError(
        "Failed to update follow relationships",
        500,
        "FollowUser",
        "Database update failed"
      );
    }

    // ✅ Get updated following count efficiently
    const updatedFollowingCount = await UserModel.findById(
      userId,
      "following",
      { session }
    );

    await session.commitTransaction();

    // ✅ Handle post-transaction operations
    try {
      // Create notification (non-blocking)
      const notificationPromise = createNotification({
        user: targetUserId,
        sender: userId,
        type: "follow",
      }).catch((err) => {
        console.error("Failed to create follow notification:", err.message);
      });

      // Update cache
      const cacheKey = `follow:${userId}:${targetUserId}`;
      try {
        setCache(cacheKey, isFollowing, 300);

      } catch (err) {
        console.error("Failed to cache follow status:", err.message);
      }

      // Record activity
      const activityPromise = recordActivity({
        userId,
        action: "FOLLOWED_USER",
        message: `Followed ${targetUser.name} from ${
          req.geoLocation
            ? `${req.geoLocation.city}, ${req.geoLocation.country}`
            : "unknown location"
        }`,
      }).catch((err) => {
        console.error("Failed to record follow activity:", err.message);
      });

      // Wait for notification creation to emit socket event
      const notification = await notificationPromise;

      // ✅ Emit notification if created
      if (notification && req.io?.to) {
        logMemory("📡 Emitting notification");
        req.io.to(targetUserId).emit("newNotification", {
          notificationId: notification._id,
          type: "follow",
          userId,
        });
      }

      // Handle cache and activity in background
    Promise.allSettled([activityPromise]);
    } catch (postTransactionError) {
      console.error(
        "Post-transaction operations failed:",
        postTransactionError.message
      );
      // Don't fail the main operation for these auxiliary operations
    }

    logMemory("🤝 End followUser");
    res.status(200).json({
      success: true,
      message: "Successfully followed user.",
      data: {
        isFollowing: true,
        followingCount: updatedFollowingCount?.following?.length || 0,
      },
    });
  } catch (error) {
    logMemory("❌ Error in followUser");
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to follow user",
            500,
            "FollowUser",
            "Error in followUser"
          )
    );
  } finally {
    session.endSession();
  }
};

// Allows a user to unfollow another user
export const unfollowUser = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    logMemory("🚫 Start unfollowUser");

    const userId = validateAuth(req);
    const { targetUserId } = req.params;

    // ✅ Enhanced validation
    if (!isValidObjectId(targetUserId)) {
      throw new AppError(
        "Invalid target user ID",
        400,
        "UnfollowUser",
        "Invalid MongoDB ObjectId for target user"
      );
    }

    if (userId === targetUserId) {
      throw new AppError(
        "You cannot unfollow yourself",
        400,
        "UnfollowUser",
        "Self-unfollow not allowed"
      );
    }

    session.startTransaction();

    // ✅ Check if actually following
    logMemory("🔍 Checking follow relationship");
    const isFollowing = await UserModel.findOne(
      {
        _id: userId,
        following: targetUserId,
      },
      null,
      { session }
    );

    if (!isFollowing) {
      await session.abortTransaction();
      return res.status(200).json({
        success: true,
        message: "Not following this user.",
        data: { isFollowing: false },
      });
    }

    // ✅ Verify users exist
    logMemory("📖 Verifying users exist");
    const [currentUser, targetUser] = await Promise.all([
      UserModel.findById(userId, "_id name", { session }),
      UserModel.findById(targetUserId, "_id name", { session }),
    ]);

    if (!currentUser || !targetUser) {
      throw new AppError(
        "User not found",
        404,
        "UnfollowUser",
        "Either current user or target user does not exist"
      );
    }

    // ✅ Update both users atomically
    logMemory("💾 Updating follow relationships");
    const [updateResult1, updateResult2] = await Promise.all([
      UserModel.updateOne(
        { _id: userId },
        { $pull: { following: targetUserId } },
        { session }
      ),
      UserModel.updateOne(
        { _id: targetUserId },
        { $pull: { followers: userId } },
        { session }
      ),
    ]);

    if (updateResult1.matchedCount === 0 || updateResult2.matchedCount === 0) {
      throw new AppError(
        "Failed to update follow relationships",
        500,
        "UnfollowUser",
        "Database update failed"
      );
    }

    const updatedFollowingCount = await UserModel.findById(
      userId,
      "following",
      { session }
    );

    await session.commitTransaction();

    // ✅ Handle post-transaction operations
    try {
      // Remove from cache and record activity
      const cachePromise = delCache(`follow:${userId}:${targetUserId}`).catch(
        (err) => {
          console.error("Failed to remove follow cache:", err.message);
        }
      );

      const activityPromise = recordActivity({
        userId,
        action: "UNFOLLOWED_USER",
        message: `Unfollowed ${targetUser.name} from ${
          req.geoLocation
            ? `${req.geoLocation.city}, ${req.geoLocation.country}`
            : "unknown location"
        }`,
      }).catch((err) => {
        console.error("Failed to record unfollow activity:", err.message);
      });

      Promise.allSettled([cachePromise, activityPromise]);
    } catch (postTransactionError) {
      console.error(
        "Post-transaction operations failed:",
        postTransactionError.message
      );
    }

    logMemory("🚫 End unfollowUser");
    res.status(200).json({
      success: true,
      message: "Successfully unfollowed user.",
      data: {
        isFollowing: false,
        followingCount: updatedFollowingCount?.following?.length || 0,
      },
    });
  } catch (error) {
    logMemory("❌ Error in unfollowUser");
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to unfollow user",
            500,
            "UnfollowUser",
            "Error in unfollowUser"
          )
    );
  } finally {
    session.endSession();
  }
};

// Retrieves paginated list of followers for the authenticated user
export const fetchFollowers = async (req, res, next) => {
  try {
    logMemory("👥 Start fetchFollowers");

    const userId = validateAuth(req);
    const { page = 1, limit = 12 } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);

    const skip = (pageNum - 1) * limitNum;

    // ✅ Use aggregation for better performance with large datasets
    logMemory("📖 Fetching followers with aggregation");
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "followers",
          foreignField: "_id",
          as: "followerDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                email: 1,
                avatar: 1,
                location: 1,
              },
            },
            { $skip: skip },
            { $limit: limitNum },
          ],
        },
      },
      {
        $project: {
          followers: "$followerDetails",
          totalFollowers: { $size: "$followers" },
        },
      },
    ];

    const result = await UserModel.aggregate(pipeline);

    if (!result || result.length === 0) {
      throw new AppError(
        "User not found",
        404,
        "FetchFollowers",
        "Authenticated user does not exist"
      );
    }

    const { followers, totalFollowers } = result[0];

    // ✅ Record activity in background
    recordActivity({
      userId,
      action: "FETCHED_FOLLOWERS",
      message: `Fetched ${followers.length} followers from ${
        req.geoLocation
          ? `${req.geoLocation.city}, ${req.geoLocation.country}`
          : "unknown location"
      }`,
    }).catch((err) => {
      console.error("Failed to record fetchFollowers activity:", err.message);
    });

    logMemory("👥 End fetchFollowers");
    res.status(200).json({
      success: true,
      list: followers,
      count: followers.length,
      total: totalFollowers,
      page: pageNum,
      totalPages: Math.ceil(totalFollowers / limitNum),
    });
  } catch (error) {
    logMemory("❌ Error in fetchFollowers");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch followers",
            500,
            "FetchFollowers",
            "Error in fetchFollowers"
          )
    );
  }
};

// Retrieves paginated list of users the authenticated user is following
export const fetchFollowing = async (req, res, next) => {
  try {
    logMemory("👥 Start fetchFollowing");

    const userId = validateAuth(req);
    const { page = 1, limit = 12 } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);

    const skip = (pageNum - 1) * limitNum;

    // ✅ Use aggregation for better performance
    logMemory("📖 Fetching following with aggregation");
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "following",
          foreignField: "_id",
          as: "followingDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                email: 1,
                avatar: 1,
                location: 1,
              },
            },
            { $skip: skip },
            { $limit: limitNum },
          ],
        },
      },
      {
        $project: {
          following: "$followingDetails",
          totalFollowing: { $size: "$following" },
        },
      },
    ];

    const result = await UserModel.aggregate(pipeline);

    if (!result || result.length === 0) {
      throw new AppError(
        "User not found",
        404,
        "FetchFollowing",
        "Authenticated user does not exist"
      );
    }

    const { following, totalFollowing } = result[0];

    // ✅ Record activity in background
    recordActivity({
      userId,
      action: "FETCHED_FOLLOWING",
      message: `Fetched ${following.length} following from ${
        req.geoLocation
          ? `${req.geoLocation.city}, ${req.geoLocation.country}`
          : "unknown location"
      }`,
    }).catch((err) => {
      console.error("Failed to record fetchFollowing activity:", err.message);
    });

    logMemory("👥 End fetchFollowing");
    res.status(200).json({
      success: true,
      list: following,
      count: following.length,
      total: totalFollowing,
      page: pageNum,
      totalPages: Math.ceil(totalFollowing / limitNum),
    });
  } catch (error) {
    logMemory("❌ Error in fetchFollowing");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch following",
            500,
            "FetchFollowing",
            "Error in fetchFollowing"
          )
    );
  }
};

// Checks if the authenticated user is following a target user
export const getFollowStatus = async (req, res, next) => {
  try {
    logMemory("🔍 Start getFollowStatus");

    const userId = validateAuth(req);
    const { targetUserId } = req.params;

    if (!isValidObjectId(targetUserId)) {
      throw new AppError(
        "Invalid target user ID",
        400,
        "GetFollowStatus",
        "Invalid MongoDB ObjectId for target user"
      );
    }

    // ✅ Check cache first
    logMemory("📊 Checking cache for follow status");
    const cacheKey = `follow:${userId}:${targetUserId}`;
    const cached = await getCache(cacheKey);

    if (cached !== null) {
      logMemory("📊 Cache hit for follow status");
      return res.status(200).json({
        success: true,
        isFollowing: cached === true,
        source: "cache",
      });
    }

    // ✅ More efficient database query
    logMemory("📖 Checking follow status in database");
    const followStatus = await UserModel.findOne(
      {
        _id: userId,
        following: targetUserId,
      },
      "_id"
    ).lean();

    const isFollowing = !!followStatus;

    // ✅ Cache the result with TTL
    logMemory("📊 Caching follow status");
    try {
      setCache(cacheKey, isFollowing, 300);

    } catch (err) {
      console.error("Failed to cache follow status:", err.message);
    }

    logMemory("🔍 End getFollowStatus");
    res.status(200).json({
      success: true,
      isFollowing,
      source: "database",
    });
  } catch (error) {
    logMemory("❌ Error in getFollowStatus");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to check follow status",
            500,
            "GetFollowStatus",
            "Error in getFollowStatus"
          )
    );
  }
};

// Retrieves paginated locations of the authenticated user's followers
export const getFollowerLocations = async (req, res, next) => {
  try {
    logMemory("📍 Start getFollowerLocations");

    const userId = validateAuth(req);
    const { page = 1, limit = 12 } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);

    // ✅ Get followers efficiently
    logMemory("📖 Fetching user followers");
    const user = await UserModel.findById(userId, "followers").lean();

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "GetFollowerLocations",
        "Authenticated user does not exist"
      );
    }

    const followerIds = user.followers || [];

    if (!followerIds.length) {
      logMemory("📍 No followers found");
      return res.status(200).json({
        success: true,
        list: [],
        page: pageNum,
        total: 0,
        totalPages: 0,
      });
    }

    // ✅ Optimized aggregation pipeline
    logMemory("📖 Aggregating follower locations");
    const pipeline = [
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
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $addFields: {
          name: { $ifNull: [{ $first: "$userInfo.name" }, "Unknown"] },
        },
      },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          userId: { $toString: "$userId" },
          name: 1,
          coordinates: {
            lat: {
              $ifNull: [{ $arrayElemAt: ["$coordinates.coordinates", 1] }, 0],
            },
            lon: {
              $ifNull: [{ $arrayElemAt: ["$coordinates.coordinates", 0] }, 0],
            },
          },
          city: { $ifNull: ["$city", "N/A"] },
          country: { $ifNull: ["$country", "N/A"] },
          state: { $ifNull: ["$state", "N/A"] },
          pincode: { $ifNull: ["$pincode", "N/A"] },
          timestamp: { $ifNull: ["$timestamp", new Date()] },
        },
      },
    ];

    const locations = await UserLocation.aggregate(pipeline);
    const total = followerIds.length;

    logMemory("📍 End getFollowerLocations");
    res.status(200).json({
      success: true,
      list: locations,
      page: pageNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logMemory("❌ Error in getFollowerLocations");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch follower locations",
            500,
            "GetFollowerLocations",
            "Error in getFollowerLocations"
          )
    );
  }
};
