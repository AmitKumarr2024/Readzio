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

const cache = new NodeCache({ stdTTL: 300 }); // Reduced to 5 minutes for better freshness

// Rate limiter for guest visits
const guestVisitLimiter = new Map();
const GUEST_VISIT_LIMIT = 100; // Max visits per minute per IP
const GUEST_VISIT_WINDOW = 60 * 1000; // 1 minute

// Helper function to clean up rate limiter
const cleanupRateLimiter = () => {
  const now = Date.now();
  for (const [key, data] of guestVisitLimiter.entries()) {
    if (now - data.windowStart > GUEST_VISIT_WINDOW) {
      guestVisitLimiter.delete(key);
    }
  }
};

// Clean up rate limiter every 5 minutes
setInterval(cleanupRateLimiter, 5 * 60 * 1000);

// GET /public/posts - Fixed and optimized version
export const getPublicPosts = async (req, res, next) => {
  try {
    logMemory("Before getPublicPosts start");

    // Enhanced input validation
    const {
      page = 1,
      limit = 12,
      tag,
      after,
      cursor, // Support both after and cursor for infinite scroll
      blocked = false,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Validate and sanitize inputs
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 12, 1), 50); // Reduced max limit

    // Determine if using infinite scroll
    const cursorValue = cursor || after;
    const useInfiniteScroll = !!cursorValue;

    // Validate cursor/after parameter
    let cursorDate = null;
    if (cursorValue) {
      cursorDate = new Date(cursorValue);
      if (isNaN(cursorDate.getTime())) {
        return next(
          new AppError("Invalid cursor/after date format", 400, "InvalidCursor")
        );
      }
    }

    // Validate and sanitize tag
    const sanitizedTag = tag ? tag.trim().replace(/[<>\"']/g, "") : null;
    if (tag && (!sanitizedTag || sanitizedTag.length === 0)) {
      return next(new AppError("Invalid tag parameter", 400, "InvalidTag"));
    }

    // Validate blocked parameter
    const isBlocked = blocked === "true" || blocked === true;

    // Validate sort parameters
    const allowedSortFields = ["createdAt", "viewsCount", "shareCount"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    // Create cache key based on request type
    const cacheKey = useInfiniteScroll
      ? `infinitePosts:${limitNum}:${sanitizedTag || "all"}:${
          cursorValue || "start"
        }:${isBlocked}:${sortField}:${sortOrder}`
      : `publicPosts:${pageNum}:${limitNum}:${
          sanitizedTag || "all"
        }:${isBlocked}:${sortField}:${sortOrder}`;

    console.log(
      `Request params: ${
        useInfiniteScroll ? "infinite scroll" : "pagination"
      }, ` +
        `page=${pageNum}, limit=${limitNum}, tag=${sanitizedTag || "none"}, ` +
        `cursor=${
          cursorValue || "none"
        }, blocked=${isBlocked}, sort=${sortField}:${sortOrder}`
    );

    logMemory(`Before checking cache: ${cacheKey}`);

    // Check cache with validation
    const cachedResult = cache.get(cacheKey);
    if (
      cachedResult &&
      cachedResult.posts &&
      Array.isArray(cachedResult.posts)
    ) {
      // Validate cache age for infinite scroll (shorter TTL)
      const cacheAge =
        Date.now() - new Date(cachedResult.cachedAt || 0).getTime();
      const maxCacheAge = useInfiniteScroll ? 60000 : 300000; // 1min vs 5min

      if (cacheAge < maxCacheAge) {
        logMemory(`Cache hit: ${cacheKey}`);
        console.log(
          `Returning cached posts: ${cachedResult.posts.length} posts`
        );

        return res.status(200).json({
          success: true,
          posts: cachedResult.posts,
          pagination: {
            ...(useInfiniteScroll
              ? {
                  hasMore: cachedResult.hasMore || false,
                  nextCursor: cachedResult.nextCursor || null,
                  isInfiniteScroll: true,
                }
              : {
                  total: cachedResult.total || 0,
                  page: pageNum,
                  totalPages: Math.ceil((cachedResult.total || 0) / limitNum),
                  hasNextPage: cachedResult.hasMore || false,
                }),
          },
          lastFetched: cachedResult.lastFetched,
          meta: {
            cached: true,
            cacheAge: Math.round(cacheAge / 1000) + "s",
          },
        });
      } else {
        // Cache expired, remove it
        cache.del(cacheKey);
      }
    }

    // Build enhanced query with proper validation
    const baseQuery = {
      isPublished: true,
      blocked: isBlocked ? true : { $ne: true },
      // Enhanced validation filters
      $and: [
        { title: { $exists: true, $ne: null, $ne: "" } },
        { slug: { $exists: true, $ne: null, $ne: "" } },
        { author: { $exists: true, $ne: null } },
        { createdAt: { $exists: true, $type: "date" } },
        // Ensure post is not soft deleted
        { $or: [{ deleted: { $exists: false } }, { deleted: false }] },
        // Ensure minimum content exists
        {
          $or: [
            { excerpt: { $exists: true, $ne: null, $ne: "" } },
            { blocks: { $exists: true, $not: { $size: 0 } } },
          ],
        },
      ],
    };

    // Add tag filter with proper validation
    if (sanitizedTag) {
      baseQuery.tags = {
        $in: [new RegExp(sanitizedTag, "i")], // Case-insensitive search
        $exists: true,
        $ne: null,
      };
    }

    // Add cursor-based filtering for infinite scroll
    if (cursorDate) {
      const cursorFilter =
        sortOrder === 1 ? { $gt: cursorDate } : { $lt: cursorDate };
      baseQuery[sortField] = cursorFilter;
    }

    console.log("Enhanced Query:", JSON.stringify(baseQuery, null, 2));

    // Check database connection
    if (PostModel.db.readyState !== 1) {
      throw new AppError(
        "Database connection unavailable",
        503,
        "DatabaseUnavailable"
      );
    }

    logMemory("Before PostModel.find");

    // Build optimized query
    const fetchLimit = useInfiniteScroll ? limitNum + 1 : limitNum;
    const sortQuery = {};
    sortQuery[sortField] = sortOrder;
    if (sortField !== "createdAt") {
      sortQuery.createdAt = -1; // Secondary sort for consistency
    }
    if (sortField !== "_id") {
      sortQuery._id = sortOrder; // Tertiary sort for absolute consistency
    }

    const queryBuilder = PostModel.find(baseQuery)
      .maxTimeMS(15000) // Increased timeout
      .sort(sortQuery)
      .limit(fetchLimit)
      .select(
        [
          "_id",
          "title",
          "slug",
          "thumbnail",
          "excerpt",
          "author",
          "category",
          "viewsCount",
          "shareCount",
          "createdAt",
          "updatedAt",
          "tags",
          "blocks",
        ].join(" ")
      )
      .populate({
        path: "author",
        select: "name avatar username",
        match: {
          $and: [{ active: { $ne: false } }, { deleted: { $ne: true } }],
        },
        options: { lean: true },
      })
      .populate({
        path: "category",
        select: "name slug description",
        match: {
          active: { $ne: false },
          deleted: { $ne: true },
        },
        options: { lean: true },
      })
      .lean();

    // Add skip for traditional pagination only
    if (!useInfiniteScroll && pageNum > 1) {
      queryBuilder.skip((pageNum - 1) * limitNum);
    }

    const rawPosts = await queryBuilder.exec();

    if (!rawPosts) {
      throw new AppError(
        "Failed to fetch posts from database",
        500,
        "DatabaseQueryFailed"
      );
    }

    // Check for more posts (infinite scroll)
    const hasMore = useInfiniteScroll ? rawPosts.length > limitNum : false;
    const posts = hasMore ? rawPosts.slice(0, limitNum) : rawPosts;

    console.log(
      `Posts fetched: ${posts.length}${hasMore ? " (hasMore: true)" : ""}`
    );
    logMemory("Before processing posts");

    // Enhanced post processing with validation
    const processedPosts = posts
      .filter((post) => {
        // Strict validation - filter out invalid posts
        if (!post || !post._id || !post.title || !post.slug) {
          console.warn(
            `Filtering out invalid post: ${
              post?._id || "unknown"
            } - missing required fields`
          );
          return false;
        }

        if (!post.author) {
          console.warn(
            `Filtering out post ${post._id} - missing or invalid author`
          );
          return false;
        }

        // Check if post has minimum content
        const hasContent =
          (post.excerpt && post.excerpt.trim().length > 0) ||
          (Array.isArray(post.blocks) && post.blocks.length > 0);
        if (!hasContent) {
          console.warn(`Filtering out post ${post._id} - no content`);
          return false;
        }

        return true;
      })
      .map((post) => {
        // Ensure blocks is always an array
        const blocks = Array.isArray(post.blocks) ? post.blocks : [];

        // Clean and enhance post data
        return {
          id: post._id,
          title: post.title.trim(),
          slug: post.slug,
          thumbnail: post.thumbnail || null,
          excerpt: post.excerpt ? post.excerpt.trim() : "",
          author: {
            id: post.author._id,
            name: post.author.name || "Unknown Author",
            avatar: post.author.avatar || null,
            username: post.author.username || null,
          },
          category: post.category
            ? {
                id: post.category._id,
                name: post.category.name,
                slug: post.category.slug,
                description: post.category.description || null,
              }
            : null,
          stats: {
            viewsCount: Math.max(post.viewsCount || 0, 0),
            shareCount: Math.max(post.shareCount || 0, 0),
          },
          timestamps: {
            createdAt: post.createdAt,
            updatedAt: post.updatedAt || post.createdAt,
          },
          tags: Array.isArray(post.tags)
            ? post.tags.filter((tag) => tag && tag.trim())
            : [],
          blocks: blocks,
          meta: {
            hasBlocks: blocks.length > 0,
            hasExcerpt: !!(post.excerpt && post.excerpt.trim()),
            hasThumbnail: !!post.thumbnail,
          },
        };
      });

    // Calculate next cursor for infinite scroll
    let nextCursor = null;
    if (hasMore && processedPosts.length > 0) {
      const lastPost = processedPosts[processedPosts.length - 1];
      nextCursor =
        lastPost.timestamps[sortField]?.toISOString() ||
        lastPost.timestamps.createdAt.toISOString();
    }

    // Get total count (only when needed to avoid expensive operations)
    let total = null;
    if (!useInfiniteScroll) {
      logMemory("Before PostModel.countDocuments");
      try {
        total = await PostModel.countDocuments(baseQuery)
          .maxTimeMS(5000)
          .exec();
        console.log("Total posts:", total);
      } catch (countError) {
        console.warn(
          "Count query failed, using approximate:",
          countError.message
        );
        total = processedPosts.length; // Fallback
      }
    }

    const lastFetched =
      processedPosts.length > 0
        ? processedPosts[processedPosts.length - 1].timestamps.createdAt
        : null;

    // Enhanced caching with metadata
    logMemory(`Before setting cache: ${cacheKey}`);
    const cacheData = {
      posts: processedPosts,
      hasMore,
      nextCursor,
      total,
      lastFetched,
      cachedAt: new Date(),
      requestParams: {
        useInfiniteScroll,
        pageNum,
        limitNum,
        sortField,
        sortOrder,
        tag: sanitizedTag,
      },
    };

    // Dynamic cache TTL based on request type
    const cacheTimeout = useInfiniteScroll ? 60 : 300; // 1min vs 5min
    cache.set(cacheKey, cacheData, cacheTimeout);
    console.log(
      `Cached ${processedPosts.length} posts with ${cacheTimeout}s TTL`
    );

    // Record user activity (with error handling)
    if (req.user?._id) {
      try {
        logMemory("Before recordActivity");
        await recordActivity({
          userId: req.user._id,
          action: "VIEWED_PUBLIC_POSTS",
          message: `Viewed public posts (${
            useInfiniteScroll ? "infinite scroll" : `page ${pageNum}`
          }${sanitizedTag ? `, tag: ${sanitizedTag}` : ""})`,
          metadata: {
            scrollType: useInfiniteScroll ? "infinite" : "pagination",
            page: pageNum,
            limit: limitNum,
            tag: sanitizedTag,
            cursor: cursorValue,
            postsCount: processedPosts.length,
            sortBy: sortField,
            sortOrder: sortOrder === 1 ? "asc" : "desc",
          },
        });
        console.log(`Activity recorded for user: ${req.user._id}`);
      } catch (activityError) {
        console.warn("Failed to record activity:", activityError.message);
      }
    }

    logMemory("After getPublicPosts complete");
    console.log(`Returning response with ${processedPosts.length} posts`);

    // Comprehensive response structure
    const response = {
      success: true,
      posts: processedPosts,
      pagination: useInfiniteScroll
        ? {
            // Infinite scroll response
            hasMore,
            nextCursor,
            isInfiniteScroll: true,
            currentCursor: cursorValue || null,
          }
        : {
            // Traditional pagination response
            total: total || 0,
            page: pageNum,
            limit: limitNum,
            totalPages: total ? Math.ceil(total / limitNum) : 0,
            hasNextPage: pageNum * limitNum < (total || 0),
            hasPreviousPage: pageNum > 1,
          },
      meta: {
        lastFetched,
        sortBy: sortField,
        sortOrder: sortOrder === 1 ? "asc" : "desc",
        tag: sanitizedTag || null,
        cached: false,
        processingTime: Date.now() - req.startTime || 0,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getPublicPosts:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    // Enhanced cache cleanup on error
    try {
      const {
        page = 1,
        limit = 12,
        tag,
        after,
        cursor,
        blocked = false,
        sortBy = "createdAt",
        order = "desc",
      } = req.query;
      const cursorValue = cursor || after;
      const useInfiniteScroll = !!cursorValue;
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 12, 1), 50);
      const sanitizedTag = tag ? tag.trim().replace(/[<>\"']/g, "") : null;
      const isBlocked = blocked === "true" || blocked === true;
      const sortField = ["createdAt", "viewsCount", "shareCount"].includes(
        sortBy
      )
        ? sortBy
        : "createdAt";
      const sortOrder = order === "asc" ? 1 : -1;

      const cacheKey = useInfiniteScroll
        ? `infinitePosts:${limitNum}:${sanitizedTag || "all"}:${
            cursorValue || "start"
          }:${isBlocked}:${sortField}:${sortOrder}`
        : `publicPosts:${pageNum}:${limitNum}:${
            sanitizedTag || "all"
          }:${isBlocked}:${sortField}:${sortOrder}`;

      cache.del(cacheKey);
      console.log(`Cleared cache key on error: ${cacheKey}`);
    } catch (cacheError) {
      console.warn("Failed to clear cache on error:", cacheError.message);
    }

    // Specific error handling
    if (
      error.name === "MongoTimeoutError" ||
      error.message.includes("timeout")
    ) {
      return next(
        new AppError(
          "Database query timeout - please try again",
          504,
          "DatabaseTimeout"
        )
      );
    }

    if (error.name === "ValidationError") {
      return next(
        new AppError("Invalid query parameters", 400, "ValidationError")
      );
    }

    if (error.name === "MongoNetworkError") {
      return next(
        new AppError("Database connection failed", 503, "DatabaseConnection")
      );
    }

    if (error.name === "CastError") {
      return next(
        new AppError("Invalid data format in request", 400, "CastError")
      );
    }

    // Generic error handling
    next(
      error instanceof AppError
        ? error
        : new AppError(
            "Failed to fetch public posts",
            500,
            "GetPublicPostsError",
            {
              originalError: error.message,
              errorType: error.name || "UnknownError",
            }
          )
    );
  }
};

// Helper function to get cache statistics
export const getCacheStats = () => {
  const stats = cache.getStats();
  return {
    keys: cache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    memoryUsage: process.memoryUsage(),
  };
};

// Helper function to clear specific cache patterns
export const clearPostsCache = (pattern = "") => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(
    (key) => key.includes("publicPosts") || key.includes("infinitePosts")
  );

  if (pattern) {
    const filteredKeys = matchingKeys.filter((key) => key.includes(pattern));
    filteredKeys.forEach((key) => cache.del(key));
    return filteredKeys.length;
  } else {
    matchingKeys.forEach((key) => cache.del(key));
    return matchingKeys.length;
  }
};

// GET /public/post/:slug
export const getPublicPostBySlug = async (req, res, next) => {
  try {
    logMemory("Before getPublicPostBySlug start");
    const { slug } = req.params;
    const cacheKey = `publicPost:${slug.toLowerCase()}`;

    console.log(`Requesting post with slug: ${slug}`);
    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPost = cache.get(cacheKey);
    if (cachedPost) {
      logMemory(`Cache hit: ${cacheKey}`);
      console.log(`Returning cached post: ${cachedPost.title}`);
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
    console.log(`Cached post: ${post.title}`);

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POST",
        targetPost: post._id,
        message: `Viewed public post: ${post.title}`,
      });
      console.log(`Activity recorded for user: ${req.user._id}`);
    }

    logMemory("After getPublicPostBySlug complete");
    console.log("Returning response with post:", post.title);
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
    console.log(`Tracking view for slug: ${slug}`);

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
      console.log("Post not found for slug:", slug);
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    console.log(`Incremented views for post: ${post.title}`);
    logMemory("Before GuestVisitModel.create");
    await GuestVisitModel.create({
      slug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    console.log("Guest visit recorded for IP:", req.ip);

    logMemory("Before socket emit");
    io.to("adminRoom").emit("guestViewUpdate", {
      postId: post._id,
      slug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      location: req.headers["cf-ipcountry"] || null,
    });
    console.log("Emitted guestViewUpdate to adminRoom");

    logMemory("After trackGuestView complete");
    console.log("Returning success response for guest view");
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

    console.log(`Checking rate limit for IP: ${ip}`);
    if (now - limiterEntry.lastReset > GUEST_VISIT_WINDOW) {
      limiterEntry.count = 0;
      limiterEntry.lastReset = now;
    }

    if (limiterEntry.count >= GUEST_VISIT_LIMIT) {
      console.log(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        message: "Too many guest visits, please try again later",
      });
    }

    limiterEntry.count += 1;
    guestVisitLimiter.set(ip, limiterEntry);
    console.log(
      `Updated rate limit: ${limiterEntry.count} visits for IP: ${ip}`
    );

    if (req.user && req.user._id) {
      logMemory("Authenticated user detected");
      console.log(`Authenticated user detected: ${req.user._id}`);
      return res.status(200).json({
        success: false,
        message: "Authenticated user — guest tracking skipped",
      });
    }

    let guestId = req.cookies.guestId;
    const fingerprint = `${req.ip}-${req.headers["user-agent"]}`;

    logMemory("Before checking guestId");
    console.log(`Guest ID from cookie: ${guestId || "none"}`);
    if (!guestId) {
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

    logMemory("Before GuestModel.findOne");
    const existingGuest = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    })
      .maxTimeMS(10000)
      .lean();

    if (existingGuest && existingGuest.lastVisit > fifteenMinutesAgo) {
      logMemory("Recent visit detected");
      console.log(`Recent visit detected for guestId: ${guestId}`);
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

    console.log(
      `Updated guest: ${updatedGuest.guestId}, visitCount: ${updatedGuest.visitCount}`
    );
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
      console.log("Incremented guestUsersCount in analytics");
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
    console.log("Emitted guestVisitUpdate to adminRoom");

    logMemory("After trackGuestVisit complete");
    console.log("Returning response for guest visit");
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

    console.log(
      `Search params: query=${query}, page=${pageNum}, limit=${limitNum}`
    );
    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
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
    console.log(`Cached search results: ${processedPosts.length} posts`);

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "SEARCHED_PUBLIC_POSTS",
        message: `Searched public posts: ${query} (page: ${pageNum})`,
      });
      console.log(`Activity recorded for user: ${req.user._id}`);
    }

    logMemory("After searchPublicPosts complete");
    console.log(
      "Returning response with search results:",
      processedPosts.length
    );
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
