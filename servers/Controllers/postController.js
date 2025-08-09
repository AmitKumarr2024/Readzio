import PostModel from "../../servers/Models/Post.js";
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
import UserModel from "../../servers/Models/User.js";
import { logMemory } from "../../servers/Utils/memoryLogger.js";

const cache = new NodeCache({ stdTTL: 600 });

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
        return res
          .status(200)
          .json({ success: true, total: 0, page, posts: [] });
      }
    }

    logMemory("📖 Before fetching posts");
    const posts = [];
    const cursor = PostModel.find(query)
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean()
      .cursor();

    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    const total = await PostModel.countDocuments(query).lean();

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
    const imageLimit = pLimit(2);

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
              "UpdatePostBySlug",
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
            "UpdatePostBySlug",
            "Invalid image source"
          );
        }

        const image = sharp(buffer);
        const metadata = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
          throw new AppError(
            "Unsupported image format",
            400,
            "UpdatePostBySlug",
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
            "UpdatePostBySlug",
            "Cloudinary upload failed"
          );
        }

        return result.secure_url;
      } catch (err) {
        throw new AppError(
          err.message || `Image processing failed: ${id}`,
          400,
          "UpdatePostBySlug",
          "Error processing image"
        );
      }
    };

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
            const processedBlock = await processBlock({ ...block });
            if (block.type === "image" && block.src) {
              processedBlock.src = await imageLimit(() =>
                processImage(block.src, block.id, "blogs/post/images/")
              );
            }
            return processedBlock;
          })
        )
      );
      logMemory("🖼️ After processing blocks");
    }

    if (updates.thumbnail) {
      logMemory("🖼️ Before processing thumbnail");
      updates.thumbnail = await imageLimit(() =>
        processImage(updates.thumbnail, "thumbnail", "blogs/post/thumbnails/")
      );
      logMemory("🖼️ After processing thumbnail");
    }

    if (updates.title) {
      let newSlug = slugify(updates.title, { lower: true, strict: true });
      let finalSlug = newSlug;
      let counter = 1;
      logMemory("🔎 Before slug check");
      while (
        await PostModel.exists({
          slug: finalSlug,
          _id: { $ne: (await PostModel.findOne({ slug }).select("_id"))._id },
        }).lean()
      ) {
        finalSlug = `${newSlug}-${counter++}`;
      }
      updates.slug = finalSlug;
      logMemory("🔎 After slug check");
    }

    if (updates.blocks) {
      const blockTextContent = updates.blocks
        .flatMap((block) =>
          ["text", "value", "code", "caption", "question"]
            .map((f) => block[f])
            .filter(Boolean)
        )
        .join("\n");
      const fullText = `${updates.title || ""}\n${
        updates.excerpt || ""
      }\n${blockTextContent}`;
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
          "UpdatePostBySlug"
        );
      }

      const { readTime, readingTime } = calculateReadTime(updates.blocks);
      updates.readTime = readTime;
      updates.readingTime = readingTime;
    }

    const query = userRole === "admin" ? { slug } : { slug, author: userId };

    logMemory("💾 Before updating post");
    const updatedPost = await PostModel.findOneAndUpdate(
      query,
      { $set: updates },
      {
        new: true,
        select: `
          title slug category excerpt thumbnail author createdAt
          isPublished isPinned isPremium isSubscriberOnly blocked message readTime
          likesCount commentsCount viewsCount bookmarksCount likes
          tags language isFeatured allowComments timeSpent readingTime updatedAt
          shareCount sharedBy blocks postType
        `,
      }
    )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();
    logMemory("💾 After updating post");

    if (!updatedPost) {
      throw new AppError(
        "Post not found or you don't have permission to update it",
        404,
        "UpdatePostBySlug"
      );
    }

    await recordActivity({
      userId,
      action: "POST_UPDATED",
      targetPost: updatedPost._id,
      message: `Updated post: ${updatedPost.title}`,
    });

    io.emit("postUpdated", { ...updatedPost, authorId: userId });

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

export const getPublicPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getPublicPosts");
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;
    const tag = req.query.tag;

    const query = {
      blocked: { $ne: true },
      isPublished: true,
      ...(tag && { tags: tag }),
    };

    logMemory("📖 Before fetching posts");
    const posts = [];
    const cursor = PostModel.find(query)
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean()
      .cursor();

    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    const total = await PostModel.countDocuments(query).lean();

    logMemory("📋 End getPublicPosts");
    res.status(200).json({ success: true, total, page, posts });
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

export const deletePost = async (req, res, next) => {
  try {
    logMemory("🗑️ Start deletePost");
    const { postId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    validateObjectId(postId, "Post ID");

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "DeletePost"
      );
    }

    const query =
      userRole === "admin" ? { _id: postId } : { _id: postId, author: userId };

    logMemory("💾 Before deleting post");
    const post = await PostModel.findOneAndDelete(query).lean();
    logMemory("💾 After deleting post");

    if (!post) {
      throw new AppError(
        "Post not found or you don't have permission to delete it",
        404,
        "DeletePost"
      );
    }

    await recordActivity({
      userId,
      action: "POST_DELETED",
      targetPost: postId,
      message: `Deleted post: ${post.title}`,
    });

    io.emit("postDeleted", { postId, authorId: userId });

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
    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
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

export const getLatestPosts = async (req, res, next) => {
  try {
    logMemory("📅 Start getLatestPosts");
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    logMemory("📖 Before fetching posts");
    const posts = [];
    const cursor = PostModel.find({
      blocked: { $ne: true },
      isPublished: true,
    })
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean()
      .cursor();

    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    const total = await PostModel.countDocuments({
      blocked: { $ne: true },
      isPublished: true,
    }).lean();

    logMemory("📅 End getLatestPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch latest posts",
            500,
            "GetLatestPosts"
          )
    );
  }
};

