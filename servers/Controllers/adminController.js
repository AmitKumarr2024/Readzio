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
import pLimit from "p-limit";
import NodeCache from "node-cache";
import { logMemory } from "../../servers/Utils/memoryLogger.js"; // Import logMemory

// Initialize cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Validates ObjectId and throws AppError with context for invalid IDs
const validateObjectId = (id, type = "ID") => {
  logMemory(`🔍 Validating ${type}`);
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
    logMemory("👥 Start getAllUsers");
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const projection =
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate isEligibleForSubscription";

    const cacheKey = `userCounts:total`;
    let totalUsers = cache.get(cacheKey);

    logMemory("📊 Before checking cache for total users");
    if (!totalUsers) {
      totalUsers = await UserModel.countDocuments().lean();
      cache.set(cacheKey, totalUsers);
    }
    logMemory("📊 After checking cache for total users");

    const users = [];
    logMemory("📖 Before fetching users");
    const cursor = UserModel.find({})
      .select(projection)
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    for await (const user of cursor) {
      users.push(user);
    }
    logMemory("📖 After fetching users");

    const totalPages = Math.ceil(totalUsers / limit);

    logMemory("👥 End getAllUsers");
    res.status(200).json({
      success: true,
      users,
      totalUsers,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    logMemory("❌ Error in getAllUsers");
    next(
      new AppError(error.message, 500, "GetAllUsers", "Failed to fetch users")
    );
  }
};

// Toggles user block status
export const toggleBlockUser = async (req, res, next) => {
  try {
    logMemory("🚫 Start toggleBlockUser");
    const { userId } = req.params;
    validateObjectId(userId, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "ToggleBlockUser",
        "User does not exist"
      );
    }

    logMemory("💾 Before updating user");
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { blocked: !user.blocked },
      { new: true, select: "blocked" }
    ).lean();
    logMemory("💾 After updating user");

    logMemory("🚫 End toggleBlockUser");
    res.status(200).json({
      success: true,
      message: `User ${
        updatedUser.blocked ? "blocked" : "unblocked"
      } successfully`,
    });
  } catch (error) {
    logMemory("❌ Error in toggleBlockUser");
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
    logMemory("👑 Start toggleUserRole");
    const { userId } = req.params;
    validateObjectId(userId, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "ToggleUserRole",
        "User does not exist"
      );
    }

    logMemory("📊 Before checking admin count");
    if (user.role === "admin") {
      const adminCount = await UserModel.countDocuments({
        role: "admin",
      }).lean();
      if (adminCount <= 1) {
        throw new AppError(
          "Cannot remove the last admin",
          400,
          "ToggleUserRole",
          "At least one admin is required"
        );
      }
    }
    logMemory("📊 After checking admin count");

    const newRole = user.role === "admin" ? "user" : "admin";
    logMemory("💾 Before updating user role");
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { role: newRole, isAdmin: newRole === "admin" },
      { new: true, select: "role isAdmin" }
    ).lean();
    logMemory("💾 After updating user role");

    logMemory("👑 End toggleUserRole");
    res.status(200).json({
      success: true,
      message: `User role changed to ${updatedUser.role}`,
    });
  } catch (error) {
    logMemory("❌ Error in toggleUserRole");
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
    logMemory("🗑️ Start deleteUser");
    const { userId } = req.params;
    validateObjectId(userId, "User ID");

    logMemory("💾 Before deleting user");
    const deletedUser = await UserModel.findByIdAndDelete(userId).lean();
    logMemory("💾 After deleting user");
    if (!deletedUser) {
      throw new AppError(
        "User not found",
        404,
        "DeleteUser",
        "User does not exist"
      );
    }

    logMemory("🗑️ End deleteUser");
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    logMemory("❌ Error in deleteUser");
    next(
      new AppError(error.message, 500, "DeleteUser", "Failed to delete user")
    );
  }
};

