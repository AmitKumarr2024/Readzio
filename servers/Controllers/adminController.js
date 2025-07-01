// Controllers/adminController.js
import UserModel from "../Models/User.js";
import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";
import mongoose, { Mongoose } from "mongoose";
import TrafficModel from "../Models/trafficModel.js";

// Get all users
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    console.log('[AdminController:getAllUsers] 🔍 Pagination:', { page, limit, skip });

    const users = await UserModel.find()
      .select("-password")
      .skip(skip)
      .limit(limit);

    const totalUsers = await UserModel.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    console.log('[AdminController:getAllUsers] ✅ Response:', {
      usersReturned: users.length,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });

    res.status(200).json({
      success: true,
      users,
      totalUsers,
     totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('[AdminController:getAllUsers] ❌ Error:', error.message);
    next(new AppError(error.message, 500, "Admin GetAllUsers"));
  }
};


// Block or unblock user
export const toggleBlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId);

    if (!user) throw new AppError("User not found", 404, "ToggleBlockUser");

    user.blocked = !user.blocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    console.error("❌ ToggleBlockUser Error:", error.message);
    console.error("🔥 Error Context:", error.context);
    next(error instanceof AppError ? error : new AppError(error.message, 500, "ToggleBlockUser"));
  }
};

// Promote user to admin or demote to user
// Promote user to admin or demote to user
// adminController.js
export const toggleUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'ToggleUserRole');

    if (user.role === 'admin') {
      const adminCount = await UserModel.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        throw new AppError('Cannot remove the last admin', 400, 'ToggleUserRole');
      }
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    user.isAdmin = user.role === 'admin'; // Sync isAdmin with role
    await user.save();

    console.log('[AdminController:toggleUserRole] Success', { userId, role: user.role, isAdmin: user.isAdmin });

    res.status(200).json({
      success: true,
      message: `User role changed to ${user.role}`,
    });
  } catch (error) {
    console.error('[AdminController:toggleUserRole] Error:', error.message);
    next(error instanceof AppError ? error : new AppError(error.message, 500, 'ToggleUserRole'));
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const deletedUser = await UserModel.findByIdAndDelete(userId);
    if (!deletedUser) throw new AppError("User not found", 404, "DeleteUser");

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "DeleteUser"));
  }
};

// Get all posts
export const getAllPosts = async (req, res, next) => {
  try {
    const posts = await PostModel.find().populate("author", "name email");
    res.status(200).json({ success: true, posts });
  } catch (error) {
    next(new AppError(error.message, 500, "Admin GetAllPosts"));
  }
};

// Block or unblock post
export const toggleBlockPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await PostModel.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "ToggleBlockPost");

    post.blocked = !post.blocked;

    // Fix potential likes data corruption
    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: `Post ${post.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "ToggleBlockPost"));
  }
};

// Delete post
export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const deletedPost = await PostModel.findByIdAndDelete(postId);
    if (!deletedPost) throw new AppError("Post not found", 404, "DeletePost");

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "DeletePost"));
  }
};



// Controllers/trackController.js


export const recordReadingTime = async (req, res, next) => {
  try {
    const { postId, timeSpent } = req.body;
    const userId = req.user?._id || null;

    if (!postId || typeof timeSpent !== "number" || isNaN(timeSpent)) {
      return next(
        new AppError("postId and valid timeSpent are required", 400, "RecordReadingTime")
      );
    }

    // Validate post
    const post = await PostModel.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404, "RecordReadingTime");
    }

    // Log traffic (userId can be null for guests)
    await TrafficModel.create({
      postId,
      timeSpent,
      userId,
      route: `/post/${postId}`,
      method: "GET",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Update post total timeSpent
    await PostModel.findByIdAndUpdate(postId, {
      $inc: { timeSpent },
    });

    res.status(200).json({ success: true, message: "Reading time recorded" });
  } catch (error) {
    console.error("[TrackController:recordReadingTime] ❌", {
      error,
      message: error.message,
      stack: error.stack,
    });

    // Ensure error has a message
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error?.message || "Unknown error",
            500,
            "RecordReadingTime"
          )
    );
  }
};



// Controller: getReadingDetailsByPost
export const getReadingDetailsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const trafficLogs = await TrafficModel.find({ postId }).populate("userId", "name email");

    const totalTime = trafficLogs.reduce((sum, log) => sum + (log.timeSpent || 0), 0);

    res.status(200).json({
      success: true,
      totalTimeSpent: totalTime,
      logs: trafficLogs.map(log => ({
        user: log.userId,
        timeSpent: log.timeSpent,
        at: log.timestamp,
      })),
    });
  } catch (error) {
    next(new AppError("Failed to get reading details", 500));
  }
};


// controllers/analyticsController.js


export const getSiteAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date range
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    if (start > end) {
      return next(new AppError("Invalid date range", 400, "GetSiteAnalytics"));
    }

    // Aggregate traffic data
    const trafficStats = await TrafficModel.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          totalTimeSpent: { $sum: "$timeSpent" },
          uniqueUsers: { $addToSet: "$userId" },
          uniquePosts: { $addToSet: "$postId" },
        },
      },
      {
        $project: {
          totalVisits: 1,
          totalTimeSpent: 1,
          uniqueUsersCount: { $size: "$uniqueUsers" },
          uniquePostsCount: { $size: "$uniquePosts" },
          _id: 0,
        },
      },
    ]);

    // Get top posts by time spent
    const topPosts = await TrafficModel.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$postId",
          totalTimeSpent: { $sum: "$timeSpent" },
          visitCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "post",
        },
      },
      { $unwind: "$post" },
      {
        $project: {
          postId: "$_id",
          title: "$post.title",
          totalTimeSpent: 1,
          visitCount: 1,
          _id: 0,
        },
      },
      { $sort: { totalTimeSpent: -1 } },
      { $limit: 5 },
    ]);

    // Get user activity stats
    const userStats = await UserModel.aggregate([
      {
        $lookup: {
          from: "traffics",
          localField: "_id",
          foreignField: "userId",
          as: "traffic",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          totalVisits: { $size: "$traffic" },
          totalTimeSpent: { $sum: "$traffic.timeSpent" },
        },
      },
      { $sort: { totalTimeSpent: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        traffic: trafficStats[0] || {
          totalVisits: 0,
          totalTimeSpent: 0,
          uniqueUsersCount: 0,
          uniquePostsCount: 0,
        },
        topPosts,
        topUsers: userStats,
      },
    });
  } catch (error) {
    console.error("[AnalyticsController:getSiteAnalytics] ❌ Error:", error.message);
    next(new AppError("Failed to fetch site analytics", 500, "GetSiteAnalytics"));
  }
};