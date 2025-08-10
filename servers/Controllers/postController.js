import PostModel from "../../servers/Models/Post.js";
import GuestModel from "../../servers/Models/Guest.js";
import AnalyticsModel from "../../servers/Models/Analytics.js";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../../servers/Utils/uploadToCloudinary.js";
import sharp from "sharp";
import slugify from "slugify";
import axios from "axios";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import mongoose from "mongoose";
import { io } from "../../servers/sockets/socket.js";
import { calculateReadTime } from "../helpers/postHelper.js";
import pLimit from "p-limit";
import NodeCache from "node-cache";
import PostInteraction from "../../servers/Models/PostInteraction.js";
import { logMemory } from "../../servers/Utils/memoryLogger.js";

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

// Create Post
export const createPost = async (req, res, next) => {
  try {
    logMemory("📝 Start createPost");
    const {
      title,
      category,
      excerpt,
      tags: rawTags,
      blocks: rawBlocks = [],
      thumbnail: rawThumbnail,
      isFeatured = false,
      isPinned = false,
      language = "en",
      postType = "Blog",
    } = req.body;

    if (!req.user?._id) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "CreatePost"
      );
    }

    const tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
    if (!Array.isArray(tags)) {
      throw new AppError("Tags must be an array", 400, "CreatePost");
    }

    const blocks = Array.isArray(rawBlocks)
      ? rawBlocks
      : JSON.parse(rawBlocks || "[]");
    if (!Array.isArray(blocks)) {
      throw new AppError("Blocks must be an array", 400, "CreatePost");
    }

    logMemory("📦 After parsing input");

    const blocksWithIds = blocks.map((block, index) => {
      if (!block || typeof block !== "object" || !block.type) {
        throw new AppError(
          `Invalid block at index ${index}`,
          400,
          "CreatePost"
        );
      }
      return {
        id: block.id || uuidv4(),
        type: block.type,
        ...block,
        blocked: false,
      };
    });

    blocksWithIds.forEach((block, index) => {
      if (block.type === "table") {
        if (
          !block.data ||
          !Array.isArray(block.data) ||
          block.data.length === 0
        ) {
          throw new AppError(
            `Table block at index ${index} must have non-empty data`,
            400,
            "CreatePost"
          );
        }
        if (!block.data.every((row) => Array.isArray(row) && row.length > 0)) {
          throw new AppError(
            `Table block at index ${index} has invalid data format`,
            400,
            "CreatePost"
          );
        }
      }
    });

    const processImage = async (source, id, folder) => {
      try {
        let buffer;
        if (source.startsWith("data:image")) {
          const [, base64Data] =
            source.match(/^data:image\/[a-z]+;base64,(.+)$/) || [];
          if (!base64Data) {
            throw new AppError(
              "Invalid base64 image",
              400,
              "CreatePost",
              "Invalid image data"
            );
          }
          buffer = Buffer.from(base64Data, "base64");
        } else if (source.startsWith("http")) {
          const response = await axios.get(source, {
            responseType: "arraybuffer",
            timeout: 5000,
          });
          buffer = Buffer.from(response.data, "binary");
        } else {
          throw new AppError(
            "Unsupported image source",
            400,
            "CreatePost",
            "Invalid image source"
          );
        }

        const image = sharp(buffer);
        const metadata = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
          throw new AppError(
            "Unsupported image format",
            400,
            "CreatePost",
            "Invalid image format"
          );
        }

        if (metadata.width > 1200 || metadata.height > 1200) {
          image.resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        const compressedBuffer = await image
          .webp({ quality: 75, effort: 4 })
          .toBuffer();
        const result = await uploadToCloudinary({
          buffer: compressedBuffer,
          folder,
        });
        if (!result?.secure_url) {
          throw new AppError(
            "Image upload failed",
            500,
            "CreatePost",
            "Cloudinary upload failed"
          );
        }

        return result.secure_url;
      } catch (err) {
        throw new AppError(
          err.message || `Image processing failed: ${id}`,
          400,
          "CreatePost",
          "Error processing image"
        );
      }
    };

    const blockLimit = pLimit(3);
    const imageLimit = pLimit(2);

    const processBlock = async (block) => {
      const processedBlock = { ...block };
      if (block.type === "image" && block.src) {
        logMemory(`🖼️ Processing image block ${block.id}`);
        processedBlock.src = await imageLimit(() =>
          processImage(block.src, block.id, "blogs/post/images/")
        );
      }
      if (processedBlock.text) {
        processedBlock.text = processedBlock.text.replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ""
        );
      }
      if (processedBlock.caption) {
        processedBlock.caption = processedBlock.caption.replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ""
        );
      }
      if (block.type === "poll") {
        processedBlock.question =
          processedBlock.question?.trim() || "Default Question";
        processedBlock.options = Array.isArray(processedBlock.options)
          ? processedBlock.options
              .map((opt) => {
                const value =
                  typeof opt === "string"
                    ? opt
                    : typeof opt === "object" && typeof opt.option === "string"
                    ? opt.option
                    : "";
                const trimmed = value.trim();
                return trimmed &&
                  trimmed.length >= 2 &&
                  trimmed.toLowerCase() !== "option"
                  ? {
                      option: trimmed,
                      votes:
                        typeof opt === "object" && Number.isInteger(opt.votes)
                          ? opt.votes
                          : 0,
                    }
                  : null;
              })
              .filter(Boolean)
          : [];
        processedBlock.votedUserIds = Array.isArray(processedBlock.votedUserIds)
          ? processedBlock.votedUserIds
              .map((vote) =>
                mongoose.Types.ObjectId.isValid(vote.userId)
                  ? {
                      userId: new mongoose.Types.ObjectId(vote.userId),
                      votedAt: vote.votedAt || new Date(),
                    }
                  : null
              )
              .filter(Boolean)
          : [];
      }
      if (block.type === "table") {
        if (
          !processedBlock.data ||
          !Array.isArray(processedBlock.data) ||
          processedBlock.data.length === 0
        ) {
          throw new AppError(
            "Table block must have non-empty data",
            400,
            "ProcessBlock"
          );
        }
        if (
          !processedBlock.data.every(
            (row) => Array.isArray(row) && row.length > 0
          )
        ) {
          throw new AppError(
            "Table block has invalid data format",
            400,
            "ProcessBlock"
          );
        }
        processedBlock.data = processedBlock.data.map((row) =>
          row.map((cell) => (cell == null ? "" : String(cell)))
        );
      }
      return processedBlock;
    };

    logMemory("🖼️ Before processing blocks");
    const processedBlocks = await Promise.all(
      blocksWithIds.map((block) => blockLimit(() => processBlock(block)))
    );
    logMemory("🖼️ After processing blocks");

    const { readTime, readingTime } = calculateReadTime(processedBlocks);

    let processedThumbnail = rawThumbnail;
    if (rawThumbnail) {
      logMemory("🖼️ Before processing thumbnail");
      processedThumbnail = await imageLimit(() =>
        processImage(rawThumbnail, "thumbnail", "blogs/post/thumbnails/")
      );
      logMemory("🖼️ After processing thumbnail");
    }

    const moderateContent = async (text) => {
      return { isFlagged: false, categories: {} };
    };

    const blockTextContent = processedBlocks
      .flatMap((block) =>
        ["text", "value", "code", "caption", "question"]
          .map((f) => block[f])
          .filter(Boolean)
      )
      .join("\n");
    const fullText = `${title}\n${excerpt || ""}\n${blockTextContent}`;
    logMemory("🔍 Before content moderation");
    const moderation = await moderateContent(fullText);
    logMemory("🔍 After content moderation");
    if (moderation.isFlagged) {
      const reasons = Object.entries(moderation.categories)
        .filter(([_, flagged]) => flagged)
        .map(([key]) => key);
      throw new AppError(
        `Restricted content: ${reasons.join(", ")}`,
        400,
        "CreatePost"
      );
    }

    let slug = slugify(title, { lower: true, strict: true });
    let finalSlug = slug;
    let counter = 1;

    logMemory("🔎 Before slug check");
    while (await PostModel.exists({ slug: finalSlug }).lean()) {
      finalSlug = `${slug}-${counter++}`;
    }
    slug = finalSlug;
    logMemory("🔎 After slug check");

    const postData = {
      title,
      slug,
      category,
      tags,
      thumbnail: processedThumbnail,
      excerpt,
      blocks: processedBlocks,
      author: req.user._id,
      isFeatured,
      isPinned,
      isPublished: true,
      language,
      readTime,
      readingTime,
      postType,
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      logMemory("💾 Before DB insert");
      const [newPost] = await PostModel.create([postData], { session });
      await recordActivity(
        {
          userId: req.user._id,
          action: "POST_CREATED",
          targetPost: newPost._id,
          message: `Created post: ${title}`,
        },
        { session }
      );
      logMemory("💾 After DB insert");
      await session.commitTransaction();

      io.emit("postCreated", { ...newPost._doc, authorId: req.user._id });

      const cacheKey = `postCounts:${req.user._id}`;
      let counts = cache.get(cacheKey);
      if (!counts) {
        logMemory("📊 Before cache update");
        const [allPostsCount, myPostsCount, followingPostsCount] =
          await Promise.all([
            PostModel.countDocuments({
              blocked: { $ne: true },
              isPublished: true,
            }).lean(),
            PostModel.countDocuments({
              author: req.user._id,
              blocked: { $ne: true },
              isPublished: true,
            }).lean(),
            PostModel.countDocuments({
              author: { $in: req.user.following || [] },
              blocked: { $ne: true },
              isPublished: true,
            }).lean(),
          ]);
        counts = { allPostsCount, myPostsCount, followingPostsCount };
        cache.set(cacheKey, counts);
        logMemory("📊 After cache update");
      }

      setTimeout(() => {
        io.to(req.user._id).emit("postCountsUpdated", counts);
      }, 1000);

      logMemory("🎉 End createPost");
      res
        .status(201)
        .json({ success: true, message: "Post created", post: newPost });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to create post",
            500,
            "CreatePost"
          )
    );
  }
};

