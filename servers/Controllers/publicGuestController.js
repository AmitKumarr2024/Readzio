import { v4 as uuidv4 } from "uuid";
import PostModel from "../../servers/Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";
import GuestVisitModel from "../../servers/Models/GuestVisit.js";
import GuestModel from "../../servers/Models/GuestModel.js";
import AnalyticsModel from "../../servers/Models/AnalyticsModel.js";
import mongoose from "mongoose";
import { io } from "../../servers/sockets/socket.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import pLimit from "p-limit";
import NodeCache from "node-cache";
import { logMemory } from "../../servers/Utils/memoryLogger.js"; // Added import

// Initialize cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Validates ObjectId
const validateObjectId = (id, type = "ID") => {
  logMemory(`Before validateObjectId: ${type}`);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid ${type}`,
      400,
      "ValidateObjectId",
      `Invalid ${type} provided`
    );
  }
  logMemory(`After validateObjectId: ${type}`);
};

// 🟢 Get all published + unblocked posts with optional tag filtering
export const getPublicPosts = async (req, res, next) => {
  try {
    logMemory("Before getPublicPosts start");
    const { page = 1, limit = 20, tag } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const cacheKey = `publicPosts:${pageNum}:${limitNum}:${tag || "all"}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        posts: cachedPosts.posts,
        total: cachedPosts.total,
        page: pageNum,
      });
    }

    const query = {
      isPublished: true,
      blocked: false,
      ...(tag ? { tags: { $in: [tag] } } : {}),
    };

    logMemory("Before PostModel.find");
    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory("Before PostModel.countDocuments");
    const total = await PostModel.countDocuments(query).lean();

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, { posts: processedPosts, total });

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POSTS",
        message: `Viewed public posts (page: ${pageNum}, tag: ${
          tag || "none"
        })`,
      });
    }

    logMemory("After getPublicPosts complete");
    res.status(200).json({
      success: true,
      posts: processedPosts,
      total,
      page: pageNum,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch public posts",
            500,
            "GetPublicPosts"
          )
    );
  }
};

// 🟢 Get single public post by slug
export const getPublicPostBySlug = async (req, res, next) => {
  try {
    logMemory("Before getPublicPostBySlug start");
    const { slug } = req.params;
    const sanitizedSlug = slug.trim().toLowerCase();
    const cacheKey = `publicPost:${sanitizedSlug}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPost = cache.get(cacheKey);
    if (cachedPost) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, post: cachedPost });
    }

    logMemory("Before PostModel.findOne");
    const post = await PostModel.findOne({
      slug: sanitizedSlug,
      isPublished: true,
      blocked: false,
    })
      .select(
        "title slug category excerpt thumbnail author createdAt isPublished readTime tags language viewsCount shareCount blocks"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (!post) {
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPostBySlug"
      );
    }

    logMemory("Before processing blocks");
    post.blocks = Array.isArray(post.blocks) ? post.blocks : [];

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, post);

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POST",
        targetPost: post._id,
        message: `Viewed public post: ${post.title}`,
      });
    }

    logMemory("After getPublicPostBySlug complete");
    res.status(200).json({ success: true, post });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch public post",
            500,
            "GetPublicPostBySlug"
          )
    );
  }
};

// 🟢 Track guest view
export const trackGuestView = async (req, res, next) => {
  try {
    logMemory("Before trackGuestView start");
    const { slug } = req.params;
    const sanitizedSlug = slug.trim().toLowerCase();

    logMemory("Before PostModel.findOneAndUpdate");
    const post = await PostModel.findOneAndUpdate(
      { slug: sanitizedSlug, isPublished: true, blocked: false },
      { $inc: { viewsCount: 1 } },
      { select: "_id title" }
    ).lean();

    if (!post) {
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    logMemory("Before GuestVisitModel.create");
    await GuestVisitModel.create({
      slug: sanitizedSlug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    logMemory("Before socket emit");
    io.to("adminRoom").emit("guestViewUpdate", {
      postId: post._id,
      slug: sanitizedSlug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      location: req.headers["cf-ipcountry"] || null,
    });

    logMemory("After trackGuestView complete");
    res.status(200).json({ success: true, message: "Guest view recorded" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to record guest view",
            500,
            "TrackGuestView"
          )
    );
  }
};

// 🔹 Track guest visit — with unique guest count tracking
export const trackGuestVisit = async (req, res, next) => {
  try {
    logMemory("Before trackGuestVisit start");
    if (req.user && req.user._id) {
      logMemory("Authenticated user detected");
      return res.status(200).json({
        success: false,
        message: "Authenticated user — guest tracking skipped",
      });
    }

    let guestId = req.cookies.guestId;
    const fingerprint = `${req.ip}-${req.headers["user-agent"]}`;

    logMemory("Before checking guestId");
    if (!guestId) {
      guestId = uuidv4();
      res.cookie("guestId", guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    logMemory("Before GuestModel.findOne");
    const existingGuest = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    }).lean();

    if (existingGuest && existingGuest.lastVisit > fifteenMinutesAgo) {
      logMemory("Recent visit detected");
      return res.status(200).json({
        success: true,
        message: "Visit already recorded recently",
      });
    }

    logMemory("Before GuestModel.findOneAndUpdate");
    const updatedGuest = await GuestModel.findOneAndUpdate(
      { $or: [{ guestId }, { fingerprint }] },
      {
        $setOnInsert: {
          firstVisit: now,
          guestId,
          fingerprint,
        },
        $set: {
          lastVisit: now,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
        $inc: { visitCount: 1 },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const isNewGuest = !existingGuest;

    if (isNewGuest) {
      logMemory("Before AnalyticsModel.findOneAndUpdate");
      await AnalyticsModel.findOneAndUpdate(
        { _id: "guest-analytics" },
        { $inc: { "traffic.guestUsersCount": 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    }

    logMemory("Before socket emit");
    io.to("adminRoom").emit("guestVisitUpdate", {
      guestId: updatedGuest.guestId,
      visitCount: updatedGuest.visitCount,
      lastVisit: updatedGuest.lastVisit,
      ip: updatedGuest.ip,
      userAgent: updatedGuest.userAgent,
      location: req.headers["cf-ipcountry"] || null,
    });

    logMemory("After trackGuestVisit complete");
    res.status(200).json({
      success: true,
      message: "Guest visit tracked",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track guest visit", 500, "TrackGuestVisit")
    );
  }
};