export const getTrendingPosts = async (req, res, next) => {
  try {
    logMemory("🔥 Start getTrendingPosts");
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    logMemory("📖 Before fetching posts");
    const posts = [];
    const cursor = PostModel.find({
      blocked: { $ne: true },
      isPublished: true,
    })
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .sort({ viewsCount: -1, likesCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean()
      .cursor();

    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    const total = await PostModel.countDocuments({
      blocked: { $ne: true },
      isPublished: true,
    }).lean();

    logMemory("🔥 End getTrendingPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch trending posts",
            500,
            "GetTrendingPosts"
          )
    );
  }
};

export const searchPosts = async (req, res, next) => {
  try {
    logMemory("🔍 Start searchPosts");
    const { query, authorId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    if (!query || typeof query !== "string" || query.trim() === "") {
      throw new AppError("Search query is required", 400, "SearchPosts");
    }

    const searchQuery = {
      $text: { $search: query.trim() },
      blocked: { $ne: true },
      isPublished: true,
      ...(authorId && mongoose.Types.ObjectId.isValid(authorId)
        ? { author: authorId }
        : {}),
    };

    logMemory("📖 Before fetching posts");
    const posts = [];
    const cursor = PostModel.find(searchQuery)
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks postType
        `
      )
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean()
      .cursor();

    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    const total = await PostModel.countDocuments(searchQuery).lean();

    logMemory("🔍 End searchPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to search posts",
            500,
            "SearchPosts"
          )
    );
  }
};

export const sendAdminAppeal = async (req, res, next) => {
  try {
    logMemory("📩 Start sendAdminAppeal");
    const { postId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    validateObjectId(postId, "Post ID");

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "SendAdminAppeal"
      );
    }

    if (!message || typeof message !== "string" || message.trim() === "") {
      throw new AppError("Appeal message is required", 400, "SendAdminAppeal");
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne({
      _id: postId,
      author: userId,
      blocked: true,
    }).lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError(
        "Post not found or you don't have permission to appeal",
        404,
        "SendAdminAppeal"
      );
    }

    await recordActivity({
      userId,
      action: "APPEAL_SUBMITTED",
      targetPost: postId,
      message: `Submitted appeal for post: ${post.title}`,
      metadata: { appealMessage: message.trim() },
    });

    logMemory("📩 End sendAdminAppeal");
    res
      .status(200)
      .json({ success: true, message: "Appeal sent successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to send appeal",
            500,
            "SendAdminAppeal"
          )
    );
  }
};

export const incrementShareCount = async (req, res, next) => {
  try {
    logMemory("📤 Start incrementShareCount");
    const { postId } = req.params;
    const userId = req.user?._id;

    validateObjectId(postId, "Post ID");

    if (!userId) {
      throw new AppError(
        "You must be signed in to share a post",
        401,
        "IncrementShareCount"
      );
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne({
      _id: postId,
      isPublished: true,
      blocked: false,
    }).lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError(
        "Post not found or unavailable",
        404,
        "IncrementShareCount"
      );
    }

    logMemory("💾 Before updating share count");
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      {
        $inc: { shareCount: 1 },
        $addToSet: { sharedBy: userId },
      },
      { new: true, select: "title slug shareCount sharedBy" }
    ).lean();
    logMemory("💾 After updating share count");

    if (!updatedPost) {
      throw new AppError(
        "Failed to update share count",
        500,
        "IncrementShareCount"
      );
    }

    await recordActivity({
      userId,
      action: "POST_SHARED",
      targetPost: postId,
      message: `Shared post: ${post.title}`,
    });

    io.emit("postShared", {
      postId,
      shareCount: updatedPost.shareCount,
      userId,
    });

    logMemory("📤 End incrementShareCount");
    res.status(200).json({
      success: true,
      message: "Share count incremented",
      shareCount: updatedPost.shareCount,
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

export const toggleBlockPost = async (req, res, next) => {
  try {
    logMemory("🔒 Start toggleBlockPost");
    const { postId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    validateObjectId(postId, "Post ID");

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "ToggleBlockPost"
      );
    }

    if (userRole !== "admin") {
      throw new AppError(
        "Only admins can toggle block status",
        403,
        "ToggleBlockPost"
      );
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
      { new: true, select: "title slug blocked" }
    ).lean();
    logMemory("💾 After updating post");

    await recordActivity({
      userId,
      action: post.blocked ? "POST_UNBLOCKED" : "POST_BLOCKED",
      targetPost: postId,
      message: `${post.blocked ? "Unblocked" : "Blocked"} post: ${post.title}`,
    });

    io.emit("postBlockToggled", {
      postId,
      blocked: updatedPost.blocked,
      userId,
    });

    logMemory("🔒 End toggleBlockPost");
    res.status(200).json({
      success: true,
      message: `Post ${
        updatedPost.blocked ? "blocked" : "unblocked"
      } successfully`,
      blocked: updatedPost.blocked,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to toggle block status",
            500,
            "ToggleBlockPost"
          )
    );
  }
};
