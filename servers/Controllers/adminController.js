import * as XLSX from "xlsx";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import PaymentModel from "../../servers/Models/PaymentModel.js";
import TrafficModel from "../../servers/Models/trafficModel.js";
import SubscriptionConfig from "../../servers/Models/SubscriptionConfigModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import mongoose from "mongoose";
import {
  emitPostDeleted,
  emitPostUpdated,
} from "../../servers/sockets/socket.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import SubscriptionPlan from "../../servers/Models/SubscriptionPlan.js";
import UserSubscription from "../../servers/Models/UserSubscription.js";
import UserSubscriptionPlan from "../../servers/Models/UserSubscriptionModel.js";

// Validates ObjectId and throws AppError with context for invalid IDs
const validateObjectId = (id, type = "ID") => {
  // console.log(`[validateObjectId] 🔍 Validating ${type}:`, id);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid ${type}`,
      400,
      "ValidateObjectId",
      `Invalid ${type} provided`
    );
  }
};

// Fetches all users with pagination
export const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    // console.log("[AdminController:getAllUsers] 🔍 Params:", {
    //   page,
    //   limit,
    //   skip,
    // });

    const projection =
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate isEligibleForSubscription";

    const [users, totalUsers] = await Promise.all([
      UserModel.find({}).select(projection).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(),
    ]);
    // console.log(
    //   "[AdminController:getAllUsers] 📊 Users fetched:",
    //   users.length,
    //   "Total:",
    //   totalUsers
    // );

    const totalPages = Math.ceil(totalUsers / limit);
    // console.log("[AdminController:getAllUsers] 📄 Total pages:", totalPages);

    res.status(200).json({
      success: true,
      users,
      totalUsers,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error(
      "[AdminController:getAllUsers] ❌ Error:",
      error.message,
      error.stack
    );
    // Uses AppError to provide context and user-friendly message
    next(
      new AppError(error.message, 500, "GetAllUsers", "Failed to fetch users")
    );
  }
};

