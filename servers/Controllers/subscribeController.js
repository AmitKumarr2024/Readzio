import { recordActivity } from "../helpers/activityHelper.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import mongoose from "mongoose";

// Follow a user
export const followUser = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    console.log("[followUser] Request by:", userId, "Target:", targetUserId);

    if (userId === targetUserId)
      throw new AppError("You can't follow yourself", 400);

    const [me, targetUser] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(targetUserId),
    ]);

    if (!me || !targetUser) throw new AppError("User not found", 404);

    await Promise.all([
      UserModel.updateOne(
        { _id: userId },
        { $addToSet: { following: targetUserId } }
      ),
      UserModel.updateOne(
        { _id: targetUserId },
        { $addToSet: { followers: userId } }
      ),
    ]);

    console.log(`[followUser] ${userId} followed ${targetUserId}`);

    await recordActivity({
      userId,
      action: "FOLLOWED_USER",
      message: `Followed ${targetUser.name}`,
    });

    res.status(200).json({ success: true, message: "Followed user." });
  } catch (err) {
    console.error("[followUser] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Unfollow a user
export const unfollowUser = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    console.log("[unfollowUser] Request by:", userId, "Target:", targetUserId);

    await Promise.all([
      UserModel.updateOne(
        { _id: userId },
        { $pull: { following: targetUserId } }
      ),
      UserModel.updateOne(
        { _id: targetUserId },
        { $pull: { followers: userId } }
      ),
    ]);

    console.log(`[unfollowUser] ${userId} unfollowed ${targetUserId}`);

    await recordActivity({
      userId,
      action: "UNFOLLOWED_USER",
      message: `Unfollowed user ${targetUserId}`,
    });

    res.status(200).json({ success: true, message: "Unfollowed user." });
  } catch (err) {
    console.error("[unfollowUser] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Subscribe to author
export const subscribeToAuthor = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { authorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return next(new AppError("Invalid author ID", 400));
    }

    if (userId === authorId) {
      return next(new AppError("You can't subscribe to yourself", 400));
    }

    const [user, author] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(authorId),
    ]);

    if (!user) return next(new AppError("User not found", 404));
    if (!author) return next(new AppError("Author not found", 404));

    // Check if already subscribed
    if (user.subscribedAuthors.includes(authorId)) {
      return next(new AppError("Already subscribed to this author", 400));
    }

    // Add subscription
    user.subscribedAuthors.push(authorId);

    // Make sure author's subscribers array exists
    if (!Array.isArray(author.subscribers)) {
      author.subscribers = [];
    }

    // Add user to author's subscribers if not already there
    if (!author.subscribers.includes(userId)) {
      author.subscribers.push(userId);
    }

    await Promise.all([user.save(), author.save()]);

    await recordActivity({
      userId,
      action: "SUBSCRIBED_TO_AUTHOR",
      message: `Subscribed to author ${author.name || authorId}`,
      targetUser: authorId,
    });

    res.status(200).json({
      success: true,
      message: `Subscribed to author ${author.name || authorId} successfully`,
      subscribedAuthors: user.subscribedAuthors,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Unsubscribe from an author
export const unsubscribeFromAuthor = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { authorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return next(new AppError("Invalid author ID", 400));
    }

    if (userId === authorId) {
      return next(new AppError("You can't unsubscribe from yourself", 400));
    }

    const [user, author] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(authorId),
    ]);

    if (!user) return next(new AppError("User not found", 404));
    if (!author) return next(new AppError("Author not found", 404));

    // Ensure arrays exist
    user.subscribedAuthors = Array.isArray(user.subscribedAuthors)
      ? user.subscribedAuthors
      : [];
    author.subscribers = Array.isArray(author.subscribers)
      ? author.subscribers
      : [];

    // Filter out the authorId/userId
    user.subscribedAuthors = user.subscribedAuthors.filter(
      (id) => id.toString() !== authorId
    );
    author.subscribers = author.subscribers.filter(
      (id) => id.toString() !== userId
    );

    await Promise.all([user.save(), author.save()]);

    await recordActivity({
      userId,
      action: "UNSUBSCRIBED_FROM_AUTHOR",
      message: `Unsubscribed from author ${author.name || authorId}`,
      targetUser: authorId,
    });

    res.status(200).json({
      success: true,
      message: `Unsubscribed from author ${
        author.name || authorId
      } successfully`,
      subscribedAuthors: user.subscribedAuthors,
    });
  } catch (err) {
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
    console.error("[fetchFollowers] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Get following
export const fetchFollowing = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log("[fetchFollowing] userId:", userId);

    const user = await UserModel.findById(userId).populate(
      "following",
      "_id name username email avatar"
    );
    if (!user) throw new AppError("User not found", 404);

    console.log("[fetchFollowing] count:", user.following.length);

    res.status(200).json({
      success: true,
      list: user.following,
      count: user.following.length,
    });
  } catch (err) {
    console.error("[fetchFollowing] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};

// Get subscription status
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { authorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid author ID" });
    }

    const user = await UserModel.findById(userId)
      .select("subscribedAuthors")
      .lean();
    const author = await UserModel.findById(authorId)
      .select("hasSubscriptionPlan subscribers")
      .lean();

    if (!author) {
      return res
        .status(404)
        .json({ success: false, message: "Author not found" });
    }

    // Convert authorId string to ObjectId to correctly compare
    const authorObjectId = new mongoose.Types.ObjectId(authorId);

    const isSubscribed =
      user?.subscribedAuthors?.some((subscribedId) =>
        subscribedId.equals(authorObjectId)
      ) || false;

    const isSubscriptionPlanEnabled = Boolean(author.hasSubscriptionPlan);
    const subscribers = Array.isArray(author.subscribers)
      ? author.subscribers.length
      : 0;

    console.log("[getSubscriptionStatus] Computed:", {
      isSubscribed,
      isSubscriptionPlanEnabled,
      subscribers,
    });

    res.status(200).json({
      success: true,
      isSubscribed,
      isSubscriptionPlanEnabled,
      subscribers,
    });
  } catch (err) {
    console.error("getSubscriptionStatus Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get follow status
export const getFollowStatus = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { targetUserId } = req.params;

    console.log(
      "[getFollowStatus] userId:",
      userId,
      "targetUserId:",
      targetUserId
    );

    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) throw new AppError("Target user not found", 404);

    const isFollowing = targetUser.followers?.includes(userId) || false;

    res.status(200).json({
      success: true,
      isFollowing,
    });
  } catch (err) {
    console.error("[getFollowStatus] Error:", err);
    next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
};
