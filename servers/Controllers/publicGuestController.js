// publicGuestController.js
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

const cache = new NodeCache({ stdTTL: 3600 }); // Extended TTL to 1 hour

// Rate limiter for guest visits
const guestVisitLimiter = new Map();
const GUEST_VISIT_LIMIT = 10; // Max visits per minute per IP
const GUEST_VISIT_WINDOW = 60 * 1000; // 1 minute

// GET /public/posts
// GET /public/posts
export const getPublicPosts = async (req, res, next) => {
  try {
    logMemory("Before getPublicPosts start");
    const { page = 1, limit = 12, tag, after } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const cacheKey = `publicPosts:${pageNum}:${limitNum}:${tag || "all"}:${
      after || "none"
    }`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
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
      blocked: { $ne: true }, // Changed from blocked: false
      ...(tag ? { tags: { $in: [tag] } } : {}),
      ...(after ? { createdAt: { $lt: new Date(after) } } : {}),
    };

    console.log("Query:", JSON.stringify(query));
    logMemory("Before PostModel.find");
    const posts = await PostModel.find(query)
      .maxTimeMS(10000)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    console.log("Posts fetched:", posts.length);
    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory("Before PostModel.countDocuments");
    const total = await PostModel.countDocuments(query).maxTimeMS(5000).lean();
    console.log("Total posts:", total);

    const lastFetched = posts.length ? posts[posts.length - 1].createdAt : null;

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, { posts: processedPosts, total, lastFetched });

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
      lastFetched,
    });
  } catch (error) {
    console.error("Error in getPublicPosts:", error.message, error.stack);
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
    logMemory("Before getPublicPostBySlug start");
    const { slug } = req.params;
    const cacheKey = `publicPost:${slug.toLowerCase()}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPost = cache.get(cacheKey);
    if (cachedPost) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, post: cachedPost });
    }

    console.log("Queried slug:", slug);
    logMemory("Before PostModel.findOne");
    const post = await PostModel.findOne({
      slug: { $regex: slug, $options: "i" },
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
      console.log("Post not found for slug:", slug);
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPostBySlug"
      );
    }

    console.log("Post fetched:", post.title);
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
    console.error("Error in getPublicPostBySlug:", error.message, error.stack);
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
    logMemory("Before trackGuestView start");
    const { slug } = req.params;
    logMemory("Before PostModel.findOneAndUpdate");
    const post = await PostModel.findOneAndUpdate(
      {
        slug: { $regex: `^${slug}$`, $options: "i" },
        isPublished: true,
        blocked: false,
      },
      { $inc: { viewsCount: 1 } },
      { select: "_id title" }
    )
      .maxTimeMS(10000)
      .lean();

    if (!post) {
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    logMemory("Before GuestVisitModel.create");
    await GuestVisitModel.create({
      slug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    logMemory("Before socket emit");
    io.to("adminRoom").emit("guestViewUpdate", {
      postId: post._id,
      slug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      location: req.headers["cf-ipcountry"] || null,
    });

    logMemory("After trackGuestView complete");
    res.status(200).json({ success: true, message: "Guest view recorded" });
  } catch (error) {
    console.error("Error in trackGuestView:", error.message, error.stack);
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
    logMemory("Before trackGuestVisit start");
    const ip = req.ip;
    const now = Date.now();
    const limiterEntry = guestVisitLimiter.get(ip) || {
      count: 0,
      lastReset: now,
    };

    if (now - limiterEntry.lastReset > GUEST_VISIT_WINDOW) {
      limiterEntry.count = 0;
      limiterEntry.lastReset = now;
    }

    if (limiterEntry.count >= GUEST_VISIT_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "Too many guest visits, please try again later",
      });
    }

    limiterEntry.count += 1;
    guestVisitLimiter.set(ip, limiterEntry);

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
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    }

    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);

    logMemory("Before GuestModel.findOne");
    const existingGuest = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    })
      .maxTimeMS(10000)
      .lean();

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
          firstVisit: new Date(),
          guestId,
          fingerprint,
        },
        $set: {
          lastVisit: new Date(),
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
    )
      .maxTimeMS(10000)
      .lean();

    const isNewGuest = !existingGuest;

    if (isNewGuest) {
      logMemory("Before AnalyticsModel.findOneAndUpdate");
      await AnalyticsModel.findOneAndUpdate(
        { _id: "guest-analytics" },
        { $inc: { "traffic.guestUsersCount": 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
        .maxTimeMS(10000)
        .lean();
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
    console.error("Error in trackGuestVisit:", error.message, error.stack);
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
    logMemory("Before searchPublicPosts start");
    const { query, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const cacheKey = `searchPosts:${query.toLowerCase()}:${pageNum}:${limitNum}`;

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

    const searchQuery = {
      isPublished: true,
      blocked: false,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { excerpt: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    };

    console.log("Search query:", JSON.stringify(searchQuery));
    logMemory("Before PostModel.find");
    const posts = await PostModel.find(searchQuery)
      .maxTimeMS(10000)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    console.log("Posts fetched:", posts.length);
    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory("Before PostModel.countDocuments");
    const total = await PostModel.countDocuments(searchQuery)
      .maxTimeMS(5000)
      .lean();
    console.log("Total posts:", total);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, { posts: processedPosts, total });

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "SEARCHED_PUBLIC_POSTS",
        message: `Searched public posts: ${query} (page: ${pageNum})`,
      });
    }

    logMemory("After searchPublicPosts complete");
    res.status(200).json({
      success: true,
      posts: processedPosts,
      total,
      page: pageNum,
    });
  } catch (error) {
    console.error("Error in searchPublicPosts:", error.message, error.stack);
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