// Fetches all posts with size calculations
export const getAllPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getAllPosts");
    const postsWithSize = [];
    logMemory("📖 Before fetching posts");
    const cursor = PostModel.find()
      .select("title blocks author createdAt blocked")
      .populate("author", "name email")
      .lean()
      .cursor();

    for await (const post of cursor) {
      logMemory(`📄 Processing post ${post._id}`);
      const blocksText =
        post.blocks
          ?.map((b) => b.text || b.value || b.code || b.caption || "")
          .join(" ") || "";
      const sizeInCharacters = blocksText.length;
      const sizeInKB = Buffer.byteLength(blocksText, "utf-8") / 1024;

      postsWithSize.push({
        ...post,
        sizeInCharacters,
        sizeInKB: Number(sizeInKB.toFixed(2)),
      });
    }
    logMemory("📖 After fetching posts");

    logMemory("📋 End getAllPosts");
    res.status(200).json({ success: true, posts: postsWithSize });
  } catch (error) {
    logMemory("❌ Error in getAllPosts");
    next(
      new AppError(error.message, 500, "GetAllPosts", "Failed to fetch posts")
    );
  }
};

// Toggles post block status
export const toggleBlockPost = async (req, res, next) => {
  try {
    logMemory("🚫 Start toggleBlockPost");
    const { postId } = req.params;
    validateObjectId(postId, "Post ID");

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError(
        "Post not found",
        404,
        "ToggleBlockPost",
        "Post does not exist"
      );
    }

    logMemory("💾 Before updating post");
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      {
        blocked: !post.blocked,
        likes: Array.isArray(post.likes) ? post.likes : [],
      },
      { new: true, select: "blocked likes" }
    ).lean();
    logMemory("💾 After updating post");

    emitPostUpdated(updatedPost);

    logMemory("🚫 End toggleBlockPost");
    res.status(200).json({
      success: true,
      message: `Post ${
        updatedPost.blocked ? "blocked" : "unblocked"
      } successfully`,
    });
  } catch (error) {
    logMemory("❌ Error in toggleBlockPost");
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
    logMemory("🗑️ Start deletePost");
    const { postId } = req.params;
    validateObjectId(postId, "Post ID");

    logMemory("💾 Before deleting post");
    const deletedPost = await PostModel.findByIdAndDelete(postId).lean();
    logMemory("💾 After deleting post");
    if (!deletedPost) {
      throw new AppError(
        "Post not found",
        404,
        "DeletePost",
        "Post does not exist"
      );
    }

    emitPostDeleted(postId);

    logMemory("🗑️ End deletePost");
    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    logMemory("❌ Error in deletePost");
    next(
      new AppError(error.message, 500, "DeletePost", "Failed to delete post")
    );
  }
};

