// Controllers/adminController.js
import * as XLSX from 'xlsx';
import UserModel from "../Models/User.js";
import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";
import mongoose, { Mongoose } from "mongoose";
import TrafficModel from "../Models/trafficModel.js";
import { emitPostDeleted, emitPostUpdated } from "../sockets/socket.js";

// Get all users
export const downloadAllDataCsv = async (req, res, next) => {
     try {
       // Fetch all data
       const users = await UserModel.find({}).lean();
       const posts = await PostModel.find({}).populate("author", "name email").lean();
       const traffic = await TrafficModel.find({}).populate("userId", "name email").lean();

       // Prepare user data for Excel
       const userData = users.map(user => ({
         Name: user.name || '',
         Email: user.email || '',
         Gender: user.gender || '',
         Role: user.role || '',
         Blocked: user.blocked ? 'Yes' : 'No',
         'Created At': user.createdAt ? new Date(user.createdAt).toISOString() : '',
         Bio: user.bio || '',
         Profession: user.profession || '',
         Location: user.location || ''
       }));

       // Prepare post data for Excel
       const postData = posts.map(post => ({
         Title: post.title || '',
         'Author Name': post.author?.name || '',
         'Author Email': post.author?.email || '',
         Blocked: post.blocked ? 'Yes' : 'No',
         'Created At': post.createdAt ? new Date(post.createdAt).toISOString() : '',
         'Content Size (KB)': (Buffer.byteLength(
           post.blocks?.map(b => b.text || b.value || b.code || b.caption || "").join(" ") || "",
           "utf-8"
         ) / 1024).toFixed(2)
       }));

       // Prepare traffic data for Excel
       const trafficData = traffic.map(record => ({
         'Post ID': record.postId || '',
         'User Name': record.userId?.name || '',
         'User Email': record.userId?.email || '',
         'Time Spent (ms)': record.timeSpent || 0,
         Timestamp: record.timestamp ? new Date(record.timestamp).toISOString() : '',
         Route: record.route || '',
         IP: record.ip || '',
         'User Agent': record.userAgent || ''
       }));

       // Create a new workbook
       const wb = XLSX.utils.book_new();

       // Convert data to worksheets
       const userWs = XLSX.utils.json_to_sheet(userData);
       const postWs = XLSX.utils.json_to_sheet(postData);
       const trafficWs = XLSX.utils.json_to_sheet(trafficData);

       // Append worksheets to workbook
       XLSX.utils.book_append_sheet(wb, userWs, 'Users');
       XLSX.utils.book_append_sheet(wb, postWs, 'Posts');
       XLSX.utils.book_append_sheet(wb, trafficWs, 'Traffic');

       // Generate Excel file buffer
       const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

       // Set headers for file download
       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
       res.setHeader('Content-Disposition', 'attachment; filename="all_data_export.xlsx"');

       // Send the Excel file
       res.status(200).send(excelBuffer);
     } catch (error) {
       console.error("[AdminController:downloadAllDataCsv] ❌ Error:", error.message);
       next(new AppError("Failed to generate Excel file", 500, "DownloadAllDataExcel"));
     }
   };
   



export const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // cap to prevent overload
    const skip = (page - 1) * limit;

    const projection =
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate";

    console.log("[AdminController:getAllUsers] 🔍 Params:", {
      page,
      limit,
      skip,
    });

    const [users, totalUsers] = await Promise.all([
      UserModel.find({}).select(projection).skip(skip).limit(limit).lean(), // improves speed & memory
      UserModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    console.log("[AdminController:getAllUsers] ✅ Response Summary:", {
      usersReturned: users.length,
      totalUsers,
      totalPages,
      currentPage: page,
    });

    res.status(200).json({
      success: true,
      users,
      totalUsers,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("[AdminController:getAllUsers] ❌ Error:", error.message);
    next(new AppError(error.message, 500, "getAllUsers"));
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
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleBlockUser")
    );
  }
};

// Promote user to admin or demote to user
// Promote user to admin or demote to user
// adminController.js
export const toggleUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404, "ToggleUserRole");

    if (user.role === "admin") {
      const adminCount = await UserModel.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        throw new AppError(
          "Cannot remove the last admin",
          400,
          "ToggleUserRole"
        );
      }
    }

    user.role = user.role === "admin" ? "user" : "admin";
    user.isAdmin = user.role === "admin"; // Sync isAdmin with role
    await user.save();

    console.log("[AdminController:toggleUserRole] Success", {
      userId,
      role: user.role,
      isAdmin: user.isAdmin,
    });

    res.status(200).json({
      success: true,
      message: `User role changed to ${user.role}`,
    });
  } catch (error) {
    console.error("[AdminController:toggleUserRole] Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleUserRole")
    );
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const deletedUser = await UserModel.findByIdAndDelete(userId);
    if (!deletedUser) throw new AppError("User not found", 404, "DeleteUser");

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "DeleteUser")
    );
  }
};

// Get all posts
export const getAllPosts = async (req, res, next) => {
  try {
    const posts = await PostModel.find().populate("author", "name email");

    const postsWithSize = posts.map((post) => {
      const blocksText =
        post.blocks
          ?.map((b) => b.text || b.value || b.code || b.caption || "")
          .join(" ") || "";

      const sizeInCharacters = blocksText.length;
      const sizeInKB = Buffer.byteLength(blocksText, "utf-8") / 1024;

      return {
        ...post.toObject(),
        sizeInCharacters,
        sizeInKB: Number(sizeInKB.toFixed(2)),
      };
    });

    res.status(200).json({ success: true, posts: postsWithSize });
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
    emitPostUpdated(post);

    res.status(200).json({
      success: true,
      message: `Post ${post.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleBlockPost")
    );
  }
};

// Delete post
export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const deletedPost = await PostModel.findByIdAndDelete(postId);
    if (!deletedPost) throw new AppError("Post not found", 404, "DeletePost");
    emitPostDeleted(postId);
    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "DeletePost")
    );
  }
};

// Controllers/trackController.js

export const recordReadingTime = async (req, res, next) => {
  try {
    const { postId, timeSpent } = req.body;
    const userId = req.user?._id || null;

    if (!postId || typeof timeSpent !== "number" || isNaN(timeSpent)) {
      return next(
        new AppError(
          "postId and valid timeSpent are required",
          400,
          "RecordReadingTime"
        )
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

    const trafficLogs = await TrafficModel.find({ postId }).populate(
      "userId",
      "name email"
    );

    const totalTime = trafficLogs.reduce(
      (sum, log) => sum + (log.timeSpent || 0),
      0
    );

    res.status(200).json({
      success: true,
      totalTimeSpent: totalTime,
      logs: trafficLogs.map((log) => ({
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
    console.error(
      "[AnalyticsController:getSiteAnalytics] ❌ Error:",
      error.message
    );
    next(
      new AppError("Failed to fetch site analytics", 500, "GetSiteAnalytics")
    );
  }
};