// Get all published + unblocked posts with pagination
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

// Get post ID by slug
export const getPostIdBySlug = async (req, res, next) => {
  try {
    logMemory("Before getPostIdBySlug start");
    const { slug } = req.params;
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetPostIdBySlug");
    }
    const sanitizedSlug = slug.trim().toLowerCase();
    const cacheKey = `postId:${sanitizedSlug}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPostId = cache.get(cacheKey);
    if (cachedPostId) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, postId: cachedPostId });
    }

    console.log("Querying slug:", sanitizedSlug);
    logMemory("Before PostModel.findOne");
    const post = await PostModel.findOne({
      slug: { $regex: `^${sanitizedSlug}$`, $options: "i" },
    })
      .maxTimeMS(10000)
      .select("_id")
      .lean();

    if (!post) {
      throw new AppError("Post not found", 404, "GetPostIdBySlug");
    }

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, post._id);

    logMemory("After getPostIdBySlug complete");
    res.status(200).json({ success: true, postId: post._id });
  } catch (error) {
    console.error("Error in getPostIdBySlug:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch post ID",
            500,
            "GetPostIdBySlug"
          )
    );
  }
};

// Count all published, non-blocked posts
export const countAllPosts = async (req, res, next) => {
  try {
    logMemory("Before countAllPosts start");
    const cacheKey = "countAllPosts";

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, count: cachedCount });
    }

    logMemory("Before PostModel.countDocuments");
    const count = await PostModel.countDocuments({
      blocked: { $ne: true },
      isPublished: true,
    })
      .maxTimeMS(5000)
      .lean();
    console.log("Total posts count:", count);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, count);

    logMemory("After countAllPosts complete");
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error in countAllPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch all posts count",
            500,
            "CountAllPosts"
          )
    );
  }
};

// Count authenticated user's posts
export const countMyPosts = async (req, res, next) => {
  try {
    logMemory("Before countMyPosts start");
    if (!req.user?._id) {
      throw new AppError("Invalid user in request", 400, "CountMyPosts");
    }
    const cacheKey = `countMyPosts:${req.user._id}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, count: cachedCount });
    }

    logMemory("Before PostModel.countDocuments");
    const count = await PostModel.countDocuments({
      author: req.user._id,
      blocked: { $ne: true },
      isPublished: true,
    })
      .maxTimeMS(5000)
      .lean();
    console.log("User posts count:", count);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, count);

    logMemory("After countMyPosts complete");
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error in countMyPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to fetch post count", 500, "CountMyPosts")
    );
  }
};