// Toggles user block status
export const toggleBlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    // console.log("[AdminController:toggleBlockUser] 🔍 User ID:", userId);

    const user = await UserModel.findById(userId);
    // console.log("[AdminController:toggleBlockUser] 👤 User found:", !!user);

    if (!user)
      throw new AppError(
        "User not found",
        404,
        "ToggleBlockUser",
        "User does not exist"
      );

    user.blocked = !user.blocked;
    await user.save();
    // console.log(
    //   "[AdminController:toggleBlockUser] 🔄 Blocked status:",
    //   user.blocked
    // );

    res.status(200).json({
      success: true,
      message: `User ${user.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    console.error(
      "[AdminController:toggleBlockUser] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError includes context for debugging and user message
    next(
      new AppError(
        error.message,
        500,
        "ToggleBlockUser",
        "Failed to toggle user block status"
      )
    );
  }
};

// Toggles user role between admin and user
export const toggleUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    // console.log("[AdminController:toggleUserRole] 🔍 User ID:", userId);

    const user = await UserModel.findById(userId);
    // console.log("[AdminController:toggleUserRole] 👤 User found:", !!user);

    if (!user)
      throw new AppError(
        "User not found",
        404,
        "ToggleUserRole",
        "User does not exist"
      );

    if (user.role === "admin") {
      const adminCount = await UserModel.countDocuments({ role: "admin" });
      // console.log(
      //   "[AdminController:toggleUserRole] 👑 Admin count:",
      //   adminCount
      // );
      if (adminCount <= 1) {
        throw new AppError(
          "Cannot remove the last admin",
          400,
          "ToggleUserRole",
          "At least one admin is required"
        );
      }
    }

    user.role = user.role === "admin" ? "user" : "admin";
    user.isAdmin = user.role === "admin";
    await user.save();
    // console.log("[AdminController:toggleUserRole] 🔄 New role:", user.role);

    res.status(200).json({
      success: true,
      message: `User role changed to ${user.role}`,
    });
  } catch (error) {
    console.error(
      "[AdminController:toggleUserRole] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError provides specific context for role toggle issues
    next(
      new AppError(
        error.message,
        500,
        "ToggleUserRole",
        "Failed to toggle user role"
      )
    );
  }
};

// Deletes a user by ID
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    // console.log("[AdminController:deleteUser] 🔍 User ID:", userId);

    const deletedUser = await UserModel.findByIdAndDelete(userId);
    // console.log("[AdminController:deleteUser] 🗑️ User deleted:", !!deletedUser);

    if (!deletedUser)
      throw new AppError(
        "User not found",
        404,
        "DeleteUser",
        "User does not exist"
      );

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(
      "[AdminController:deleteUser] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError includes context for user deletion
    next(
      new AppError(error.message, 500, "DeleteUser", "Failed to delete user")
    );
  }
};

// Fetches all posts with size calculations
export const getAllPosts = async (req, res, next) => {
  try {
    const posts = await PostModel.find().populate("author", "name email");
    // console.log(
    //   "[AdminController:getAllPosts] 📝 Posts fetched:",
    //   posts.length
    // );

    const postsWithSize = posts.map((post) => {
      const blocksText =
        post.blocks
          ?.map((b) => b.text || b.value || b.code || b.caption || "")
          .join(" ") || "";
      const sizeInCharacters = blocksText.length;
      const sizeInKB = Buffer.byteLength(blocksText, "utf-8") / 1024;
      // console.log(`[AdminController:getAllPosts] 📏 Post ${post._id} size:`, {
      //   sizeInCharacters,
      //   sizeInKB,
      // });

      return {
        ...post.toObject(),
        sizeInCharacters,
        sizeInKB: Number(sizeInKB.toFixed(2)),
      };
    });

    res.status(200).json({ success: true, posts: postsWithSize });
  } catch (error) {
    console.error(
      "[AdminController:getAllPosts] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for post fetching issues
    next(
      new AppError(error.message, 500, "GetAllPosts", "Failed to fetch posts")
    );
  }
};

// Toggles post block status
export const toggleBlockPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    // console.log("[AdminController:toggleBlockPost] 🔍 Post ID:", postId);

    const post = await PostModel.findById(postId);
    // console.log("[AdminController:toggleBlockPost] 📝 Post found:", !!post);

    if (!post)
      throw new AppError(
        "Post not found",
        404,
        "ToggleBlockPost",
        "Post does not exist"
      );

    post.blocked = !post.blocked;
    if (!Array.isArray(post.likes)) post.likes = [];
    await post.save();
    // console.log(
    //   "[AdminController:toggleBlockPost] 🔄 Blocked status:",
    //   post.blocked
    // );

    emitPostUpdated(post);
    res.status(200).json({
      success: true,
      message: `Post ${post.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    console.error(
      "[AdminController:toggleBlockPost] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError provides context for post block toggling
    next(
      new AppError(
        error.message,
        500,
        "ToggleBlockPost",
        "Failed to toggle post block status"
      )
    );
  }
};

// Deletes a post by ID
export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    // console.log("[AdminController:deletePost] 🔍 Post ID:", postId);

    const deletedPost = await PostModel.findByIdAndDelete(postId);
    // console.log("[AdminController:deletePost] 🗑️ Post deleted:", !!deletedPost);

    if (!deletedPost)
      throw new AppError(
        "Post not found",
        404,
        "DeletePost",
        "Post does not exist"
      );

    emitPostDeleted(postId);
    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error(
      "[AdminController:deletePost] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for post deletion
    next(
      new AppError(error.message, 500, "DeletePost", "Failed to delete post")
    );
  }
};

// Records reading time for a post
export const recordReadingTime = async (req, res, next) => {
  try {
    const { postId, timeSpent } = req.body;
    const userId = req.user?._id || null;
    // console.log("[TrackController:recordReadingTime] 🔍 Input:", {
    //   postId,
    //   timeSpent,
    //   userId,
    // });

    if (!postId || typeof timeSpent !== "number" || isNaN(timeSpent)) {
      throw new AppError(
        "postId and valid timeSpent are required",
        400,
        "RecordReadingTime",
        "Invalid input for reading time"
      );
    }

    const post = await PostModel.findById(postId);
    // console.log("[TrackController:recordReadingTime] 📝 Post found:", !!post);

    if (!post)
      throw new AppError(
        "Post not found",
        404,
        "RecordReadingTime",
        "Post does not exist"
      );

    await TrafficModel.create({
      postId,
      timeSpent,
      userId,
      route: `/post/${postId}`,
      method: "GET",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    // console.log("[TrackController:recordReadingTime] 📈 Traffic recorded");

    await PostModel.findByIdAndUpdate(postId, { $inc: { timeSpent } });
    // console.log("[TrackController:recordReadingTime] 📝 Post updated");

    res.status(200).json({ success: true, message: "Reading time recorded" });
  } catch (error) {
    console.error(
      "[TrackController:recordReadingTime] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with fallback user message
    next(
      new AppError(
        error.message || "Unknown error",
        500,
        "RecordReadingTime",
        "Failed to record reading time"
      )
    );
  }
};

// Fetches reading details for a post
export const getReadingDetailsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    // console.log(
    //   "[TrackController:getReadingDetailsByPost] 🔍 Post ID:",
    //   postId
    // );

    const trafficLogs = await TrafficModel.find({ postId }).populate(
      "userId",
      "name email"
    );
    // console.log(
    //   "[TrackController:getReadingDetailsByPost] 📊 Traffic logs:",
    //   trafficLogs.length
    // );

    const totalTime = trafficLogs.reduce(
      (sum, log) => sum + (log.timeSpent || 0),
      0
    );
    // console.log(
    //   "[TrackController:getReadingDetailsByPost] ⏱️ Total time:",
    //   totalTime
    // );

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
    console.error(
      "[TrackController:getReadingDetailsByPost] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with default user message for reading details
    next(
      new AppError(
        error.message || "Failed to get reading details",
        500,
        "GetReadingDetailsByPost",
        "Failed to fetch reading details"
      )
    );
  }
};

// Fetches site analytics
export const getSiteAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    // console.log("[AnalyticsController:getSiteAnalytics] 📅 Date range:", {
    //   start,
    //   end,
    // });

    if (start > end)
      throw new AppError(
        "Invalid date range",
        400,
        "GetSiteAnalytics",
        "Start date cannot be after end date"
      );

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
    // console.log(
    //   "[AnalyticsController:getSiteAnalytics] 📊 Traffic stats:",
    //   trafficStats[0] || {}
    // );

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
    // console.log(
    //   "[AnalyticsController:getSiteAnalytics] 📈 Top posts:",
    //   topPosts.length
    // );

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
    // console.log(
    //   "[AnalyticsController:getSiteAnalytics] 👥 Top users:",
    //   userStats.length
    // );

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
      error.message,
      error.stack
    );
    // AppError with context for analytics fetching
    next(
      new AppError(
        error.message || "Failed to fetch site analytics",
        500,
        "GetSiteAnalytics",
        "Failed to fetch site analytics"
      )
    );
  }
};

