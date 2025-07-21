import asyncHandler from "express-async-handler";
import UserSubscriptionModel from "../Models/UserSubscriptionModel.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";

// Record activity helper
const recordActivity = async ({ userId, action, message, metadata }) => {
};

// Calculate badges based on user activity
export const calculateUserAchievements = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new Error("Unauthorized"));

  const user = await UserModel.findById(userId).populate("followers following");
  if (!user) return next(new Error("User not found"));

  const posts = await PostModel.find({ author: userId });
  const subscriptions = await UserSubscriptionModel.find({ userId });

  // Metrics
  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
  const followerCount = user.followers?.length || 0;
  const followingCount = user.following?.length || 0;
  const subscriptionCount = subscriptions.length;
  const longestPostTime = posts.length
    ? Math.max(...posts.map((post) => post.readingTime || 0))
    : 0;

  // Badge criteria
  const badges = [];
  if (totalViews >= 1000) badges.push("Popular Creator");
  if (totalLikes >= 500) badges.push("Crowd Favorite");
  if (totalComments >= 200) badges.push("Engagement Star");
  if (followerCount >= 100) badges.push("Influencer");
  if (followingCount >= 50) badges.push("Community Builder");
  if (subscriptionCount >= 1) badges.push("Subscriber Magnet");
  if (longestPostTime >= 10) badges.push("In-Depth Writer");

  // Update user with new badges
  user.badges = badges;
  await user.save();

  // Record activity
  await recordActivity({
    userId: userId.toString(),
    action: "ACHIEVEMENTS_UPDATED",
    message: `Updated achievements for user ${user.name}. Earned ${badges.length} badges.`,
    metadata: { badges, totalViews, totalLikes, totalComments, followerCount, subscriptionCount },
  });

  res.status(200).json({ success: true, badges, metrics: { totalViews, totalLikes, totalComments, followerCount, subscriptionCount, longestPostTime } });
});

// Get user achievements
export const getUserAchievements = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new Error("Unauthorized"));

  const user = await UserModel.findById(userId).select("badges");
  if (!user) return next(new Error("User not found"));

  res.status(200).json({ success: true, badges: user.badges || [] });
});