// Count posts from followed users
export const countFollowingPosts = async (req, res, next) => {
  try {
    logMemory("Before countFollowingPosts start");
    const cacheKey = `countFollowingPosts:${req.user?._id || "guest"}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, count: cachedCount });
    }

    logMemory("Before PostModel.countDocuments");
    const count = await PostModel.countDocuments({
      author: { $in: req.user.following || [] },
      blocked: { $ne: true },
      isPublished: true,
    })
      .maxTimeMS(5000)
      .lean();
    console.log("Following posts count:", count);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, count);

    logMemory("After countFollowingPosts complete");
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error in countFollowingPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch following posts count",
            500,
            "CountFollowingPosts"
          )
    );
  }
};

// Get single public post by slug
export const getPublicPost = async (req, res, next) => {
  try {
    logMemory("📄 Start getPublicPost");
    const { slug } = req.params;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetPublicPost");
    }

    const sanitizedSlug = slug.trim().toLowerCase();
    console.log("Querying slug:", sanitizedSlug);

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne({
      slug: { $regex: `^${sanitizedSlug}$`, $options: "i" },
      isPublished: true,
      blocked: false,
    })
      .select(
        "title slug category excerpt thumbnail author createdAt isPublished readTime readingTime tags language viewsCount shareCount postType"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPost"
      );
    }

    console.log("Post fetched:", post.title);
    logMemory("📄 End getPublicPost");
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Error in getPublicPost:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch public post",
            500,
            "GetPublicPost"
          )
    );
  }
};

// Track guest view
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

    logMemory("Before GuestModel.create");
    await GuestModel.create({
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

// Track guest visit
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

// Get all posts
export const getAllPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getAllPosts");
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;
    const authorId = req.query.authorId;
    const rawAuthorIds = req.query.authorIds || req.query.followingIds;
    const isGuest = req.query.isGuest === "true";

    const query = {
      blocked: { $ne: true },
      ...(isGuest || !req.user?._id ? { isPublished: true } : {}),
    };

    if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
      query.author = authorId;
    } else if (rawAuthorIds) {
      const authorIdArray = rawAuthorIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (authorIdArray.length) {
        query.author = { $in: authorIdArray };
      } else {
        throw new AppError("Invalid author IDs provided", 400, "GetAllPosts");
      }
    }

    console.log("Query:", JSON.stringify(query));
    logMemory("📖 Before fetching posts");
    const posts = await PostModel.find(query)
      .select(
        "title slug category excerpt thumbnail author createdAt isPublished isPinned isPremium isSubscriberOnly blocked message readTime likesCount commentsCount viewsCount bookmarksCount likes tags language isFeatured allowComments timeSpent updatedAt shareCount sharedBy blocks postType"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();
    logMemory("📖 After fetching posts");

    console.log("Posts fetched:", posts.length);
    const total = await PostModel.countDocuments(query).lean();
    console.log("Total posts:", total);

    const cacheKey = `postCounts:${req.user?._id || "guest"}`;
    let counts = cache.get(cacheKey);
    if (!counts) {
      logMemory("📊 Before cache update");
      const [allPostsCount, myPostsCount, followingPostsCount] =
        await Promise.all([
          PostModel.countDocuments({
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
          req.user?._id
            ? PostModel.countDocuments({
                author: req.user._id,
                blocked: { $ne: true },
                isPublished: true,
              }).lean()
            : Promise.resolve(0),
          req.user?._id
            ? PostModel.countDocuments({
                author: { $in: req.user.following || [] },
                blocked: { $ne: true },
                isPublished: true,
              }).lean()
            : Promise.resolve(0),
        ]);
      counts = { allPostsCount, myPostsCount, followingPostsCount };
      cache.set(cacheKey, counts);
      logMemory("📊 After cache update");
    }

    if (req.user?._id && !isGuest) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_POSTS",
        message: "Viewed all posts",
      });
      setTimeout(() => {
        io.to(req.user._id).emit("postCountsUpdated", counts);
      }, 1000);
    }

    logMemory("📋 End getAllPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    console.error("Error in getAllPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch posts",
            500,
            "GetAllPosts"
          )
    );
  }
};

// Get single post
export const getSinglePost = async (req, res, next) => {
  try {
    logMemory("📄 Start getSinglePost");
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetSinglePost");
    }

    const sanitizedSlug = slug.trim().toLowerCase();

    const query = {
      slug: sanitizedSlug,
      ...(userId
        ? {
            $or: [
              { isPublished: true, blocked: false },
              { author: userId },
              ...(userRole === "admin" ? [{}] : []),
            ],
          }
        : { isPublished: true, blocked: false }),
    };

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne(query)
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .populate("author", "name email avatar")
      .populate("category")
      .lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetSinglePost"
      );
    }

    if (
      post.blocked &&
      (!userId ||
        (post.author.toString() !== userId.toString() && userRole !== "admin"))
    ) {
      throw new AppError(
        "Post is not available (blocked)",
        403,
        "GetSinglePost"
      );
    }

    logMemory("📄 End getSinglePost");
    res.status(200).json({ success: true, post });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch post",
            500,
            "GetSinglePost"
          )
    );
  }
};

// Track time spent
export const trackTimeSpent = async (req, res, next) => {
  try {
    logMemory("⏱️ Start trackTimeSpent");
    const { postId } = req.params;
    const { duration } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid postId", 400, "trackTimeSpent");
    }

    if (typeof duration !== "number" || isNaN(duration) || duration < 0) {
      throw new AppError("Invalid duration", 400, "trackTimeSpent");
    }

    logMemory("💾 Before updating interaction");
    const [interactionUpdate, postUpdate] = await Promise.all([
      PostInteraction.findOneAndUpdate(
        { postId, userId },
        { $inc: { timeSpent: duration }, $set: { updatedAt: new Date() } },
        { upsert: true, new: false }
      ),
      PostModel.updateOne({ _id: postId }, { $inc: { timeSpent: duration } }),
    ]);
    logMemory("💾 After updating interaction");

    if (!postUpdate.modifiedCount && !interactionUpdate) {
      throw new AppError("Post not found", 404, "trackTimeSpent");
    }

    logMemory("⏱️ End trackTimeSpent");
    res.status(200).json({ success: true, message: "Time spent recorded" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to track time",
            500,
            "trackTimeSpent"
          )
    );
  }
};

// Process block
export const processBlock = async (block) => {
  logMemory(`🛠️ Start processBlock ${block.id || "unknown"}`);
  const processedBlock = { ...block };

  if (processedBlock.text) {
    processedBlock.text = processedBlock.text.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );
  }
  if (processedBlock.caption) {
    processedBlock.caption = processedBlock.caption.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );
  }

  if (block.type === "poll") {
    processedBlock.question =
      processedBlock.question?.trim() || "Default Question";
    processedBlock.options = Array.isArray(processedBlock.options)
      ? block.options
          .map((opt) => {
            const value =
              typeof opt === "string"
                ? opt
                : typeof opt === "object" && typeof opt.option === "string"
                ? opt.option
                : "";
            const trimmed = value.trim();
            return trimmed &&
              trimmed.length >= 2 &&
              trimmed.toLowerCase() !== "option"
              ? {
                  option: trimmed,
                  votes:
                    typeof opt === "object" && Number.isInteger(opt.votes)
                      ? opt.votes
                      : 0,
                }
              : null;
          })
          .filter(Boolean)
      : [];
    processedBlock.votedUserIds = Array.isArray(processedBlock.votedUserIds)
      ? processedBlock.votedUserIds
          .map((vote) =>
            mongoose.Types.ObjectId.isValid(vote.userId)
              ? {
                  userId: new mongoose.Types.ObjectId(vote.userId),
                  votedAt: vote.votedAt || new Date(),
                }
              : null
          )
          .filter(Boolean)
      : [];
  }

  if (block.type === "table") {
    if (
      !processedBlock.data ||
      !Array.isArray(processedBlock.data) ||
      processedBlock.data.length === 0
    ) {
      throw new AppError(
        "Table block must have non-empty data",
        400,
        "ProcessBlock"
      );
    }
    if (
      !processedBlock.data.every((row) => Array.isArray(row) && row.length > 0)
    ) {
      throw new AppError(
        "Table block has invalid data format",
        400,
        "ProcessBlock"
      );
    }
    processedBlock.data = processedBlock.data.map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell)))
    );
  }

  logMemory(`🛠️ End processBlock ${block.id || "unknown"}`);
  return processedBlock;
};

// Update post by slug
export const updatePostBySlug = async (req, res, next) => {
  try {
    logMemory("✏️ Start updatePostBySlug");
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!slug) {
      throw new AppError("Missing slug", 400, "UpdatePostBySlug");
    }

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "UpdatePostBySlug"
      );
    }

    const updates = { ...req.body };

    const blockLimit = pLimit(3);
    if (updates.blocks) {
      logMemory("🖼️ Before processing blocks");
      updates.blocks = await Promise.all(
        updates.blocks.map((block, i) =>
          blockLimit(async () => {
            if (!block || typeof block !== "object" || !block.type) {
              throw new AppError(
                `Invalid block at index ${i}`,
                400,
                "UpdatePostBySlug"
              );
            }

            const processedBlock = await processBlock({
              ...block,
              id: block.id || uuidv4(),
              blocked:
                typeof block.blocked === "boolean" ? block.blocked : false,
            });

            const allowedFields = [
              "id",
              "type",
              "value",
              "level",
              "text",
              "code",
              "caption",
              "src",
              "href",
              "url",
              "name",
              "size",
              "ordered",
              "author",
              "question",
              "options",
              "votedUserIds",
              "items",
              "data",
              "blocked",
            ];

            return Object.fromEntries(
              Object.entries(processedBlock).filter(([key]) =>
                allowedFields.includes(key)
              )
            );
          })
        )
      );
      logMemory("🖼️ After processing blocks");
    }

    const { readTime, readingTime } = calculateReadTime(updates.blocks || []);
    updates.readTime = readTime;
    updates.readingTime = readingTime;

    const query =
      userRole === "admin"
        ? { slug: { $regex: new RegExp(`^${slug}$`, "i") } }
        : { slug: { $regex: new RegExp(`^${slug}$`, "i") }, author: userId };

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne(query).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError(
        "Post not found or unauthorized",
        404,
        "UpdatePostBySlug"
      );
    }

    if (post.blocked) {
      throw new AppError("Post is blocked", 403, "UpdatePostBySlug");
    }

    logMemory("💾 Before updating post");
    const updatedPost = await PostModel.findOneAndUpdate(
      query,
      { ...updates, isPublished: true, lastEditedAt: new Date() },
      { new: true, runValidators: true }
    ).select(
      "title slug category excerpt thumbnail blocks author isPublished isPinned createdAt lastEditedAt postType"
    );
    logMemory("💾 After updating post");

    if (!updatedPost) {
      throw new AppError("Failed to update post", 500, "UpdatePostBySlug");
    }

    await recordActivity({
      userId,
      action: "POST_EDITED",
      targetPost: updatedPost._id,
      message: `Edited post: ${updatedPost.title}`,
    });

    logMemory("✏️ End updatePostBySlug");
    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to update post",
            500,
            "UpdatePostBySlug"
          )
    );
  }
};

// Delete post
export const deletePost = async (req, res, next) => {
  try {
    logMemory("🗑️ Start deletePost");
    const { postId } = req.params;
    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError("Post not found", 404, "DeletePost");
    }
    if (post.author.toString() !== req.user._id.toString()) {
      throw new AppError("Unauthorized to delete this post", 403, "DeletePost");
    }
    logMemory("💾 Before deleting post");
    await PostModel.deleteOne({ _id: postId });
    logMemory("💾 After deleting post");
    await recordActivity({
      userId: req.user._id,
      action: "POST_DELETED",
      targetPost: postId,
      message: `Deleted post: ${post.title}`,
    });

    io.emit("postDeleted", { postId, authorId: req.user._id });

    const cacheKey = `postCounts:${req.user._id}`;
    let counts = cache.get(cacheKey);
    if (!counts) {
      logMemory("📊 Before cache update");
      const [allPostsCount, myPostsCount, followingPostsCount] =
        await Promise.all([
          PostModel.countDocuments({
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
          PostModel.countDocuments({
            author: req.user._id,
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
          PostModel.countDocuments({
            author: { $in: req.user.following || [] },
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
        ]);
      counts = { allPostsCount, myPostsCount, followingPostsCount };
      cache.set(cacheKey, counts);
      logMemory("📊 After cache update");
    }

    setTimeout(() => {
      io.to(req.user._id).emit("postCountsUpdated", counts);
    }, 1000);

    logMemory("🗑️ End deletePost");
    res.status(200).json({ success: true, message: "Post deleted", postId });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to delete post",
            500,
            "DeletePost"
          )
    );
  }
};

// Toggle block post
export const toggleBlockPost = async (req, res, next) => {
  try {
    logMemory("🚫 Start toggleBlockPost");
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "ToggleBlockPost");
    }

    if (!req.user?._id || req.user.role !== "admin") {
      throw new AppError("Admin access required", 401, "ToggleBlockPost");
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError("Post not found", 404, "ToggleBlockPost");
    }

    logMemory("💾 Before updating post");
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { blocked: !post.blocked } },
      { new: true, runValidators: true }
    ).select("title slug blocked");
    logMemory("💾 After updating post");

    io.emit("postBlockToggled", {
      postId: post._id,
      blocked: updatedPost.blocked,
    });
    await recordActivity({
      userId: req.user._id,
      action: updatedPost.blocked ? "POST_BLOCKED" : "POST_UNBLOCKED",
      targetPost: postId,
      message: `${updatedPost.blocked ? "Blocked" : "Unblocked"} post: ${
        updatedPost.title
      }`,
    });

    logMemory("🚫 End toggleBlockPost");
    res.status(200).json({
      success: true,
      message: `Post ${
        updatedPost.blocked ? "blocked" : "unblocked"
      } successfully`,
      post: updatedPost,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleBlockPost")
    );
  }
};

// Send daily post email
export const sendDailyPostEmail = async () => {
  try {
    logMemory("📧 Start sendDailyPostEmail");
    logMemory("📖 Before fetching users");
    const users = await UserModel.find({
      emailStatus: "sent",
      stopEmailAttempts: false,
    })
      .select("name email")
      .lean();
    logMemory("📖 After fetching users");

    logMemory("📖 Before fetching posts");
    const cursor = PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .select("title slug excerpt postType")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .cursor();

    const posts = [];
    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    if (!posts.length) {
      logMemory("📧 End sendDailyPostEmail - No posts");
      return;
    }

    const postListHtml = posts
      .map(
        (post) => `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px;">
            <a href="https://yourwebsite.com/post/${post.slug}" style="color: #4F46E5; text-decoration: none;">${post.title}</a>
          </h3>
          <p style="font-size: 14px; color: #333333;">${post.excerpt}</p>
        </div>`
      )
      .join("");

    for (const user of users) {
      const mailOption = createMailOption({
        to: user.email,
        subject: "Your Daily Digest from Mount Amit",
        name: user.name || "User",
        email: user.email,
        message: `
          <p style="font-size: 14px; line-height: 150%;">
            Here are the latest posts from Mount Amit:
          </p>
          ${postListHtml}
          <p style="font-size: 14px; line-height: 150%;">
            Enjoy reading, and stay tuned for more updates!
          </p>`,
        supportEmail: process.env.SENDER_EMAIL,
        hasButton: true,
        buttonText: "Read More",
        buttonUrl: "https://yourwebsite.com",
      });

      emailQueue.push({ mailOption, userId: user._id });
    }

    logMemory("📧 Before processing email queue");
    await processEmailQueue();
    logMemory("📧 After processing email queue");

    logMemory("📧 End sendDailyPostEmail");
  } catch (error) {
    throw new AppError(
      "Failed to send daily post emails",
      500,
      "SendDailyPostEmail"
    );
  }
};

// Submit appeal
export const submitAppeal = async (req, res, next) => {
  try {
    logMemory("📜 Start submitAppeal");
    const { postId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "SubmitAppeal");
    }

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "SubmitAppeal"
      );
    }

    if (!message || !message.trim()) {
      throw new AppError("Appeal message is required", 400, "SubmitAppeal");
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError("Post not found", 404, "SubmitAppeal");
    }

    if (post.author.toString() !== userId.toString()) {
      throw new AppError(
        "Only the post author can appeal",
        403,
        "SubmitAppeal"
      );
    }

    if (!post.blocked) {
      throw new AppError("Post is not blocked", 400, "SubmitAppeal");
    }

    await recordActivity({
      userId,
      action: "POST_APPEAL_SUBMITTED",
      targetPost: postId,
      message: `Appeal submitted for post: ${post.title} - ${message}`,
    });

    io.emit("newAppeal", { postId, userId, message, postTitle: post.title });

    logMemory("📜 End submitAppeal");
    res
      .status(200)
      .json({ success: true, message: "Appeal submitted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to submit appeal",
            500,
            "SubmitAppeal"
          )
    );
  }
};

// Increment share count
export const incrementShareCount = async (req, res, next) => {
  try {
    logMemory("📈 Start incrementShareCount");
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "IncrementShareCount");
    }

    logMemory("💾 Before updating share count");
    const result = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true, select: "shareCount" }
    ).lean();
    logMemory("💾 After updating share count");

    if (!result) {
      throw new AppError("Post not found", 404, "IncrementShareCount");
    }

    logMemory("📈 End incrementShareCount");
    res.status(200).json({
      success: true,
      message: "Share count incremented",
      shareCount: result.shareCount,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to increment share count",
            500,
            "IncrementShareCount"
          )
    );
  }
};

// Get draft and pending posts
export const getDraftAndPendingPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getDraftAndPendingPosts");
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "GetDraftAndPendingPosts"
      );
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const query = { author: userId, blocked: { $ne: true } };

    logMemory("📖 Before fetching posts");
    const [posts, total] = await Promise.all([
      PostModel.find(query)
        .select(
          "title slug category excerpt thumbnail author createdAt isPublished postType"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar")
        .lean(),
      PostModel.countDocuments(query).lean(),
    ]);
    logMemory("📖 After fetching posts");

    if (!posts.length) {
      logMemory("📋 End getDraftAndPendingPosts - No posts");
      return res.status(200).json({
        success: true,
        message: "No posts found",
        total: 0,
        page,
        posts: [],
      });
    }

    logMemory("📋 End getDraftAndPendingPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch posts",
            500,
            "GetDraftAndPendingPosts"
          )
    );
  }
};

// Get following posts
export const getFollowingPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getFollowingPosts");
    const userId = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "GetFollowingPosts"
      );
    }

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).select("following").lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError("User not found", 404, "GetFollowingPosts");
    }

    const followingIds = user.following
      .map((id) => id.toString())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!followingIds.length) {
      logMemory("📋 End getFollowingPosts - No following");
      return res.status(200).json({
        success: true,
        total: 0,
        page,
        posts: [],
        message: "You are not following any users",
      });
    }

    const query = {
      author: { $in: followingIds },
      isPublished: true,
      blocked: false,
    };

    logMemory("📖 Before fetching posts");
    const posts = [];
    const cursor = PostModel.find(query)
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent readingTime updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .lean()
      .cursor();

    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    const total = await PostModel.countDocuments(query).lean();

    await recordActivity({
      userId,
      action: "VIEWED_FOLLOWING_POSTS",
      message: `Viewed posts from followed users`,
    });

    logMemory("📋 End getFollowingPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch following posts",
            500,
            "GetFollowingPosts"
          )
    );
  }
};

// Vote on poll
export const voteOnPoll = async (req, res, next) => {
  try {
    logMemory("🗳️ Start voteOnPoll");
    const { postId, blockId, optionIndex } = req.body;
    const userId = req.user?._id;

    validateObjectId(postId, "Post ID");
    if (!userId) {
      throw new AppError("You must be signed in to vote", 401, "VoteOnPoll");
    }
    if (!blockId || optionIndex == null) {
      throw new AppError(
        "Block ID and option index required",
        400,
        "VoteOnPoll"
      );
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne({
      _id: postId,
      isPublished: true,
      blocked: false,
    })
      .select("title blocks")
      .lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError("Post not found or unavailable", 404, "VoteOnPoll");
    }

    const pollBlockIndex = post.blocks.findIndex(
      (block) => block.id === blockId && block.type === "poll"
    );
    if (pollBlockIndex === -1) {
      throw new AppError("Poll block not found", 404, "VoteOnPoll");
    }

    const pollBlock = post.blocks[pollBlockIndex];
    if (
      pollBlock.votedUserIds.some(
        (vote) => vote.userId.toString() === userId.toString()
      )
    ) {
      throw new AppError("User already voted", 400, "VoteOnPoll");
    }

    pollBlock.options[optionIndex].votes =
      (pollBlock.options[optionIndex].votes || 0) + 1;
    pollBlock.votedUserIds.push({ userId, votedAt: new Date() });
    post.blocks[pollBlockIndex] = pollBlock;

    logMemory("💾 Before updating post");
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { blocks: post.blocks } },
      { new: true, select: "title slug blocks" }
    ).lean();
    logMemory("💾 After updating post");

    await recordActivity({
      userId,
      action: "POLL_VOTED",
      targetPost: postId,
      message: `Voted on poll in post: ${post.title}`,
    });

    logMemory("🗳️ End voteOnPoll");
    res.status(200).json({
      success: true,
      message: "Vote recorded",
      poll: updatedPost.blocks[pollBlockIndex],
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to record vote",
            500,
            "VoteOnPoll"
          )
    );
  }
};

// Increment view
export const incrementView = async (req, res, next) => {
  try {
    logMemory("👀 Start incrementView");
    const { slug } = req.params;
    const sanitizedSlug = slug.trim().toLowerCase();

    logMemory("Before PostModel.findOneAndUpdate");
    const post = await PostModel.findOneAndUpdate(
      { slug: sanitizedSlug, isPublished: true, blocked: false },
      { $inc: { viewsCount: 1 } },
      { new: true, select: "viewsCount" }
    ).lean();

    if (!post) {
      throw new AppError("Post not found", 404, "IncrementView");
    }

    logMemory("👀 End incrementView");
    res.status(200).json({
      success: true,
      message: "View count incremented",
      viewsCount: post.viewsCount,
    });
  } catch (error) {
    console.error("Error in incrementView:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to increment view count",
            500,
            "IncrementView"
          )
    );
  }
};