// Exports all data as Excel
export const downloadAllDataCsv = async (req, res, next) => {
  try {
    // console.log("[AdminController:downloadAllDataCsv] 🚀 Starting data export");

    // Check admin access
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "DownloadAllDataCsv",
        "Admin privileges required"
      );
    }

    // Fetch data
    const users = await UserModel.find({}).lean();
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 👤 Users fetched:",
    //   users.length
    // );

    const posts = await PostModel.find({})
      .populate("author", "name email")
      .lean();
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📝 Posts fetched:",
    //   posts.length
    // );

    const traffic = await TrafficModel.find({})
      .populate({
        path: "userId",
        select: "name email",
        options: { strictPopulate: false },
      })
      .lean();
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📈 Traffic fetched:",
    //   traffic.length
    // );

    // Fetch plans from UserSubscriptionPlan
    const plansRaw = await UserSubscriptionPlan.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .populate("author", "name email")
      .lean();
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📋 Plans fetched:",
    //   plansRaw.length
    // );

    // Fetch subscriptions from UserSubscription
    const subscriptions = await UserSubscription.find({})
      .populate({
        path: "userId",
        select: "name email",
        options: { strictPopulate: false },
      })
      .populate({
        path: "planId",
        select: "name price",
        options: { strictPopulate: false },
      })
      .lean();
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 💳 Subscriptions fetched:",
    //   subscriptions.length
    // );

    const payments = await PaymentModel.find().lean();
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 💸 Payments fetched:",
    //   payments.length
    // );

    const wb = XLSX.utils.book_new();

    // Users Sheet
    const userData = users.map((user) => ({
      Name: user.name || "",
      Email: user.email || "",
      Gender: user.gender || "",
      Role: user.role || "",
      Blocked: user.blocked ? "Yes" : "No",
      CreatedAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
      Bio: user.bio || "",
      Profession: user.profession || "",
      Location: user.location || "",
      IsEligibleForSubscription: user.isEligibleForSubscription ? "Yes" : "No",
    }));
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📊 Users sheet created:",
    //   userData.length
    // );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(userData),
      "Users"
    );

    // Posts Sheet
    const postData = posts.map((post) => ({
      Title: post.title || "",
      AuthorName: post.author?.name || "Unknown",
      AuthorEmail: post.author?.email || "N/A",
      Blocked: post.blocked ? "Yes" : "No",
      CreatedAt: post.createdAt ? new Date(post.createdAt).toISOString() : "",
      ContentSizeKB: Array.isArray(post.blocks)
        ? (
            Buffer.byteLength(
              post.blocks
                .map((b) => b.text || b.value || b.code || b.caption || "")
                .join(" "),
              "utf-8"
            ) / 1024
          ).toFixed(2)
        : "0.00",
    }));
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📝 Posts sheet created:",
    //   postData.length
    // );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(postData),
      "Posts"
    );

    // Traffic Sheet
    const trafficData = traffic.map((record) => ({
      PostID: record.postId ? record.postId.toString() : "",
      UserName: record.userId?.name || "Unknown",
      UserEmail: record.userId?.email || "N/A",
      TimeSpentMs: record.timeSpent || 0,
      Timestamp: record.timestamp
        ? new Date(record.timestamp).toISOString()
        : "",
      Route: record.route || "",
      IP: record.ip || "",
      UserAgent: record.userAgent || "",
    }));
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📈 Traffic sheet created:",
    //   trafficData.length
    // );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(trafficData),
      "Traffic"
    );

    // Plans Sheet with subscriber count & total revenue
    const planStats = await Promise.all(
      plansRaw.map(async (plan) => {
        const subscriberCount = await UserSubscription.countDocuments({
          planId: plan._id,
          status: "active",
        });
        const activeSubs = await UserSubscription.find({
          planId: plan._id,
          status: "active",
        }).lean();
        const totalRevenue = activeSubs.reduce(
          (sum, sub) => sum + (sub.amountPaid || plan.price || 0),
          0
        );
        // console.log(
        //   "[AdminController:downloadAllDataCsv] 📋 Plan stats:",
        //   plan._id,
        //   { subscriberCount, totalRevenue }
        // );

        return {
          PlanID: plan._id.toString(),
          Name: plan.name || "",
          Author: plan.author?.name || "Unknown",
          AuthorEmail: plan.author?.email || "N/A",
          Price: plan.price ? (plan.price / 100).toFixed(2) : "0.00",
          DurationDays: plan.durationDays || 0,
          Type: plan.type || "",
          Tier: plan.tier || "",
          Status: plan.status || "",
          CreatedAt: plan.createdAt
            ? new Date(plan.createdAt).toISOString()
            : "",
          Subscribers: subscriberCount,
          TotalRevenue: (totalRevenue / 100).toFixed(2),
        };
      })
    );
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 📋 Plans sheet created:",
    //   planStats.length
    // );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(planStats),
      "Plans"
    );

    // Subscriptions Sheet
    const subscriptionData = subscriptions.map((sub) => ({
      SubscriptionID: sub._id.toString(),
      UserID: sub.userId?._id?.toString() || "N/A",
      UserName: sub.userId?.name || "Unknown",
      UserEmail: sub.userId?.email || "N/A",
      PlanID: sub.planId?._id?.toString() || "N/A",
      PlanName: sub.planId?.name || "N/A",
      PaymentID: sub.paymentId || "N/A",
      Status: sub.status || "",
      ExpiryDate: sub.expiryDate ? new Date(sub.expiryDate).toISOString() : "",
      CreatedAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : "",
      AmountPaid: sub.amountPaid ? (sub.amountPaid / 100).toFixed(2) : "0.00",
    }));
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 💳 Subscriptions sheet created:",
    //   subscriptionData.length
    // );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(subscriptionData),
      "Subscriptions"
    );

    // Payments Sheet
    const paymentData = payments.map((payment) => ({
      PaymentID: payment.paymentId || "",
      OrderID: payment.orderId || "",
      UserID: payment.userId ? payment.userId.toString() : "",
      Amount: payment.amount ? (payment.amount / 100).toFixed(2) : "0.00",
      Currency: payment.currency || "",
      Status: payment.status || "",
      CreatedAt: payment.createdAt
        ? new Date(payment.createdAt).toISOString()
        : "",
    }));
    // console.log(
    //   "[AdminController:downloadAllDataCsv] 💸 Payments sheet created:",
    //   paymentData.length
    // );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(paymentData),
      "Payments"
    );

    // Send as Excel buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    // console.log("[AdminController:downloadAllDataCsv] 📤 Excel buffer created");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="all_data_export.xlsx"'
    );
    res.status(200).send(excelBuffer);
  } catch (error) {
    console.error(
      "[AdminController:downloadAllDataCsv] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for Excel export issues
    next(
      error instanceof AppError
        ? error
        : new AppError(
            "Failed to generate Excel file",
            500,
            "DownloadAllDataCsv",
            "Failed to export data to Excel"
          )
    );
  }
};

