import { recordActivity } from "../helpers/activityHelper.js";
import UserModel from "../Models/User.js";
import { createNotification } from "../utils/createNotification.js";
import { get as getCache, set as setCache, del as delCache } from "../Utils/cache.js";
import { AppError } from "../utils/AppError.js";

// Follow a user
export const followUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized: User not found in request", 401);
    }

    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    if (!targetUserId) throw new AppError("Missing target user ID", 400);
    if (userId === targetUserId) throw new AppError("You can't follow yourself", 400);

    const [me, targetUser] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(targetUserId),
    ]);

    if (!me || !targetUser) throw new AppError("User not found", 404);

    await Promise.all([
      UserModel.updateOne({ _id: userId }, { $addToSet: { following: targetUserId } }),
      UserModel.updateOne({ _id: targetUserId }, { $addToSet: { followers: userId } }),
    ]);

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
      message: `Followed ${targetUser.name}`,
    });

    // ✅ Set cache
    await setCache(`follow:${userId}:${targetUserId}`, true);

    res.status(200).json({ success: true, message: "Followed user." });
  } catch (err) {
    console.error("[followUser] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Unfollow a user
export const unfollowUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized: User not found in request", 401);
    }

    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    if (!targetUserId) throw new AppError("Missing target user ID", 400);
    if (userId === targetUserId) throw new AppError("You can't unfollow yourself", 400);

    await Promise.all([
      UserModel.updateOne({ _id: userId }, { $pull: { following: targetUserId } }),
      UserModel.updateOne({ _id: targetUserId }, { $pull: { followers: userId } }),
    ]);

    await recordActivity({
      userId,
      action: "UNFOLLOWED_USER",
      message: `Unfollowed user ${targetUserId}`,
    });

    // ✅ Clear cache
    await delCache(`follow:${userId}:${targetUserId}`);

    res.status(200).json({ success: true, message: "Unfollowed user." });
  } catch (err) {
    console.error("[unfollowUser] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Get followers
export const fetchFollowers = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId).populate(
      "followers",
      "_id name username email avatar"
    );
    if (!user) throw new AppError("User not found", 404);

    res.status(200).json({
      success: true,
      list: user.followers,
      count: user.followers.length,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Get following
export const fetchFollowing = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId).populate(
      "following",
      "_id name username email avatar"
    );
    if (!user) throw new AppError("User not found", 404);

    res.status(200).json({
      success: true,
      list: user.following,
      count: user.following.length,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Get follow status
export const getFollowStatus = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { targetUserId } = req.params;
    const cacheKey = `follow:${userId}:${targetUserId}`;

    // ✅ Check cache
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      return res.status(200).json({ success: true, isFollowing: cached === true });
    }

    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) throw new AppError("Target user not found", 404);

    const isFollowing = targetUser.followers?.includes(userId) || false;

    // ✅ Set cache
    await setCache(cacheKey, isFollowing);

    res.status(200).json({ success: true, isFollowing });
  } catch (err) {
    console.error("[getFollowStatus] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};
