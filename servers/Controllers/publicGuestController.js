// publicGuestController.js - Fixed Version
import { v4 as uuidv4 } from "uuid";
import PostModel from "../../servers/Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";
import GuestVisitModel from "../../servers/Models/GuestVisit.js";
import GuestModel from "../../servers/Models/GuestModel.js";
import AnalyticsModel from "../../servers/Models/AnalyticsModel.js";
import mongoose from "mongoose";
import { io } from "../../servers/sockets/socket.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import NodeCache from "node-cache";
import { logMemory } from "../../servers/Utils/memoryLogger.js";

const cache = new NodeCache({ stdTTL: 3600 });

// Rate limiter with cleanup
const guestVisitLimiter = new Map();
const GUEST_VISIT_LIMIT = 100;
const GUEST_VISIT_WINDOW = 60 * 1000;

// Cleanup rate limiter every 2 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of guestVisitLimiter.entries()) {
    if (now - entry.lastReset > GUEST_VISIT_WINDOW * 2) {
      guestVisitLimiter.delete(ip);
    }
  }
}, GUEST_VISIT_WINDOW * 2);

// Utility function to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Utility function to get real IP
const getRealIP = (req) => {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    req.ip
  );
};

// Utility function for safe socket emit
const safeSocketEmit = (event, data) => {
  try {
    if (io && io.to) {
      io.to("adminRoom").emit(event, data);
    }
  } catch (error) {
    console.error("Socket emit error:", error.message);
  }
};

// GET /public/posts
export const getPublicPosts = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "development") {
      logMemory("Before getPublicPosts start");
    }

    const { page = 1, limit = 12, tag, after, blocked = false } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 12), 100);

    // Create more specific cache key
    const cacheKey = `publicPosts:v2:${pageNum}:${limitNum}:${tag || "all"}:${
      after || "none"
    }:${blocked}`;

    console.log(
      `Request params: page=${pageNum}, limit=${limitNum}, tag=${
        tag || "none"
      }, after=${after || "none"}, blocked=${blocked}`
    );

    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      console.log(`Returning cached posts: ${cachedPosts.posts.length} posts`);
      return res.status(200).json({
        success: true,
        posts: cachedPosts.posts,
        total: cachedPosts.total,
        page: pageNum,
        lastFetched: cachedPosts.lastFetched,
      });
    }

    const query = {
      isPublished: true,
      blocked: blocked === "false" ? false : { $ne: true },
      ...(tag ? { tags: { $in: [tag] } } : {}),
      ...(after && !isNaN(Date.parse(after))
        ? { createdAt: { $lt: new Date(after) } }
        : {}),
    };

    console.log("Query:", JSON.stringify(query));

    // Use aggregation for better performance
    const [posts, totalResult] = await Promise.all([
      PostModel.find(query)
        .maxTimeMS(10000)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select(
          "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
        )
        .populate("author", "name avatar")
        .populate("category", "name slug")
        .lean(),

      PostModel.aggregate([{ $match: query }, { $count: "total" }]).maxTimeMS(
        5000
      ),
    ]);

    const total = totalResult[0]?.total || 0;

    console.log("Posts fetched:", posts.length, "Total:", total);

    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    const lastFetched = posts.length ? posts[posts.length - 1].createdAt : null;

    cache.set(cacheKey, { posts: processedPosts, total, lastFetched });
    console.log(`Cached posts: ${processedPosts.length} posts`);

    if (req.user?._id) {
      // Don't await this - let it run in background
      recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POSTS",
        message: `Viewed public posts (page: ${pageNum}, tag: ${
          tag || "none"
        })`,
      }).catch((err) => console.error("Activity record error:", err.message));
    }

    res.status(200).json({
      success: true,
      posts: processedPosts,
      total,
      page: pageNum,
      lastFetched,
    });
  } catch (error) {
    console.error("Error in getPublicPosts:", error.message);
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

// GET /public/post/:slug
export const getPublicPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      throw new AppError("Invalid slug parameter", 400, "GetPublicPostBySlug");
    }

    const normalizedSlug = slug.toLowerCase().trim();
    const cacheKey = `publicPost:v2:${normalizedSlug}`;

    console.log(`Requesting post with slug: ${normalizedSlug}`);

    const cachedPost = cache.get(cacheKey);
    if (cachedPost) {
      console.log(`Returning cached post: ${cachedPost.title}`);
      return res.status(200).json({ success: true, post: cachedPost });
    }

    const post = await PostModel.findOne({
      slug: { $regex: `^${escapeRegex(normalizedSlug)}$`, $options: "i" },
      isPublished: true,
      blocked: false,
    })
      .maxTimeMS(10000)
      .select(
        "title slug category excerpt thumbnail author createdAt isPublished readTime tags language viewsCount shareCount blocks"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (!post) {
      console.log("Post not found for slug:", normalizedSlug);
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPostBySlug"
      );
    }

    console.log("Post fetched:", post.title);
    post.blocks = Array.isArray(post.blocks) ? post.blocks : [];

    cache.set(cacheKey, post);
    console.log(`Cached post: ${post.title}`);

    if (req.user?._id) {
      recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POST",
        targetPost: post._id,
        message: `Viewed public post: ${post.title}`,
      }).catch((err) => console.error("Activity record error:", err.message));
    }

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Error in getPublicPostBySlug:", error.message);
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