// Fetches all subscription plans with pagination
export const getAllSubscriptionPlans = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    // console.log(
    //   "[AdminController:getAllSubscriptionPlans] 📦 Pagination params:",
    //   { page, limit, skip }
    // );

    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "GetAllSubscriptionPlans",
        "Admin privileges required"
      );
    }

    // Fetch total count for pagination
    const totalPlans = await UserSubscriptionPlan.countDocuments({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });

    // Fetch plans from UserSubscriptionPlan
    const plans = await UserSubscriptionPlan.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .skip(skip)
      .limit(limit)
      .populate("author", "name")
      .lean();

    // console.log(
    //   "[AdminController:getAllSubscriptionPlans] 📋 Plans fetched:",
    //   plans.length
    // );

    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        // Fetch subscriptions from UserSubscription
        const subscriptions = await UserSubscription.find({
          planId: plan._id,
        }).lean();
        const activeSubscribers = subscriptions.filter(
          (sub) => sub.status === "active"
        ).length;
        const totalRevenue = subscriptions.reduce(
          (sum, sub) =>
            sub.status === "active"
              ? sum + (sub.amountPaid || plan.price || 0)
              : sum,
          0
        );
        // console.log(
        //   "[AdminController:getAllSubscriptionPlans] 📊 Plan stats:",
        //   plan._id,
        //   { activeSubscribers, totalRevenue }
        // );

        return {
          ...plan,
          totalSubscribers: subscriptions.length,
          activeSubscribers,
          totalRevenue: totalRevenue / 100,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedPlans.length,
      plans: enrichedPlans,
      currentPage: page,
      totalPages: Math.ceil(totalPlans / limit),
      totalPlans,
    });
  } catch (error) {
    console.error(
      "[AdminController:getAllSubscriptionPlans] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for subscription plan fetching
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal Server Error",
            500,
            "GetAllSubscriptionPlans",
            "Failed to fetch subscription plans"
          )
    );
  }
};

