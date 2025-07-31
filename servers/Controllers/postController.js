// File: src/servers/Controllers/postController.js
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

export const voteOnPoll = async (req, res, next) => {
  try {
    const { postId, blockId, optionIndex } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "VoteOnPoll");
    }
    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "VoteOnPoll"
      );
    }
    if (!blockId || optionIndex == null) {
      throw new AppError(
        "Block ID and option index required",
        400,
        "VoteOnPoll"
      );
    }

    const post = await PostModel.findOne({
      _id: postId,
      isPublished: true,
      blocked: false,
    });

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

    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { blocks: post.blocks } },
      { new: true, runValidators: true }
    ).select("title slug blocks");

    await recordActivity({
      userId,
      action: "POLL_VOTED",
      targetPost: postId,
      message: `Voted on poll in post: ${post.title}`,
    });

    res.status(200).json({
      success: true,
      message: "Vote recorded",
      poll: updatedPost.blocks[pollBlockIndex],
    });
  } catch (error) {
    console.error("[VoteOnPoll] Error:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to record vote", 500, "VoteOnPoll")
    );
  }
};

export const createPost = async (req, res, next) => {
  try {
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
    } = req.body;

    if (!req.user?._id)
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "CreatePost"
      );

    const tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
    if (!Array.isArray(tags))
      throw new AppError("Tags must be an array", 400, "CreatePost");

    const blocks = Array.isArray(rawBlocks)
      ? rawBlocks
      : JSON.parse(rawBlocks || "[]");
    if (!Array.isArray(blocks))
      throw new AppError("Blocks must be an array", 400, "CreatePost");

    const blocksWithIds = blocks.map((block, index) => {
      if (!block || typeof block !== "object" || !block.type) {
        throw new AppError(
          `Invalid block at index ${index}`,
          400,
          "CreatePost"
        );
      }
      if (block.type === "table") {
        if (
          !Array.isArray(block.data) ||
          block.data.length === 0 ||
          !block.data.every((row) => Array.isArray(row) && row.length > 0)
        ) {
          throw new AppError(
            `Table block at index ${index} must have non-empty data array`,
            400,
            "CreatePost"
          );
        }
      }
      return {
        id: block.id || uuidv4(),
        type: block.type,
        ...block,
        blocked: false,
      };
    });

    const processImage = async (source, id, folder) => {
      try {
        let buffer;
        if (source.startsWith("data:image")) {
          const [, base64Data] =
            source.match(/^data:image\/[a-z]+;base64,(.+)$/) || [];
          if (!base64Data)
            throw new AppError(
              "Invalid base64 image",
              400,
              "CreatePost",
              "Invalid image data"
            );
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
        if (!["jpeg", "png", "webp"].includes(metadata.format))
          throw new AppError(
            "Unsupported image format",
            400,
            "CreatePost",
            "Invalid image format"
          );

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
        if (!result?.secure_url)
          throw new AppError(
            "Image upload failed",
            500,
            "CreatePost",
            "Cloudinary upload failed"
          );

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

    const processedBlocks = await Promise.all(
      blocksWithIds.map(async (block) => {
        const processed = await processBlock(block);
        return processed;
      })
    );

    const { readTime, readingTime } = calculateReadTime(processedBlocks);

    let processedThumbnail = rawThumbnail;
    if (rawThumbnail) {
      processedThumbnail = await processImage(
        rawThumbnail,
        "thumbnail",
        "blogs/post/thumbnails/"
      );
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
    const moderation = await moderateContent(fullText);
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

    while (await PostModel.exists({ slug: finalSlug })) {
      finalSlug = `${slug}-${counter++}`;
    }

    slug = finalSlug;
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
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
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
      await session.commitTransaction();

      io.emit("postCreated", { ...newPost._doc, authorId: req.user._id });

      const [allPostsCount, myPostsCount, followingPostsCount] =
        await Promise.all([
          PostModel.countDocuments({
            blocked: { $ne: true },
            isPublished: true,
          }),
          PostModel.countDocuments({
            author: req.user._id,
            blocked: { $ne: true },
            isPublished: true,
          }),
          PostModel.countDocuments({
            author: { $in: req.user.following || [] },
            blocked: { $ne: true },
            isPublished: true,
          }),
        ]);
      io.to(req.user._id).emit("postCountsUpdated", {
        allPostsCount,
        myPostsCount,
        followingPostsCount,
      });

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

    const [posts, total, allPostsCount, myPostsCount, followingPostsCount] =
      await Promise.all([
        PostModel.find(query)
          .select(
            `
          title slug category excerpt thumbnail author createdAt
          isPublished isPinned isPremium isSubscriberOnly blocked message readTime
          likesCount commentsCount viewsCount bookmarksCount likes
          tags language isFeatured allowComments timeSpent updatedAt
          shareCount sharedBy blocks
        `
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("author", "name avatar")
          .populate("category", "name slug")
          .lean(),
        PostModel.countDocuments(query),
        PostModel.countDocuments({ blocked: { $ne: true }, isPublished: true }),
        req.user?._id
          ? PostModel.countDocuments({
              author: req.user._id,
              blocked: { $ne: true },
              isPublished: true,
            })
          : Promise.resolve(0),
        req.user?._id
          ? PostModel.countDocuments({
              author: { $in: req.user.following || [] },
              blocked: { $ne: true },
              isPublished: true,
            })
          : Promise.resolve(0),
      ]);

    if (req.user?._id && !isGuest) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_POSTS",
        message: "Viewed all posts",
      });
      io.to(req.user._id).emit("postCountsUpdated", {
        allPostsCount,
        myPostsCount,
        followingPostsCount,
      });
    }

    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    console.error("[getAllPosts] Error:", error);
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

export const getSinglePost = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      console.error("[GetSinglePost] Invalid slug:", slug);
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

    const post = await PostModel.findOne(query)
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished isPinned isPremium isSubscriberOnly blocked message readTime
        likesCount commentsCount viewsCount bookmarksCount likes
        tags language isFeatured allowComments timeSpent updatedAt
        shareCount sharedBy blocks
      `
      )
      .populate("author", "name email avatar")
      .populate("category")
      .lean();

    if (!post) {
      console.error(
        "[GetSinglePost] Post not found for slug:",
        sanitizedSlug,
        "with query:",
        JSON.stringify(query)
      );
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
      console.error("[GetSinglePost] Blocked post access denied:", post._id);
      throw new AppError(
        "Post is not available (blocked)",
        403,
        "GetSinglePost"
      );
    }

    if (userId) {
      await recordActivity({
        userId,
        action: "VIEWED_POST",
        targetPost: post._id,
        message: `Viewed post: ${post.title}`,
      });
    }

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("[GetSinglePost] Error:", error.message, error.stack);
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
    const { postId } = req.params;
    const { duration } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid postId", 400, "trackTimeSpent");
    }

    if (typeof duration !== "number" || isNaN(duration) || duration < 0) {
      throw new AppError("Invalid duration", 400, "trackTimeSpent");
    }

    const [interactionUpdate, postUpdate] = await Promise.all([
      PostInteraction.findOneAndUpdate(
        { postId, userId },
        { $inc: { timeSpent: duration }, $set: { updatedAt: new Date() } },
        { upsert: true, new: false }
      ),
      PostModel.updateOne({ _id: postId }, { $inc: { timeSpent: duration } }),
    ]);

    if (!postUpdate.modifiedCount && !interactionUpdate) {
      throw new AppError("Post not found", 404, "trackTimeSpent");
    }

    res.status(200).json({ success: true, message: "Time spent recorded" });
  } catch (error) {
    console.error("[trackTimeSpent] Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track time", 500, "trackTimeSpent")
    );
  }
};

export const processBlock = async (block) => {
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

  if (block.type === "table") {
    if (
      !Array.isArray(block.data) ||
      block.data.length === 0 ||
      !block.data.every((row) => Array.isArray(row) && row.length > 0)
    ) {
      throw new AppError(
        "Table block must have non-empty data array",
        400,
        "ProcessBlock"
      );
    }
  }

  if (block.type === "poll") {
    processedBlock.question = processedBlock.question || "Default Question";
    processedBlock.options = Array.isArray(processedBlock.options)
      ? processedBlock.options.map((opt) => ({
          option: typeof opt === "string" ? opt : `Option ${opt.option || ""}`,
          votes: Number.isInteger(opt.votes) ? opt.votes : 0,
        }))
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
          .filter((vote) => vote !== null)
      : [];
  }

  return processedBlock;
};

export const updatePostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    console.log(
      `[updatePostBySlug] Attempting to update post with slug: ${slug}, userId: ${userId}, role: ${userRole}`
    );

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

    if (updates.blocks) {
      updates.blocks = await Promise.all(
        updates.blocks.map(async (block, i) => {
          if (!block || typeof block !== "object" || !block.type) {
            throw new AppError(
              `Invalid block at index ${i}`,
              400,
              "UpdatePostBySlug"
            );
          }
          if (block.type === "table") {
            if (
              !Array.isArray(block.data) ||
              block.data.length === 0 ||
              !block.data.every((row) => Array.isArray(row) && row.length > 0)
            ) {
              throw new AppError(
                `Table block at index ${i} must have non-empty data array`,
                400,
                "UpdatePostBySlug"
              );
            }
          }
          const processedBlock = await processBlock({
            ...block,
            id: block.id || uuidv4(),
            blocked: typeof block.blocked === "boolean" ? block.blocked : false,
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
      );
    }

    const { readTime, readingTime } = calculateReadTime(updates.blocks);
    updates.readTime = readTime;
    updates.readingTime = readingTime;

    const query =
      userRole === "admin"
        ? { slug: { $regex: new RegExp(`^${slug}$`, "i") } }
        : { slug: { $regex: new RegExp(`^${slug}$`, "i") }, author: userId };

    const post = await PostModel.findOne(query).lean();
    if (!post) {
      console.error(
        `[updatePostBySlug] Post not found for slug: ${slug}, userId: ${userId}, query:`,
        query
      );
      throw new AppError(
        "Post not found or unauthorized",
        404,
        "UpdatePostBySlug"
      );
    }

    if (post.blocked) {
      console.error(`[updatePostBySlug] Post is blocked: ${slug}`);
      throw new AppError("Post is blocked", 403, "UpdatePostBySlug");
    }

    const updatedPost = await PostModel.findOneAndUpdate(
      query,
      { ...updates, isPublished: true, lastEditedAt: new Date() },
      { new: true, runValidators: true }
    ).select(
      "title slug category excerpt thumbnail blocks author isPublished isPinned createdAt lastEditedAt"
    );

    if (!updatedPost) {
      console.error(
        `[updatePostBySlug] Failed to update post for slug: ${slug}`
      );
      throw new AppError("Failed to update post", 500, "UpdatePostBySlug");
    }

    await recordActivity({
      userId,
      action: "POST_EDITED",
      targetPost: updatedPost._id,
      message: `Edited post: ${updatedPost.title}`,
    });

    console.log(`[updatePostBySlug] Successfully updated post: ${slug}`);
    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("[UpdatePostBySlug Error]:", error);
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

export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await PostModel.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "DeletePost");
    if (post.author.toString() !== req.user._id.toString()) {
      throw new AppError("Unauthorized to delete this post", 403, "DeletePost");
    }
    await PostModel.deleteOne({ _id: postId });
    await recordActivity({
      userId: req.user._id,
      action: "POST_DELETED",
      targetPost: postId,
      message: `Deleted post: ${post.title}`,
    });

    io.emit("postDeleted", { postId, authorId: req.user._id });

    const [allPostsCount, myPostsCount, followingPostsCount] =
      await Promise.all([
        PostModel.countDocuments({ blocked: { $ne: true }, isPublished: true }),
        PostModel.countDocuments({
          author: req.user._id,
          blocked: { $ne: true },
          isPublished: true,
        }),
        PostModel.countDocuments({
          author: { $in: req.user.following || [] },
          blocked: { $ne: true },
          isPublished: true,
        }),
      ]);
    io.to(req.user._id).emit("postCountsUpdated", {
      allPostsCount,
      myPostsCount,
      followingPostsCount,
    });

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

export const toggleBlockPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "ToggleBlockPost Controller");
    }

    if (!req.user?._id || req.user.role !== "admin") {
      throw new AppError(
        "Admin You must be signed in to access this feature.",
        401,
        "ToggleBlockPost Controller"
      );
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404, "ToggleBlockPost Controller");
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { blocked: !post.blocked } },
      { new: true, runValidators: true }
    );

    io.emit("postBlockToggled", { postId: post._id, blocked: post.blocked });
    await recordActivity({
      userId: req.user._id,
      action: updatedPost.blocked ? "POST_BLOCKED" : "POST_UNBLOCKED",
      targetPost: postId,
      message: `${updatedPost.blocked ? "Blocked" : "Unblocked"} post: ${
        updatedPost.title
      }`,
    });

    res.status(200).json({
      success: true,
      message: `Post ${
        updatedPost.blocked ? "blocked" : "unblocked"
      } successfully`,
      post: updatedPost,
    });
  } catch (error) {
    console.error("[ERROR] ToggleBlockPost Controller:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleBlockPost Controller")
    );
  }
};

export const submitAppeal = async (req, res, next) => {
  try {
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

    const post = await PostModel.findById(postId);
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

    res
      .status(200)
      .json({ success: true, message: "Appeal submitted successfully" });
  } catch (error) {
    console.error("[SubmitAppeal] Error:", error);
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

export const incrementShareCount = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "IncrementShareCount");
    }

    const result = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true, select: "shareCount" }
    );

    if (!result) {
      throw new AppError("Post not found", 404, "IncrementShareCount");
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Share count incremented",
        shareCount: result.shareCount,
      });
  } catch (error) {
    console.error("[incrementShareCount] Error:", error);
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

export const getPublicPost = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetPublicPost");
    }

    const sanitizedSlug = slug.trim().toLowerCase();

    const post = await PostModel.findOne({
      slug: sanitizedSlug,
      isPublished: true,
      blocked: false,
    })
      .select(
        "title slug category excerpt thumbnail author createdAt isPublished readTime readingTime tags language viewsCount shareCount"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (!post) {
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPost"
      );
    }

    res.status(200).json({ success: true, post });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to fetch public post", 500, "GetPublicPost")
    );
  }
};

export const getFollowingPosts = async (req, res, next) => {
  try {
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

    const user = await UserModel.findById(userId).select("following").lean();
    if (!user) {
      throw new AppError("User not found", 404, "GetFollowingPosts");
    }

    const followingIds = user.following
      .map((id) => id.toString())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!followingIds.length) {
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

    const [posts, total] = await Promise.all([
      PostModel.find(query)
        .select(
          `
          title slug category excerpt thumbnail author createdAt
          isPublished isPinned isPremium isSubscriberOnly blocked message readTime
          likesCount commentsCount viewsCount bookmarksCount likes
          tags language isFeatured allowComments timeSpent readingTime updatedAt
          shareCount sharedBy blocks
        `
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar")
        .lean(),
      PostModel.countDocuments(query),
    ]);

    await recordActivity({
      userId,
      action: "VIEWED_FOLLOWING_POSTS",
      message: `Viewed posts from followed users`,
    });

    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    console.error("[GetFollowingPosts] Error:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            "Failed to fetch following posts",
            500,
            "GetFollowingPosts"
          )
    );
  }
};
