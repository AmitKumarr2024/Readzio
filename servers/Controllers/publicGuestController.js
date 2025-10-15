import { v4 as uuidv4 } from "uuid";
import NodeCache from "node-cache";
import PostModel from "../../servers/Models/Post.js";
import GuestVisitModel from "../../servers/Models/GuestVisit.js";
import GuestModel from "../../servers/Models/GuestModel.js";
import AnalyticsModel from "../../servers/Models/AnalyticsModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { io } from "../../servers/sockets/socket.js";

const cache = new NodeCache({ stdTTL: 3600 });

// ------------------ Rate limiter ------------------
const guestVisitLimiter = new Map();
const GUEST_VISIT_LIMIT = 100;
const GUEST_VISIT_WINDOW = 60 * 1000; // 1 minute

// ===================================================
// GET /public/posts
// ===================================================
export const getPublicPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, tag } = req.query;
    const pageNum = parseInt(page);
    const limitNum = limit === "0" ? 0 : Math.min(parseInt(limit), 100);
    const cacheKey = `posts:${pageNum}:${limitNum}:${tag || "all"}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, ...cached });
    }

    const query = {
      isPublished: true,
      blocked: false,
      ...(tag && { tags: { $in: [tag] } }),
    };

    const postsQuery = PostModel.find(query)
      .sort({ createdAt: -1 })
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks postType isPremium"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (limitNum > 0) {
      postsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [posts, total] = await Promise.all([
      postsQuery.maxTimeMS(10000),
      limitNum > 0
        ? PostModel.countDocuments(query).maxTimeMS(5000)
        : Promise.resolve(0),
    ]);

    const result = {
      posts: posts.map((p) => ({
        ...p,
        blocks: Array.isArray(p.blocks) ? p.blocks : [],
      })),
      total: limitNum > 0 ? total : posts.length,
      page: pageNum,
    };

    cache.set(cacheKey, result);

    if (req.user?._id) {
      recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POSTS",
        message: `Viewed public posts`,
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(new AppError("Failed to fetch posts", 500, "GetPublicPosts"));
  }
};

// ===================================================
// GET /public/post/:slug
// ===================================================
export const getPublicPostBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const cacheKey = `post:${slug}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, post: cached });
    }

    const post = await PostModel.findOne({
      slug,
      isPublished: true,
      blocked: false,
    })
      .maxTimeMS(10000)
      .select(
        "title slug category excerpt thumbnail author createdAt readTime tags viewsCount shareCount blocks postType isPremium"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (!post) {
      throw new AppError("Post not found", 404, "GetPublicPostBySlug");
    }

    post.blocks = Array.isArray(post.blocks) ? post.blocks : [];
    cache.set(cacheKey, post);

    return res.status(200).json({ success: true, post });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to fetch post", 500)
    );
  }
};

// ===================================================
// POST /public/post/:slug/view
// ===================================================
export const trackGuestView = async (req, res, next) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();

    const post = await PostModel.findOneAndUpdate(
      { slug, isPublished: true, blocked: false },
      { $inc: { viewsCount: 1 } },
      { select: "_id title" }
    ).lean();

    if (!post) {
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    // Background logging
    GuestVisitModel.create({
      slug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    }).catch(() => {});

    // ✅ Emit socket event only to admin room
    io.to("adminRoom").emit("guestViewUpdate", {
      postId: post._id,
      slug,
      ip: req.ip,
      time: new Date(),
    });

    return res.status(200).json({ success: true, message: "View recorded" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track view", 500)
    );
  }
};

// ===================================================
// POST /public/guest/visit
// ===================================================
export const trackGuestVisit = async (req, res, next) => {
  try {
    const ip = req.ip;
    const now = Date.now();

    // ---------------- Rate limit ----------------
    const limiter = guestVisitLimiter.get(ip) || { count: 0, lastReset: now };
    if (now - limiter.lastReset > GUEST_VISIT_WINDOW) {
      limiter.count = 0;
      limiter.lastReset = now;
    }

    if (limiter.count >= GUEST_VISIT_LIMIT) {
      return res
        .status(429)
        .json({ success: false, message: "Too many requests" });
    }

    limiter.count += 1;
    guestVisitLimiter.set(ip, limiter);

    // ---------------- Skip logged-in users ----------------
    if (req.user?._id) {
      return res
        .status(200)
        .json({ success: false, message: "Authenticated user" });
    }

    // ---------------- Guest logic ----------------
    let guestId = req.cookies.guestId;
    const fingerprint = `${req.ip}-${req.headers["user-agent"]}`;

    if (!guestId) {
      guestId = uuidv4();
      res.cookie("guestId", guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);

    const existing = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    }).lean();

    if (existing?.lastVisit > fifteenMinutesAgo) {
      return res
        .status(200)
        .json({ success: true, message: "Visit already recorded" });
    }

    const isNew = !existing;
    const guest = await GuestModel.findOneAndUpdate(
      { $or: [{ guestId }, { fingerprint }] },
      {
        $setOnInsert: { firstVisit: new Date(), guestId, fingerprint },
        $set: {
          lastVisit: new Date(),
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
        $inc: { visitCount: 1 },
      },
      { upsert: true, new: true }
    ).lean();

    // Background analytics increment
    if (isNew) {
      AnalyticsModel.findOneAndUpdate(
        { _id: "guest-analytics" },
        { $inc: { "traffic.guestUsersCount": 1 } },
        { upsert: true }
      ).catch(() => {});
    }

    // ✅ Socket event: real-time guest visit to admin panel
    io.to("adminRoom").emit("guestVisitUpdate", {
      guestId: guest.guestId,
      visitCount: guest.visitCount,
      lastVisit: guest.lastVisit,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      time: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Visit tracked",
      guest: {
        guestId: guest.guestId,
        visitCount: guest.visitCount,
        lastVisit: guest.lastVisit,
      },
    });
  } catch (error) {
    next(new AppError("Failed to track visit", 500));
  }
};

// ===================================================
// GET /public/search-posts
// ===================================================
export const searchPublicPosts = async (req, res, next) => {
  try {
    const { query, page = 1, limit = 12 } = req.query;

    if (!query?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Query required" });
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const cacheKey = `search:${query.toLowerCase()}:${pageNum}:${limitNum}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, ...cached });
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

    const [posts, total] = await Promise.all([
      PostModel.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select(
          "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
        )
        .populate("author", "name avatar")
        .lean(),
      PostModel.countDocuments(searchQuery),
    ]);

    const result = {
      posts: posts.map((p) => ({
        ...p,
        blocks: Array.isArray(p.blocks) ? p.blocks : [],
      })),
      total,
      page: pageNum,
    };

    cache.set(cacheKey, result);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(new AppError("Search failed", 500));
  }
};