// Toggles user eligibility for subscription creation
export const toggleUserEligibility = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      throw new AppError(
        "Admin access required",
        403,
        "ToggleUserEligibility",
        "Admin privileges required"
      );

    const { userId, enable } = req.body;
    // console.log("[AdminController:toggleUserEligibility] 🔍 Input:", {
    //   userId,
    //   enable,
    // });

    validateObjectId(userId, "User ID");
    const user = await UserModel.findById(userId);
    // console.log(
    //   "[AdminController:toggleUserEligibility] 👤 User found:",
    //   !!user
    // );

    if (!user)
      throw new AppError(
        "User not found",
        404,
        "ToggleUserEligibility",
        "User does not exist"
      );

    user.isEligibleForSubscription = enable;
    await user.save();
    // console.log(
    //   "[AdminController:toggleUserEligibility] 🔄 Eligibility updated:",
    //   user.isEligibleForSubscription
    // );

    await recordActivity({
      userId: req.user._id.toString(),
      action: "TOGGLED_SUBSCRIPTION_ELIGIBILITY",
      message: `Admin ${
        enable ? "enabled" : "disabled"
      } subscription eligibility for user ${userId}`,
      targetUserId: userId,
    });

    res.status(200).json({
      success: true,
      message: `Subscription eligibility ${
        enable ? "enabled" : "disabled"
      } for user ${userId}`,
      user: {
        id: user._id,
        isEligibleForSubscription: user.isEligibleForSubscription,
      },
    });
  } catch (error) {
    console.error(
      "[AdminController:toggleUserEligibility] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for eligibility toggle
    next(
      new AppError(
        error.message,
        500,
        "ToggleUserEligibility",
        "Failed to toggle user eligibility"
      )
    );
  }
};

// Updates global subscription eligibility criteria
export const updateGlobalEligibilityCriteria = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "UpdateGlobalEligibilityCriteria",
        "Admin privileges required"
      );
    }

    const {
      minFollowers = 10000,
      minPosts = 30,
      minEngagementRate = 0.05,
      minAccountAgeDays = 30,
    } = req.body;
    // console.log(
    //   "[AdminController:updateGlobalEligibilityCriteria] 🔍 Criteria:",
    //   {
    //     minFollowers,
    //     minPosts,
    //     minEngagementRate,
    //     minAccountAgeDays,
    //   }
    // );

    // Validate all fields
    if (minFollowers < 0 || minPosts < 0 || minAccountAgeDays < 0) {
      throw new AppError(
        "Criteria values must be non-negative",
        400,
        "UpdateGlobalEligibilityCriteria",
        "Invalid criteria values"
      );
    }
    if (minEngagementRate < 0 || minEngagementRate > 1) {
      throw new AppError(
        "Engagement rate must be between 0 and 100%",
        400,
        "UpdateGlobalEligibilityCriteria",
        "Invalid engagement rate"
      );
    }

    const config = await SubscriptionConfig.findOneAndUpdate(
      { key: "subscriptionEligibility" },
      { minFollowers, minPosts, minEngagementRate, minAccountAgeDays },
      { upsert: true, new: true }
    );
    // console.log(
    //   "[AdminController:updateGlobalEligibilityCriteria] 📋 Config updated:",
    //   config
    // );

    await recordActivity({
      userId: req.user._id.toString(),
      action: "UPDATED_SUBSCRIPTION_CRITERIA",
      message: `Updated global subscription criteria: ${minFollowers} followers, ${minPosts} posts, ${(
        minEngagementRate * 100
      ).toFixed(2)}% engagement rate, ${minAccountAgeDays} days account age`,
    });

    res.status(200).json({
      success: true,
      criteria: config,
    });
  } catch (error) {
    console.error(
      "[AdminController:updateGlobalEligibilityCriteria] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for criteria update
    next(
      new AppError(
        error.message,
        500,
        "UpdateGlobalEligibilityCriteria",
        "Failed to update global eligibility criteria"
      )
    );
  }
};

