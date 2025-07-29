import { v4 as uuidv4 } from "uuid";
import PostModel from "../Models/Post.js";
import { AppError } from "../Utils/AppError.js";
import GuestVisitModel from "../Models/GuestVisit.js";
import GuestModel from "../Models/GuestModel.js";
import AnalyticsModel from "../Models/AnalyticsModel.js";

// 🟢 Get all published + unblocked posts with optional tag filtering
export const getPublicPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tag } = req.query;
    const query = {
      isPublished: true,
      blocked: false,
      ...(tag ? { tags: { $in: [tag] } } : {}),
    };

    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .lean();

    // Ensure blocks is an array for each post
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    const total = await PostModel.countDocuments(query);

    // console.log(
    //   "[GetPublicPosts] Fetched posts:",
    //   processedPosts.length,
    //   "total:",
    //   total
    // );
    res.status(200).json({
      success: true,
      posts: processedPosts,
      total,
      page: parseInt(page),
    });
  } catch (error) {
    console.error("[GetPublicPosts] Error:", error);
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
    const { slug } = req.params;
    const sanitizedSlug = slug.trim().toLowerCase();

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
      console.error(
        "[GetPublicPostBySlug] Post not found for slug:",
        sanitizedSlug
      );
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPostBySlug"
      );
    }

    // Ensure blocks is an array
    post.blocks = Array.isArray(post.blocks) ? post.blocks : [];

    // console.log(
    //   "[GetPublicPostBySlug] Post fetched:",
    //   post._id,
    //   "slug:",
    //   post.slug,
    //   "blocks:",
    //   post.blocks.length
    // );

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("[GetPublicPostBySlug] Error:", error);
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
    const { slug } = req.params;
    const sanitizedSlug = slug.trim().toLowerCase();

    const post = await PostModel.findOneAndUpdate(
      { slug: sanitizedSlug, isPublished: true, blocked: false },
      { $inc: { viewsCount: 1 } },
      { select: "_id" }
    );

    if (!post) {
      console.error("[TrackGuestView] Post not found for slug:", sanitizedSlug);
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    await GuestVisitModel.create({
      slug: sanitizedSlug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // console.log(
    //   "[TrackGuestView] Guest view recorded for slug:",
    //   sanitizedSlug
    // );
    res.status(200).json({ success: true, message: "Guest view recorded" });
  } catch (error) {
    console.error("[TrackGuestView] Error:", error);
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
    // ✅ Step 1: Check if user is authenticated
    if (req.user && req.user._id) {
      return res.status(200).json({
        success: false,
        message: "Authenticated user — guest tracking skipped",
      });
    }

    // ✅ Step 2: Prepare guestId & fingerprint
    let guestId = req.cookies.guestId;
    const fingerprint = `${req.ip}-${req.headers["user-agent"]}`;

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

    // ✅ Step 3: Check existing guest
    const existingGuest = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    });

    if (existingGuest) {
      if (existingGuest.lastVisit > fifteenMinutesAgo) {
        return res.status(200).json({
          success: true,
          message: "Visit already recorded recently",
        });
      }
    }

    // ✅ Step 4: Upsert guest record
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
    );

    const isNewGuest = !existingGuest;

    if (isNewGuest) {
      await AnalyticsModel.findOneAndUpdate(
        { _id: "guest-analytics" },
        { $inc: { "traffic.guestUsersCount": 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // ✅ Step 5: Emit to admin dashboard
    if (req.io) {
      req.io.to("adminRoom").emit("guestVisitUpdate", {
        guestId: updatedGuest.guestId,
        visitCount: updatedGuest.visitCount,
        lastVisit: updatedGuest.lastVisit,
        ip: updatedGuest.ip,
        userAgent: updatedGuest.userAgent,
        location: req.headers["cf-ipcountry"] || null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Guest visit tracked",
    });
  } catch (error) {
    console.error("[trackGuestVisit] ❌ Error occurred:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track guest visit", 500, "TrackGuestVisit")
    );
  }
};