// Records reading time for a post
export const recordReadingTime = async (req, res, next) => {
  try {
    logMemory("⏱️ Start recordReadingTime");
    const { postId, timeSpent } = req.body;
    const userId = req.user?._id || null;

    validateObjectId(postId, "Post ID");
    if (typeof timeSpent !== "number" || isNaN(timeSpent)) {
      throw new AppError(
        "Invalid timeSpent",
        400,
        "RecordReadingTime",
        "Invalid input for reading time"
      );
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError(
        "Post not found",
        404,
        "RecordReadingTime",
        "Post does not exist"
      );
    }

    logMemory("💾 Before updating traffic and post");
    await Promise.all([
      TrafficModel.create({
        postId,
        timeSpent,
        userId,
        route: `/post/${postId}`,
        method: "GET",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }),
      PostModel.updateOne({ _id: postId }, { $inc: { timeSpent } }).lean(),
    ]);
    logMemory("💾 After updating traffic and post");

    logMemory("⏱️ End recordReadingTime");
    res.status(200).json({ success: true, message: "Reading time recorded" });
  } catch (error) {
    logMemory("❌ Error in recordReadingTime");
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
    logMemory("📊 Start getReadingDetailsByPost");
    const { postId } = req.params;
    validateObjectId(postId, "Post ID");

    const logs = [];
    let totalTime = 0;

    logMemory("📖 Before fetching traffic logs");
    const cursor = TrafficModel.find({ postId })
      .select("userId timeSpent timestamp")
      .populate("userId", "name email")
      .lean()
      .cursor();

    for await (const log of cursor) {
      logMemory(`📄 Processing traffic log ${log._id}`);
      totalTime += log.timeSpent || 0;
      logs.push({
        user: log.userId,
        timeSpent: log.timeSpent,
        at: log.timestamp,
      });
    }
    logMemory("📖 After fetching traffic logs");

    logMemory("📊 End getReadingDetailsByPost");
    res.status(200).json({
      success: true,
      totalTimeSpent: totalTime,
      logs,
    });
  } catch (error) {
    logMemory("❌ Error in getReadingDetailsByPost");
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
    logMemory("📈 Start getSiteAnalytics");
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    if (start > end) {
      throw new AppError(
        "Invalid date range",
        400,
        "GetSiteAnalytics",
        "Start date cannot be after end date"
      );
    }

    const cacheKey = `analytics:${start.toISOString()}:${end.toISOString()}`;
    let cachedData = cache.get(cacheKey);

    if (!cachedData) {
      logMemory("📊 Before fetching traffic stats");
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
      ]).exec();
      logMemory("📊 After fetching traffic stats");

      const topPosts = [];
      logMemory("📖 Before fetching top posts");
      const topPostsCursor = TrafficModel.aggregate([
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
      ]).cursor();

      for await (const post of topPostsCursor) {
        logMemory(`📄 Processing top post ${post.postId}`);
        topPosts.push(post);
      }
      logMemory("📖 After fetching top posts");

      const userStats = [];
      logMemory("📖 Before fetching user stats");
      const userStatsCursor = UserModel.aggregate([
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
      ]).cursor();

      for await (const user of userStatsCursor) {
        logMemory(`📄 Processing user stat ${user._id}`);
        userStats.push(user);
      }
      logMemory("📖 After fetching user stats");

      cachedData = {
        traffic: trafficStats[0] || {
          totalVisits: 0,
          totalTimeSpent: 0,
          uniqueUsersCount: 0,
          uniquePostsCount: 0,
        },
        topPosts,
        topUsers: userStats,
      };
      cache.set(cacheKey, cachedData);
    }

    logMemory("📈 End getSiteAnalytics");
    res.status(200).json({ success: true, data: cachedData });
  } catch (error) {
    logMemory("❌ Error in getSiteAnalytics");
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
    logMemory("📑 Start downloadAllDataCsv");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "DownloadAllDataCsv",
        "Admin privileges required"
      );
    }

    const wb = XLSX.utils.book_new();
    const limit = pLimit(3); // Process 3 records at a time

    // Users Sheet
    const userData = [];
    logMemory("📖 Before fetching users for Excel");
    const usersCursor = UserModel.find()
      .select(
        "name email gender role blocked createdAt bio profession location isEligibleForSubscription"
      )
      .lean()
      .cursor();

    for await (const user of usersCursor) {
      logMemory(`📄 Processing user ${user._id} for Excel`);
      userData.push({
        Name: user.name || "",
        Email: user.email || "",
        Gender: user.gender || "",
        Role: user.role || "",
        Blocked: user.blocked ? "Yes" : "No",
        CreatedAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
        Bio: user.bio || "",
        Profession: user.profession || "",
        Location: user.location || "",
        IsEligibleForSubscription: user.isEligibleForSubscription
          ? "Yes"
          : "No",
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(userData),
      "Users"
    );
    logMemory("📖 After fetching users for Excel");

    // Posts Sheet
    const postData = [];
    logMemory("📖 Before fetching posts for Excel");
    const postsCursor = PostModel.find()
      .select("title author createdAt blocked blocks")
      .populate("author", "name email")
      .lean()
      .cursor();

    for await (const post of postsCursor) {
      logMemory(`📄 Processing post ${post._id} for Excel`);
      const blocksText =
        post.blocks
          ?.map((b) => b.text || b.value || b.code || b.caption || "")
          .join(" ") || "";
      postData.push({
        Title: post.title || "",
        AuthorName: post.author?.name || "Unknown",
        AuthorEmail: post.author?.email || "N/A",
        Blocked: post.blocked ? "Yes" : "No",
        CreatedAt: post.createdAt ? new Date(post.createdAt).toISOString() : "",
        ContentSizeKB: Number(
          (Buffer.byteLength(blocksText, "utf-8") / 1024).toFixed(2)
        ),
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(postData),
      "Posts"
    );
    logMemory("📖 After fetching posts for Excel");

    // Traffic Sheet
    const trafficData = [];
    logMemory("📖 Before fetching traffic for Excel");
    const trafficCursor = TrafficModel.find()
      .select("postId userId timeSpent timestamp route ip userAgent")
      .populate("userId", "name email")
      .lean()
      .cursor();

    for await (const record of trafficCursor) {
      logMemory(`📄 Processing traffic record ${record._id} for Excel`);
      trafficData.push({
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
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(trafficData),
      "Traffic"
    );
    logMemory("📖 After fetching traffic for Excel");

    // Plans Sheet
    const planData = [];
    logMemory("📖 Before fetching plans for Excel");
    const plansCursor = UserSubscriptionPlan.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .select("name author price durationDays type tier status createdAt")
      .populate("author", "name email")
      .lean()
      .cursor();

    for await (const plan of plansCursor) {
      logMemory(`📄 Processing plan ${plan._id} for Excel`);
      const [subscriberCount, activeSubs] = await Promise.all([
        UserSubscription.countDocuments({
          planId: plan._id,
          status: "active",
        }).lean(),
        UserSubscription.find({ planId: plan._id, status: "active" }).lean(),
      ]);
      const totalRevenue = activeSubs.reduce(
        (sum, sub) => sum + (sub.amountPaid || plan.price || 0),
        0
      );

      planData.push({
        PlanID: plan._id.toString(),
        Name: plan.name || "",
        Author: plan.author?.name || "Unknown",
        AuthorEmail: plan.author?.email || "N/A",
        Price: plan.price ? (plan.price / 100).toFixed(2) : "0.00",
        DurationDays: plan.durationDays || 0,
        Type: plan.type || "",
        Tier: plan.tier || "",
        Status: plan.status || "",
        CreatedAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : "",
        Subscribers: subscriberCount,
        TotalRevenue: (totalRevenue / 100).toFixed(2),
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(planData),
      "Plans"
    );
    logMemory("📖 After fetching plans for Excel");

    // Subscriptions Sheet
    const subscriptionData = [];
    logMemory("📖 Before fetching subscriptions for Excel");
    const subscriptionsCursor = UserSubscription.find()
      .select("userId planId paymentId status expiryDate createdAt amountPaid")
      .populate("userId", "name email")
      .populate("planId", "name price")
      .lean()
      .cursor();

    for await (const sub of subscriptionsCursor) {
      logMemory(`📄 Processing subscription ${sub._id} for Excel`);
      subscriptionData.push({
        SubscriptionID: sub._id.toString(),
        UserID: sub.userId?._id?.toString() || "N/A",
        UserName: sub.userId?.name || "Unknown",
        UserEmail: sub.userId?.email || "N/A",
        PlanID: sub.planId?._id?.toString() || "N/A",
        PlanName: sub.planId?.name || "N/A",
        PaymentID: sub.paymentId || "N/A",
        Status: sub.status || "",
        ExpiryDate: sub.expiryDate
          ? new Date(sub.expiryDate).toISOString()
          : "",
        CreatedAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : "",
        AmountPaid: sub.amountPaid ? (sub.amountPaid / 100).toFixed(2) : "0.00",
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(subscriptionData),
      "Subscriptions"
    );
    logMemory("📖 After fetching subscriptions for Excel");

    // Payments Sheet
    const paymentData = [];
    logMemory("📖 Before fetching payments for Excel");
    const paymentsCursor = PaymentModel.find()
      .select("paymentId orderId userId amount currency status createdAt")
      .lean()
      .cursor();

    for await (const payment of paymentsCursor) {
      logMemory(`📄 Processing payment ${payment._id} for Excel`);
      paymentData.push({
        PaymentID: payment.paymentId || "",
        OrderID: payment.orderId || "",
        UserID: payment.userId ? payment.userId.toString() : "",
        Amount: payment.amount ? (payment.amount / 100).toFixed(2) : "0.00",
        Currency: payment.currency || "",
        Status: payment.status || "",
        CreatedAt: payment.createdAt
          ? new Date(payment.createdAt).toISOString()
          : "",
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(paymentData),
      "Payments"
    );
    logMemory("📖 After fetching payments for Excel");

    // Feedback Sheet
    const feedbackData = [];
    logMemory("📖 Before fetching feedback for Excel");
    const feedbackCursor = UserModel.find({ "feedbackPrompt.responded": true })
      .select(
        "name email avatar feedbackPrompt.rating feedbackPrompt.message feedbackPrompt.shownAt"
      )
      .lean()
      .cursor();

    for await (const user of feedbackCursor) {
      logMemory(`📄 Processing feedback for user ${user._id} for Excel`);
      feedbackData.push({
        UserID: user._id.toString(),
        Name: user.name || "",
        Email: user.email || "",
        Avatar: user.avatar || "",
        Rating: user.feedbackPrompt?.rating || "",
        Message: user.feedbackPrompt?.message || "",
        SubmittedAt: user.feedbackPrompt?.shownAt
          ? new Date(user.feedbackPrompt.shownAt).toISOString()
          : "",
      });
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(feedbackData),
      "Feedback"
    );
    logMemory("📖 After fetching feedback for Excel");

    logMemory("📑 Before generating Excel buffer");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    logMemory("📑 After generating Excel buffer");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="readzio_official_details_data.xlsx"'
    );

    logMemory("📑 End downloadAllDataCsv");
    res.status(200).send(excelBuffer);
  } catch (error) {
    logMemory("❌ Error in downloadAllDataCsv");
    next(
      new AppError(
        error.message || "Failed to generate Excel file",
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
    logMemory("📋 Start getAllSubscriptionPlans");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "GetAllSubscriptionPlans",
        "Admin privileges required"
      );
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `subscriptionPlans:total`;
    let totalPlans = cache.get(cacheKey);

    logMemory("📊 Before checking cache for total plans");
    if (!totalPlans) {
      totalPlans = await UserSubscriptionPlan.countDocuments({
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      }).lean();
      cache.set(cacheKey, totalPlans);
    }
    logMemory("📊 After checking cache for total plans");

    const plans = [];
    logMemory("📖 Before fetching plans");
    const plansCursor = UserSubscriptionPlan.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .select("name author price durationDays type tier status createdAt")
      .populate("author", "name")
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    const limitFn = pLimit(3); // Process 3 plans at a time
    for await (const plan of plansCursor) {
      logMemory(`📄 Processing plan ${plan._id}`);
      const enrichedPlan = await limitFn(async () => {
        logMemory(`💾 Before fetching subscriptions for plan ${plan._id}`);
        const [subscriptions, activeSubscribers] = await Promise.all([
          UserSubscription.find({ planId: plan._id }).lean(),
          UserSubscription.countDocuments({
            planId: plan._id,
            status: "active",
          }).lean(),
        ]);
        logMemory(`💾 After fetching subscriptions for plan ${plan._id}`);
        const totalRevenue = subscriptions.reduce(
          (sum, sub) =>
            sub.status === "active"
              ? sum + (sub.amountPaid || plan.price || 0)
              : sum,
          0
        );
        return {
          ...plan,
          totalSubscribers: subscriptions.length,
          activeSubscribers,
          totalRevenue: totalRevenue / 100,
        };
      });
      plans.push(enrichedPlan);
    }
    logMemory("📖 After fetching plans");

    logMemory("📋 End getAllSubscriptionPlans");
    res.status(200).json({
      success: true,
      count: plans.length,
      plans,
      currentPage: page,
      totalPages: Math.ceil(totalPlans / limit),
      totalPlans,
    });
  } catch (error) {
    logMemory("❌ Error in getAllSubscriptionPlans");
    next(
      new AppError(
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
    logMemory("🔐 Start toggleUserEligibility");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "ToggleUserEligibility",
        "Admin privileges required"
      );
    }

    const { userId, enable } = req.body;
    validateObjectId(userId, "User ID");

    logMemory("💾 Before updating user eligibility");
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { isEligibleForSubscription: enable },
      { new: true, select: "isEligibleForSubscription" }
    ).lean();
    logMemory("💾 After updating user eligibility");

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "ToggleUserEligibility",
        "User does not exist"
      );
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "TOGGLED_SUBSCRIPTION_ELIGIBILITY",
      message: `Admin ${
        enable ? "enabled" : "disabled"
      } subscription eligibility for user ${userId}`,
      targetUserId: userId,
    });
    logMemory("📝 After recording activity");

    logMemory("🔐 End toggleUserEligibility");
    res.status(200).json({
      success: true,
      message: `Subscription eligibility ${
        enable ? "enabled" : "disabled"
      } for user ${userId}`,
      user: {
        id: userId,
        isEligibleForSubscription: user.isEligibleForSubscription,
      },
    });
  } catch (error) {
    logMemory("❌ Error in toggleUserEligibility");
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
    logMemory("⚙️ Start updateGlobalEligibilityCriteria");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "UpdateGlobalEligibilityCriteria",
        "Admin privileges required"
      );
    }

    const {
      minFollowers = 1000,
      minPosts = 30,
      minEngagementRate = 0.02,
      minAccountAgeDays = 30,
    } = req.body;

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

    logMemory("💾 Before updating subscription config");
    const config = await SubscriptionConfig.findOneAndUpdate(
      { key: "subscriptionEligibility" },
      { minFollowers, minPosts, minEngagementRate, minAccountAgeDays },
      { upsert: true, new: true }
    ).lean();
    logMemory("💾 After updating subscription config");

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "UPDATED_SUBSCRIPTION_CRITERIA",
      message: `Updated global subscription criteria: ${minFollowers} followers, ${minPosts} posts, ${(
        minEngagementRate * 100
      ).toFixed(2)}% engagement rate, ${minAccountAgeDays} days account age`,
    });
    logMemory("📝 After recording activity");

    logMemory("⚙️ End updateGlobalEligibilityCriteria");
    res.status(200).json({ success: true, criteria: config });
  } catch (error) {
    logMemory("❌ Error in updateGlobalEligibilityCriteria");
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
    logMemory("🔐 Start setUserEligibilityOverride");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "SetUserEligibilityOverride",
        "Admin privileges required"
      );
    }

    const { userId } = req.params;
    const { isEligibleForSubscription, bypassSubscriptionCriteria } = req.body;
    validateObjectId(userId, "User ID");

    logMemory("💾 Before updating user eligibility override");
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
      {
        new: true,
        select: "isEligibleForSubscription bypassSubscriptionCriteria",
      }
    ).lean();
    logMemory("💾 After updating user eligibility override");

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "SetUserEligibilityOverride",
        "User does not exist"
      );
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "SET_USER_ELIGIBILITY_OVERRIDE",
      message: `Set eligibility override for user ${userId}`,
      userTarget: userId,
    });
    logMemory("📝 After recording activity");

    logMemory("🔐 End setUserEligibilityOverride");
    res.status(200).json({
      success: true,
      userId,
      isEligibleForSubscription: user.isEligibleForSubscription,
      bypassSubscriptionCriteria: user.bypassSubscriptionCriteria,
    });
  } catch (error) {
    logMemory("❌ Error in setUserEligibilityOverride");
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

// Checks user eligibility for subscription
export const checkUserEligibility = async (req, res, next) => {
  try {
    logMemory("🔍 Start checkUserEligibility");
    const { userId } = req.params;
    validateObjectId(userId, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId)
      .select("createdAt followers milestoneOverride isEligibleForSubscription")
      .lean();
    logMemory("📖 After fetching user");

    if (!user) {
      throw new AppError("User not found", 404, "CheckUserEligibility");
    }

    const followerCount =
      user.milestoneOverride?.followerCount ?? (user.followers?.length || 0);
    const posts = [];
    let postCount = 0;
    let totalEngagement = 0;

    logMemory("📖 Before fetching posts");
    const postsCursor = PostModel.find({ author: userId, isPublished: true })
      .select("likes comments")
      .lean()
      .cursor();

    for await (const post of postsCursor) {
      logMemory(`📄 Processing post ${post._id}`);
      postCount++;
      totalEngagement +=
        (post.likes?.length || 0) + (post.comments?.length || 0);
    }
    logMemory("📖 After fetching posts");

    const engagementRate =
      user.milestoneOverride?.engagementRate ??
      (postCount > 0 ? totalEngagement / postCount : 0);

    // Calculate accountAgeDays with validation
    let accountAgeDays = user.milestoneOverride?.accountAgeDays;
    if (!accountAgeDays) {
      if (!user.createdAt || isNaN(new Date(user.createdAt).getTime())) {
        throw new AppError(
          "Invalid user creation date",
          400,
          "CheckUserEligibility",
          "User creation date is invalid or missing"
        );
      }
      accountAgeDays =
        (Date.now() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
    }

    logMemory("📊 Before fetching subscription config");
    let config = await SubscriptionConfig.findOne({
      key: "subscriptionEligibility",
    }).lean();
    if (!config) {
      config = await SubscriptionConfig.findOneAndUpdate(
        { key: "subscriptionEligibility" },
        {
          minFollowers: 1000,
          minPosts: 30,
          minEngagementRate: 0.02,
          minAccountAgeDays: 30,
        },
        { upsert: true, new: true }
      ).lean();
    }
    logMemory("📊 After fetching subscription config");

    const isEligible =
      user.isEligibleForSubscription ||
      (followerCount >= config.minFollowers &&
        postCount >= config.minPosts &&
        engagementRate >= config.minEngagementRate &&
        accountAgeDays >= config.minAccountAgeDays);

    logMemory("🔍 End checkUserEligibility");
    res.status(200).json({
      success: true,
      userId,
      isEligible,
      followerCount,
      postCount,
      engagementRate: +(engagementRate * 100).toFixed(2),
      accountAgeDays: isNaN(accountAgeDays) ? 0 : +accountAgeDays.toFixed(2),
      criteria: {
        minFollowers: config.minFollowers,
        minPosts: config.minPosts,
        minEngagementRate: +(config.minEngagementRate * 100).toFixed(2),
        minAccountAgeDays: config.minAccountAgeDays,
      },
      manuallySet: !!user.isEligibleForSubscription,
      usedOverrides: !!user.milestoneOverride,
    });
  } catch (error) {
    logMemory("❌ Error in checkUserEligibility");
    next(
      new AppError(
        error.message,
        500,
        "CheckUserEligibility",
        "Failed to check user eligibility"
      )
    );
  }
};

// Toggles subscription plan status
export const toggleSubscriptionPlanStatus = async (req, res, next) => {
  try {
    logMemory("📋 Start toggleSubscriptionPlanStatus");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "ToggleSubscriptionPlanStatus",
        "Admin privileges required"
      );
    }

    const { planId, status } = req.body;
    validateObjectId(planId, "Plan ID");

    if (!["active", "suspended"].includes(status)) {
      throw new AppError(
        "Invalid status. Must be 'active' or 'suspended'",
        400,
        "ToggleSubscriptionPlanStatus",
        "Invalid plan status"
      );
    }

    logMemory("💾 Before updating plan status");
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      { status },
      { new: true, select: "name status" }
    ).lean();
    logMemory("💾 After updating plan status");

    if (!plan) {
      throw new AppError(
        "Plan not found",
        404,
        "ToggleSubscriptionPlanStatus",
        "Plan does not exist"
      );
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "TOGGLED_SUBSCRIPTION_PLAN_STATUS",
      message: `Admin set plan ${planId} to ${status}`,
      plan: { planId, name: plan.name, status },
    });
    logMemory("📝 After recording activity");

    logMemory("📋 End toggleSubscriptionPlanStatus");
    res.status(200).json({
      success: true,
      plan: { id: planId, name: plan.name, status },
    });
  } catch (error) {
    logMemory("❌ Error in toggleSubscriptionPlanStatus");
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
    logMemory("🔐 Start grantSubscriptionAccess");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "GrantSubscriptionAccess",
        "Admin privileges required"
      );
    }

    const { userId, grant } = req.body;
    validateObjectId(userId, "User ID");

    logMemory("💾 Before updating subscription access");
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { isEligibleForSubscription: grant },
      { new: true, select: "isEligibleForSubscription" }
    ).lean();
    logMemory("💾 After updating subscription access");

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "GrantSubscriptionAccess",
        "User does not exist"
      );
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "GRANTED_SUBSCRIPTION_ACCESS",
      message: `Admin ${
        grant ? "granted" : "revoked"
      } subscription creation access for user ${userId}`,
      targetUserId: userId,
    });
    logMemory("📝 After recording activity");

    logMemory("🔐 End grantSubscriptionAccess");
    res.status(200).json({
      success: true,
      message: `Subscription creation access ${
        grant ? "granted" : "revoked"
      } for user ${userId}`,
      user: {
        id: userId,
        isEligibleForSubscription: user.isEligibleForSubscription,
      },
    });
  } catch (error) {
    logMemory("❌ Error in grantSubscriptionAccess");
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

// Overrides user milestones
export const overrideUserMilestones = async (req, res, next) => {
  try {
    logMemory("🔧 Start overrideUserMilestones");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Admin access required",
        403,
        "OverrideUserMilestones"
      );
    }

    const { userId } = req.params;
    const {
      followerCount,
      postCount,
      engagementRate,
      accountAgeDays,
      isEligibleForSubscription,
    } = req.body;
    validateObjectId(userId, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError("User not found", 404, "OverrideUserMilestones");
    }

    logMemory("💾 Before updating user milestones");
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        milestoneOverride: {
          followerCount:
            followerCount ?? user.milestoneOverride?.followerCount ?? null,
          postCount: postCount ?? user.milestoneOverride?.postCount ?? null,
          engagementRate:
            engagementRate ?? user.milestoneOverride?.engagementRate ?? null,
          accountAgeDays:
            accountAgeDays ?? user.milestoneOverride?.accountAgeDays ?? null,
        },
        ...(isEligibleForSubscription !== undefined && {
          isEligibleForSubscription,
        }),
      },
      { new: true, select: "milestoneOverride isEligibleForSubscription" }
    ).lean();
    logMemory("💾 After updating user milestones");

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "OVERRIDDEN_USER_MILESTONES",
      message: `Admin overrode milestone for user ${userId}`,
      targetUserId: userId,
    });
    logMemory("📝 After recording activity");

    logMemory("🔧 End overrideUserMilestones");
    res.status(200).json({
      success: true,
      message: "User milestone overridden successfully",
      userId,
      milestoneOverride: updatedUser.milestoneOverride,
      isEligibleForSubscription: updatedUser.isEligibleForSubscription,
    });
  } catch (error) {
    logMemory("❌ Error in overrideUserMilestones");
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

// Resets user milestones
export const resetUserMilestones = async (req, res, next) => {
  try {
    logMemory("🔄 Start resetUserMilestones");
    if (!req.user?.isAdmin) {
      throw new AppError("Admin access required", 403, "ResetUserMilestones");
    }

    const { userId } = req.params;
    validateObjectId(userId, "User ID");

    logMemory("💾 Before resetting user milestones");
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        milestoneOverride: {
          followerCount: null,
          postCount: null,
          engagementRate: null,
          accountAgeDays: null,
        },
      },
      { new: true, select: "milestoneOverride" }
    ).lean();
    logMemory("💾 After resetting user milestones");

    if (!user) {
      throw new AppError("User not found", 404, "ResetUserMilestones");
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id.toString(),
      action: "RESET_USER_MILESTONES",
      message: `Admin reset milestone override for user ${userId}`,
      targetUserId: userId,
    });
    logMemory("📝 After recording activity");

    logMemory("🔄 End resetUserMilestones");
    res.status(200).json({
      success: true,
      message: "Milestone override reset to default",
    });
  } catch (error) {
    logMemory("❌ Error in resetUserMilestones");
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