// Sets user-specific eligibility overrides
export const setUserEligibilityOverride = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      throw new AppError(
        "Admin access required",
        403,
        "SetUserEligibilityOverride",
        "Admin privileges required"
      );

    const { userId } = req.params;
    const { isEligibleForSubscription, bypassSubscriptionCriteria } = req.body;
    // console.log("[AdminController:setUserEligibilityOverride] 🔍 Input:", {
    //   userId,
    //   isEligibleForSubscription,
    //   bypassSubscriptionCriteria,
    // });

    validateObjectId(userId, "User ID");

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        ...(isEligibleForSubscription !== undefined && {
          isEligibleForSubscription,
        }),
        ...(bypassSubscriptionCriteria !== undefined && {
          bypassSubscriptionCriteria,
        }),
      },
      { new: true }
    );
    // console.log(
    //   "[AdminController:setUserEligibilityOverride] 👤 User updated:",
    //   {
    //     isEligibleForSubscription: user.isEligibleForSubscription,
    //     bypassSubscriptionCriteria: user.bypassSubscriptionCriteria,
    //   }
    // );

    if (!user)
      throw new AppError(
        "User not found",
        404,
        "SetUserEligibilityOverride",
        "User does not exist"
      );

    await recordActivity({
      userId: req.user._id.toString(),
      action: "SET_USER_ELIGIBILITY_OVERRIDE",
      message: `Set eligibility override for user ${userId}`,
      userTarget: userId,
    });

    res.status(200).json({
      success: true,
      userId: user._id,
      isEligibleForSubscription: user.isEligibleForSubscription,
      bypassSubscriptionCriteria: user.bypassSubscriptionCriteria,
    });
  } catch (error) {
    console.error(
      "[AdminController:setUserEligibilityOverride] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for eligibility override
    next(
      new AppError(
        error.message,
        500,
        "SetUserEligibilityOverride",
        "Failed to set user eligibility override"
      )
    );
  }
};