// POST /public/post/:slug/view
export const trackGuestView = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      throw new AppError("Invalid slug parameter", 400, "TrackGuestView");
    }

    const normalizedSlug = slug.toLowerCase().trim();
    console.log(`Tracking view for slug: ${normalizedSlug}`);

    const post = await PostModel.findOneAndUpdate(
      {
        slug: { $regex: `^${escapeRegex(normalizedSlug)}$`, $options: "i" },
        isPublished: true,
        blocked: false,
      },
      { $inc: { viewsCount: 1 } },
      { select: "_id title", new: true }
    )
      .maxTimeMS(10000)
      .lean();

    if (!post) {
      console.log("Post not found for slug:", normalizedSlug);
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    console.log(`Incremented views for post: ${post.title}`);

    const realIP = getRealIP(req);

    // Don't await these operations - let them run in background
    GuestVisitModel.create({
      slug: normalizedSlug,
      ip: realIP,
      userAgent: req.headers["user-agent"] || "",
    }).catch((err) =>
      console.error("Guest visit creation error:", err.message)
    );

    safeSocketEmit("guestViewUpdate", {
      postId: post._id,
      slug: normalizedSlug,
      ip: realIP,
      userAgent: req.headers["user-agent"] || "",
      location: req.headers["cf-ipcountry"] || null,
    });

    res.status(200).json({ success: true, message: "Guest view recorded" });
  } catch (error) {
    console.error("Error in trackGuestView:", error.message);
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

// POST /public/guest/visit
export const trackGuestVisit = async (req, res, next) => {
  try {
    const realIP = getRealIP(req);
    const now = Date.now();
    const limiterEntry = guestVisitLimiter.get(realIP) || {
      count: 0,
      lastReset: now,
    };

    console.log(`Checking rate limit for IP: ${realIP}`);
    if (now - limiterEntry.lastReset > GUEST_VISIT_WINDOW) {
      limiterEntry.count = 0;
      limiterEntry.lastReset = now;
    }

    if (limiterEntry.count >= GUEST_VISIT_LIMIT) {
      console.log(`Rate limit exceeded for IP: ${realIP}`);
      return res.status(429).json({
        success: false,
        message: "Too many guest visits, please try again later",
      });
    }

    limiterEntry.count += 1;
    guestVisitLimiter.set(realIP, limiterEntry);

    if (req.user?._id) {
      console.log(`Authenticated user detected: ${req.user._id}`);
      return res.status(200).json({
        success: false,
        message: "Authenticated user — guest tracking skipped",
      });
    }

    let guestId = req.cookies.guestId;
    const fingerprint = `${realIP}-${req.headers["user-agent"] || ""}`;

    if (!guestId || typeof guestId !== "string") {
      guestId = uuidv4();
      res.cookie("guestId", guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      console.log(`Generated new guestId: ${guestId}`);
    }

    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);

    const existingGuest = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    })
      .maxTimeMS(10000)
      .lean();

    if (existingGuest && existingGuest.lastVisit > fifteenMinutesAgo) {
      console.log(`Recent visit detected for guestId: ${guestId}`);
      return res.status(200).json({
        success: true,
        message: "Visit already recorded recently",
      });
    }

    const updatedGuest = await GuestModel.findOneAndUpdate(
      { $or: [{ guestId }, { fingerprint }] },
      {
        $setOnInsert: {
          firstVisit: new Date(),
          guestId,
          fingerprint,
        },
        $set: {
          lastVisit: new Date(),
          ip: realIP,
          userAgent: req.headers["user-agent"] || "",
        },
        $inc: { visitCount: 1 },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .maxTimeMS(10000)
      .lean();

    console.log(
      `Updated guest: ${updatedGuest.guestId}, visitCount: ${updatedGuest.visitCount}`
    );
    const isNewGuest = !existingGuest;

    if (isNewGuest) {
      // Run in background
      AnalyticsModel.findOneAndUpdate(
        { _id: "guest-analytics" },
        { $inc: { "traffic.guestUsersCount": 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
        .maxTimeMS(10000)
        .catch((err) => console.error("Analytics update error:", err.message));
    }

    safeSocketEmit("guestVisitUpdate", {
      guestId: updatedGuest.guestId,
      visitCount: updatedGuest.visitCount,
      lastVisit: updatedGuest.lastVisit,
      ip: updatedGuest.ip,
      userAgent: updatedGuest.userAgent,
      location: req.headers["cf-ipcountry"] || null,
    });

    res.status(200).json({
      success: true,
      message: "Guest visit tracked",
      guest: {
        guestId: updatedGuest.guestId,
        visitCount: updatedGuest.visitCount,
        lastVisit: updatedGuest.lastVisit,
        ip: updatedGuest.ip,
        userAgent: updatedGuest.userAgent,
        location: req.headers["cf-ipcountry"] || null,
      },
    });
  } catch (error) {
    console.error("Error in trackGuestVisit:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track guest visit", 500, "TrackGuestVisit")
    );
  }
};

// GET /public/search-posts
export const searchPublicPosts = async (req, res, next) => {
  try {
    const { query, page = 1, limit = 12 } = req.query;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new AppError("Search query is required", 400, "SearchPublicPosts");
    }

    const searchTerm = query.trim();
    if (searchTerm.length > 100) {
      throw new AppError("Search query too long", 400, "SearchPublicPosts");
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 12), 100);
    const cacheKey = `searchPosts:v2:${searchTerm.toLowerCase()}:${pageNum}:${limitNum}`;

    console.log(
      `Search params: query=${searchTerm}, page=${pageNum}, limit=${limitNum}`
    );

    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      console.log(
        `Returning cached search results: ${cachedPosts.posts.length} posts`
      );
      return res.status(200).json({
        success: true,
        posts: cachedPosts.posts,
        total: cachedPosts.total,
        page: pageNum,
      });
    }

    const escapedQuery = escapeRegex(searchTerm);
    const searchQuery = {
      isPublished: true,
      blocked: false,
      $or: [
        { title: { $regex: escapedQuery, $options: "i" } },
        { excerpt: { $regex: escapedQuery, $options: "i" } },
        { tags: { $regex: escapedQuery, $options: "i" } },
      ],
    };

    console.log("Search query:", JSON.stringify(searchQuery));

    const [posts, totalResult] = await Promise.all([
      PostModel.find(searchQuery)
        .maxTimeMS(10000)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select(
          "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
        )
        .populate("author", "name avatar")
        .populate("category", "name slug")
        .lean(),

      PostModel.aggregate([
        { $match: searchQuery },
        { $count: "total" },
      ]).maxTimeMS(5000),
    ]);

    const total = totalResult[0]?.total || 0;

    console.log("Posts fetched:", posts.length, "Total:", total);

    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    cache.set(cacheKey, { posts: processedPosts, total });
    console.log(`Cached search results: ${processedPosts.length} posts`);

    if (req.user?._id) {
      recordActivity({
        userId: req.user._id,
        action: "SEARCHED_PUBLIC_POSTS",
        message: `Searched public posts: ${searchTerm} (page: ${pageNum})`,
      }).catch((err) => console.error("Activity record error:", err.message));
    }

    res.status(200).json({
      success: true,
      posts: processedPosts,
      total,
      page: pageNum,
    });
  } catch (error) {
    console.error("Error in searchPublicPosts:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to search public posts",
            500,
            "SearchPublicPosts"
          )
    );
  }
};

// Cleanup on process exit
process.on("SIGINT", () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});

process.on("SIGTERM", () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});