// Check if a user is eligible for subscription
export const checkUserEligibility = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?._id.toString();

    // Restrict to requesting user's own eligibility
    if (userId !== requestingUserId) {
      throw new AppError(
        "Unauthorized: Can only check own eligibility",
        403,
        "CheckUserEligibility",
        "User ID mismatch"
      );
    }

    validateObjectId(userId, "User ID");
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "CheckUserEligibility",
        "User does not exist"
      );
    }

    console.log("👤 [checkUserEligibility] User found:", user.name);

    const followerCount = Array.isArray(user.followers)
      ? user.followers.length
      : 0;

    const posts = await PostModel.find({
      author: userId,
      isPublished: true,
    }).lean();

    const postCount = posts.length;

    const totalEngagement = posts.reduce(
      (sum, post) =>
        sum + (post.likes?.length || 0) + (post.comments?.length || 0),
      0
    );

    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);

    const engagementRate =
      totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt || user.joiningDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    console.log("📊 [checkUserEligibility] Stats:", {
      followerCount,
      postCount,
      totalEngagement,
      totalViews,
      engagementRate: engagementRate.toFixed(2),
      accountAgeDays,
    });

    let config = await SubscriptionConfig.findOne({
      key: "subscriptionEligibility",
    }).lean();

    if (!config) {
      config = {
        key: "subscriptionEligibility",
        minFollowers: 10000,
        minPosts: 30,
        minEngagementRate: 0.05,
        minAccountAgeDays: 30,
      };
      await SubscriptionConfig.create(config);
    }

    console.log("⚙️ [checkUserEligibility] Subscription config in use:", {
      minFollowers: config.minFollowers,
      minPosts: config.minPosts,
      minEngagementRate: config.minEngagementRate,
      minAccountAgeDays: config.minAccountAgeDays,
    });

    const override = user.milestoneOverride || {};

    const effectiveFollowerCount = override.followerCount ?? followerCount;
    const effectivePostCount = override.postCount ?? postCount;
    const effectiveEngagementRate = override.engagementRate ?? engagementRate;
    const effectiveAccountAgeDays = override.accountAgeDays ?? accountAgeDays;

    const isEligible =
      user.isEligibleForSubscription ||
      (effectiveFollowerCount >= config.minFollowers &&
        effectivePostCount >= config.minPosts &&
        effectiveEngagementRate >= config.minEngagementRate * 100 &&
        effectiveAccountAgeDays >= config.minAccountAgeDays);

    // Identify unmet criteria
    const unmetCriteria = [];
    if (effectiveFollowerCount < config.minFollowers) {
      unmetCriteria.push(
        `Need ${config.minFollowers - effectiveFollowerCount} more followers`
      );
    }
    if (effectivePostCount < config.minPosts) {
      unmetCriteria.push(
        `Need ${config.minPosts - effectivePostCount} more published posts`
      );
    }
    if (effectiveEngagementRate < config.minEngagementRate * 100) {
      unmetCriteria.push(
        `Engagement rate ${effectiveEngagementRate.toFixed(
          2
        )}% is below required ${(config.minEngagementRate * 100).toFixed(2)}%`
      );
    }
    if (effectiveAccountAgeDays < config.minAccountAgeDays) {
      unmetCriteria.push(
        `Account age ${effectiveAccountAgeDays} days is below required ${config.minAccountAgeDays} days`
      );
    }

    const response = {
      success: true,
      userId,
      isEligible,
      followerCount: effectiveFollowerCount,
      postCount: effectivePostCount,
      engagementRate: Number(effectiveEngagementRate.toFixed(2)),
      accountAgeDays: effectiveAccountAgeDays,
      criteria: {
        minFollowers: config.minFollowers,
        minPosts: config.minPosts,
        minEngagementRate: Number((config.minEngagementRate * 100).toFixed(2)),
        minAccountAgeDays: config.minAccountAgeDays,
      },
      manuallySet: !!user.isEligibleForSubscription,
      unmetCriteria: isEligible ? [] : unmetCriteria,
    };

    console.log("✅ [checkUserEligibility] Final response:", response);
    res.status(200).json(response);
  } catch (error) {
    console.error(
      "[checkUserEligibility] ❌ Error:",
      error.message,
      error.stack
    );
    next(
      new AppError(
        error.message || "Failed to check user eligibility",
        error.statusCode || 500,
        "CheckUserEligibility",
        "Failed to check user eligibility"
      )
    );
  }
};

// Toggles subscription plan status
export const toggleSubscriptionPlanStatus = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      throw new AppError(
        "Admin access required",
        403,
        "ToggleSubscriptionPlanStatus",
        "Admin privileges required"
      );

    const { planId, status } = req.body;
    // console.log("[AdminController:toggleSubscriptionPlanStatus] 🔍 Input:", {
    //   planId,
    //   status,
    // });

    validateObjectId(planId, "Plan ID");
    if (!["active", "suspended"].includes(status)) {
      throw new AppError(
        "Invalid status. Must be 'active' or 'suspended'",
        400,
        "ToggleSubscriptionPlanStatus",
        "Invalid plan status"
      );
    }

    const plan = await SubscriptionPlan.findById(planId);
    // console.log(
    //   "[AdminController:toggleSubscriptionPlanStatus] 📋 Plan found:",
    //   !!plan
    // );

    if (!plan)
      throw new AppError(
        "Plan not found",
        404,
        "ToggleSubscriptionPlanStatus",
        "Plan does not exist"
      );

    plan.status = status;
    await plan.save();
    // console.log(
    //   "[AdminController:toggleSubscriptionPlanStatus] 🔄 Plan status:",
    //   plan.status
    // );

    await recordActivity({
      userId: req.user._id.toString(),
      action: "TOGGLED_SUBSCRIPTION_PLAN_STATUS",
      message: `Admin set plan ${planId} to ${status}`,
      plan: { planId: plan._id, name: plan.name, status },
    });

    res.status(200).json({
      success: true,
      plan: { id: plan._id, name: plan.name, status },
    });
  } catch (error) {
    console.error(
      "[AdminController:toggleSubscriptionPlanStatus] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for plan status toggle
    next(
      new AppError(
        error.message,
        500,
        "ToggleSubscriptionPlanStatus",
        "Failed to toggle subscription plan status"
      )
    );
  }
};

// Grants or revokes subscription creation access
export const grantSubscriptionAccess = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      throw new AppError(
        "Admin access required",
        403,
        "GrantSubscriptionAccess",
        "Admin privileges required"
      );

    const { userId, grant } = req.body;
    // console.log("[AdminController:grantSubscriptionAccess] 🔍 Input:", {
    //   userId,
    //   grant,
    // });

    validateObjectId(userId, "User ID");
    const user = await UserModel.findById(userId);
    // console.log(
    //   "[AdminController:grantSubscriptionAccess] 👤 User found:",
    //   !!user
    // );

    if (!user)
      throw new AppError(
        "User not found",
        404,
        "GrantSubscriptionAccess",
        "User does not exist"
      );

    user.isEligibleForSubscription = grant;
    await user.save();
    // console.log(
    //   "[AdminController:grantSubscriptionAccess] 🔄 Eligibility updated:",
    //   user.isEligibleForSubscription
    // );

    await recordActivity({
      userId: req.user._id.toString(),
      action: "GRANTED_SUBSCRIPTION_ACCESS",
      message: `Admin ${
        grant ? "granted" : "revoked"
      } subscription creation access for user ${userId}`,
      targetUserId: userId,
    });

    res.status(200).json({
      success: true,
      message: `Subscription creation access ${
        grant ? "granted" : "revoked"
      } for user ${userId}`,
      user: {
        id: user._id,
        isEligibleForSubscription: user.isEligibleForSubscription,
      },
    });
  } catch (error) {
    console.error(
      "[AdminController:grantSubscriptionAccess] ❌ Error:",
      error.message,
      error.stack
    );
    // AppError with context for subscription access grant
    next(
      new AppError(
        error.message,
        500,
        "GrantSubscriptionAccess",
        "Failed to grant/revoke subscription access"
      )
    );
  }
};

export const overrideUserMilestones = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      followerCount,
      postCount,
      engagementRate,
      accountAgeDays,
      isEligibleForSubscription,
    } = req.body;

    if (!req.user?.isAdmin)
      throw new AppError(
        "Admin access required",
        403,
        "OverrideUserMilestones"
      );

    validateObjectId(userId, "User ID");

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError("User not found", 404, "OverrideUserMilestones");

    user.milestoneOverride = {
      followerCount:
        followerCount ?? user.milestoneOverride?.followerCount ?? null,
      postCount: postCount ?? user.milestoneOverride?.postCount ?? null,
      engagementRate:
        engagementRate ?? user.milestoneOverride?.engagementRate ?? null,
      accountAgeDays:
        accountAgeDays ?? user.milestoneOverride?.accountAgeDays ?? null,
    };

    if (isEligibleForSubscription !== undefined)
      user.isEligibleForSubscription = isEligibleForSubscription;

    await user.save();

    await recordActivity({
      userId: req.user._id.toString(),
      action: "OVERRIDDEN_USER_MILESTONES",
      message: `Admin overrode milestone for user ${userId}`,
      targetUserId: userId,
    });

    res.status(200).json({
      success: true,
      message: "User milestone overridden successfully",
      userId,
      milestoneOverride: user.milestoneOverride,
      isEligibleForSubscription: user.isEligibleForSubscription,
    });
  } catch (error) {
    console.error(
      "[AdminController:overrideUserMilestones] ❌ Error:",
      error.message,
      error.stack
    );
    next(
      new AppError(
        error.message,
        500,
        "OverrideUserMilestones",
        "Failed to override user milestones"
      )
    );
  }
};

export const resetUserMilestones = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!req.user?.isAdmin)
      throw new AppError("Admin access required", 403, "ResetUserMilestones");

    validateObjectId(userId, "User ID");

    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404, "ResetUserMilestones");

    user.milestoneOverride = {
      followerCount: null,
      postCount: null,
      engagementRate: null,
      accountAgeDays: null,
    };

    await user.save();

    await recordActivity({
      userId: req.user._id.toString(),
      action: "RESET_USER_MILESTONES",
      message: `Admin reset milestone override for user ${userId}`,
      targetUserId: userId,
    });

    res.status(200).json({
      success: true,
      message: "Milestone override reset to default",
    });
  } catch (error) {
    console.error(
      "[AdminController:resetUserMilestones] ❌ Error:",
      error.message,
      error.stack
    );
    next(
      new AppError(
        error.message,
        500,
        "ResetUserMilestones",
        "Failed to reset user milestones"
      )
    );
  }
};
