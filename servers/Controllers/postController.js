import PostModel from "../../servers/Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../../servers/Utils/uploadToCloudinary.js";
import sharp from "sharp";
import slugify from "slugify";
import axios from "axios";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import mongoose from "mongoose";
import { checkIfSubscribed } from "../Utils/checkIfSubscribed.js";
import PostInteraction from "../../servers/Models/PostInteraction.js";
import UserModel from "../../servers/Models/User.js";
import { io } from "../../servers/sockets/socket.js";
import { calculateReadTime } from "../helpers/postHelper.js";

export const voteOnPoll = async (req, res, next) => {
  // console.log("[voteOnPoll] Starting with:", {
  //   body: req.body,
  //   userId: req.user?._id,
  // });
  try {
    const { postId, blockId, optionIndex } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error("[voteOnPoll] Invalid post ID:", postId);
      throw new AppError("Invalid post ID", 400, "VoteOnPoll");
    }
    if (!userId) {
      console.error("[voteOnPoll] User not authenticated");
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "VoteOnPoll"
      );
    }
    if (!blockId || optionIndex == null) {
      console.error("[voteOnPoll] Missing blockId or optionIndex");
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
      console.error("[voteOnPoll] Post not found or unavailable:", postId);
      throw new AppError("Post not found or unavailable", 404, "VoteOnPoll");
    }

    const pollBlockIndex = post.blocks.findIndex(
      (block) => block.id === blockId && block.type === "poll"
    );
    if (pollBlockIndex === -1) {
      console.error("[voteOnPoll] Poll block not found:", blockId);
      throw new AppError("Poll block not found", 404, "VoteOnPoll");
    }

    const pollBlock = post.blocks[pollBlockIndex];
    if (
      pollBlock.votedUserIds.some(
        (vote) => vote.userId.toString() === userId.toString()
      )
    ) {
      console.error("[voteOnPoll] User already voted:", userId);
      throw new AppError("User already voted", 400, "VoteOnPoll");
    }

    pollBlock.options[optionIndex].votes =
      (pollBlock.options[optionIndex].votes || 0) + 1;
    pollBlock.votedUserIds.push({ userId, votedAt: new Date() });
    post.blocks[pollBlockIndex] = pollBlock;

    // console.log("[voteOnPoll] Updated poll block:", pollBlock);

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

    // console.log(
    //   "[voteOnPoll] Success, returning poll:",
    //   updatedPost.blocks[pollBlockIndex]
    // );

    res.status(200).json({
      success: true,
      message: "Vote recorded",
      poll: updatedPost.blocks[pollBlockIndex],
    });
  } catch (error) {
    console.error("[voteOnPoll] Error:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to record vote", 500, "VoteOnPoll")
    );
  }
};

export const createPost = async (req, res, next) => {
  // console.log("[createPost] Starting with:", {
  //   body: req.body,
  //   userId: req.user?._id,
  // });
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

    if (!req.user?._id) {
      console.error("[createPost] User not authenticated");
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "CreatePost"
      );
    }

    const tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
    if (!Array.isArray(tags)) {
      console.error("[createPost] Invalid tags format:", rawTags);
      throw new AppError("Tags must be an array", 400, "CreatePost");
    }

    const blocks = Array.isArray(rawBlocks)
      ? rawBlocks
      : JSON.parse(rawBlocks || "[]");
    if (!Array.isArray(blocks)) {
      console.error("[createPost] Invalid blocks format:", rawBlocks);
      throw new AppError("Blocks must be an array", 400, "CreatePost");
    }

    const blocksWithIds = blocks.map((block, index) => {
      if (!block || typeof block !== "object" || !block.type) {
        console.error("[createPost] Invalid block at index:", index, block);
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

    // Validate table blocks
    blocksWithIds.forEach((block, index) => {
      if (block.type === "table") {
        // console.log("[createPost] Validating table block:", {
        //   id: block.id,
        //   data: block.data,
        // }); // Enhanced logging
        if (
          !block.data ||
          !Array.isArray(block.data) ||
          block.data.length === 0
        ) {
          console.error(
            "[createPost] Table block missing data at index:",
            index
          );
          throw new AppError(
            `Table block at index ${index} must have non-empty data`,
            400,
            "CreatePost"
          );
        }
        if (!block.data.every((row) => Array.isArray(row) && row.length > 0)) {
          console.error(
            "[createPost] Invalid table data format at index:",
            index
          );
          throw new AppError(
            `Table block at index ${index} has invalid data format`,
            400,
            "CreatePost"
          );
        }
      }
    });

    const processImage = async (source, id, folder) => {
      // console.log("[createPost] Processing image:", { id, source });
      try {
        let buffer;
        if (source.startsWith("data:image")) {
          const [, base64Data] =
            source.match(/^data:image\/[a-z]+;base64,(.+)$/) || [];
          if (!base64Data) {
            console.error("[createPost] Invalid base64 image:", id);
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
          console.error("[createPost] Unsupported image source:", source);
          throw new AppError(
            "Unsupported image source",
            400,
            "CreatePost",
            "Invalid image source"
          );
        }

        const image = sharp(buffer);
        const metadata = await image.metadata();
        // console.log("[createPost] Image metadata:", metadata);
        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
          console.error(
            "[createPost] Unsupported image format:",
            metadata.format
          );
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
          console.error("[createPost] Cloudinary upload failed:", id);
          throw new AppError(
            "Image upload failed",
            500,
            "CreatePost",
            "Cloudinary upload failed"
          );
        }

        // console.log("[createPost] Image uploaded:", result.secure_url);
        return result.secure_url;
      } catch (err) {
        console.error("[createPost] Image processing error:", err.message);
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
        const processed = await processBlock(block); // Use processBlock for consistency
        return processed;
      })
    );

    const { readTime, readingTime } = calculateReadTime(processedBlocks);
    // console.log("[createPost] Read time generated:", { readTime, readingTime });

    let processedThumbnail = rawThumbnail;
    if (rawThumbnail) {
      processedThumbnail = await processImage(
        rawThumbnail,
        "thumbnail",
        "blogs/post/thumbnails/"
      );
    }

    const moderateContent = async (text) => {
      // console.log(
      //   "[createPost] Moderating content:",
      //   text.slice(0, 100) + "..."
      // );
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
      console.error("[createPost] Content flagged:", reasons);
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
    // console.log("[createPost] Generated slug:", slug);

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
      // console.log("[createPost] Post created:", newPost._id);

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

      // console.log("[createPost] Success, returning post:", newPost._id);
      res
        .status(201)
        .json({ success: true, message: "Post created", post: newPost });
    } catch (err) {
      await session.abortTransaction();
      console.error("[createPost] Transaction failed:", err.message);
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("[createPost] Error:", error.message, error.stack);
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
  // console.log("[getAllPosts] Starting with:", {
  //   query: req.query,
  //   userId: req.user?._id,
  // });
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
        console.error("[getAllPosts] Invalid author IDs:", rawAuthorIds);
        throw new AppError("Invalid author IDs provided", 400, "GetAllPosts");
      }
    }

    // console.log("[getAllPosts] Query:", query);

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

    // Log table blocks for debugging
    // posts.forEach((post) => {
    //   const tableBlocks = post.blocks?.filter((b) => b.type === "table") || [];
    //   if (tableBlocks.length > 0) {
    //     console.log(
    //       `[getAllPosts] Post ${post._id} table blocks:`,
    //       tableBlocks.map((b) => ({ id: b.id, data: b.data }))
    //     );
    //   }
    // });

    // console.log(
    //   "[getAllPosts] Fetched posts:",
    //   posts.map((p) => ({ _id: p._id, title: p.title }))
    // );

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
    console.error("[getAllPosts] Error:", error.message, error.stack);
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
  // console.log("[getSinglePost] Starting with:", {
  //   slug: req.params.slug,
  //   userId: req.user?._id,
  // });
  try {
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      console.error("[getSinglePost] Invalid slug:", slug);
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

    // console.log("[getSinglePost] Query:", query);

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
      console.error("[getSinglePost] Post not found for slug:", sanitizedSlug);
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
      console.error("[getSinglePost] Blocked post access denied:", post._id);
      throw new AppError(
        "Post is not available (blocked)",
        403,
        "GetSinglePost"
      );
    }

    // Log table blocks for debugging
    // const tableBlocks = post.blocks?.filter((b) => b.type === "table") || [];
    // if (tableBlocks.length > 0) {
    //   console.log(
    //     `[getSinglePost] Post ${post._id} table blocks:`,
    //     tableBlocks.map((b) => ({ id: b.id, data: b.data }))
    //   );
    // }

    // console.log("[getSinglePost] Success, returning post:", {
    //   _id: post._id,
    //   title: post.title,
    // });

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("[getSinglePost] Error:", error.message, error.stack);
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
  // console.log("[trackTimeSpent] Starting with:", {
  //   postId: req.params.postId,
  //   duration: req.body.duration,
  // });
  try {
    const { postId } = req.params;
    const { duration } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error("[trackTimeSpent] Invalid postId:", postId);
      throw new AppError("Invalid postId", 400, "trackTimeSpent");
    }

    if (typeof duration !== "number" || isNaN(duration) || duration < 0) {
      console.error("[trackTimeSpent] Invalid duration:", duration);
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

    // console.log("[trackTimeSpent] Updates:", { interactionUpdate, postUpdate });

    if (!postUpdate.modifiedCount && !interactionUpdate) {
      console.error("[trackTimeSpent] Post not found:", postId);
      throw new AppError("Post not found", 404, "trackTimeSpent");
    }

    res.status(200).json({ success: true, message: "Time spent recorded" });
  } catch (error) {
    console.error("[trackTimeSpent] Error:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track time", 500, "trackTimeSpent")
    );
  }
};

const processBlock = async (block) => {
  // console.log("[processBlock] Processing block:", {
  //   id: block.id,
  //   type: block.type,
  //   data: block.data,
  // }); // Enhanced logging
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
    processedBlock.question = processedBlock.question || "Default Question";
    processedBlock.options = Array.isArray(processedBlock.options)
      ? processedBlock.options.map((opt) => ({
          option:
            typeof opt.option === "string"
              ? opt.option
              : `Option ${opt.option || ""}`,
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

  if (block.type === "table") {
    if (
      !processedBlock.data ||
      !Array.isArray(processedBlock.data) ||
      processedBlock.data.length === 0
    ) {
      console.error("[processBlock] Table block missing data:", processedBlock);
      throw new AppError(
        "Table block must have non-empty data",
        400,
        "ProcessBlock"
      );
    }
    if (
      !processedBlock.data.every((row) => Array.isArray(row) && row.length > 0)
    ) {
      console.error(
        "[processBlock] Invalid table data format:",
        processedBlock.data
      );
      throw new AppError(
        "Table block has invalid data format",
        400,
        "ProcessBlock"
      );
    }
    // Added: Sanitize table data to ensure strings
    processedBlock.data = processedBlock.data.map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell)))
    );
  }

  return processedBlock;
};

export const updatePostBySlug = async (req, res, next) => {
  // console.log("[updatePostBySlug] Starting with:", {
  //   slug: req.params.slug,
  //   userId: req.user?._id,
  //   body: req.body,
  // });
  try {
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!slug) {
      console.error("[updatePostBySlug] Missing slug");
      throw new AppError("Missing slug", 400, "UpdatePostBySlug");
    }

    if (!userId) {
      console.error("[updatePostBySlug] User not authenticated");
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
            console.error("[updatePostBySlug] Invalid block at index:", i);
            throw new AppError(
              `Invalid block at index ${i}`,
              400,
              "UpdatePostBySlug"
            );
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

    const { readTime, readingTime } = calculateReadTime(updates.blocks || []);
    // console.log("[updatePostBySlug] Read time generated:", {
    //   readTime,
    //   readingTime,
    // });
    updates.readTime = readTime;
    updates.readingTime = readingTime;

    const query =
      userRole === "admin"
        ? { slug: { $regex: new RegExp(`^${slug}$`, "i") } }
        : { slug: { $regex: new RegExp(`^${slug}$`, "i") }, author: userId };

    const post = await PostModel.findOne(query).lean();
    if (!post) {
      console.error("[updatePostBySlug] Post not found:", { slug, userId });
      throw new AppError(
        "Post not found or unauthorized",
        404,
        "UpdatePostBySlug"
      );
    }

    if (post.blocked) {
      console.error("[updatePostBySlug] Post is blocked:", slug);
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
      console.error("[updatePostBySlug] Failed to update post:", slug);
      throw new AppError("Failed to update post", 500, "UpdatePostBySlug");
    }

    await recordActivity({
      userId,
      action: "POST_EDITED",
      targetPost: updatedPost._id,
      message: `Edited post: ${updatedPost.title}`,
    });

    // console.log("[updatePostBySlug] Success, updated post:", updatedPost._id);
    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("[updatePostBySlug] Error:", error.message, error.stack);
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
  // console.log("[deletePost] Starting with:", {
  //   postId: req.params.postId,
  //   userId: req.user?._id,
  // });
  try {
    const { postId } = req.params;
    const post = await PostModel.findById(postId);
    if (!post) {
      console.error("[deletePost] Post not found:", postId);
      throw new AppError("Post not found", 404, "DeletePost");
    }
    if (post.author.toString() !== req.user._id.toString()) {
      console.error("[deletePost] Unauthorized:", {
        postId,
        userId: req.user._id,
      });
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

    // console.log("[deletePost] Success, deleted post:", postId);
    res.status(200).json({ success: true, message: "Post deleted", postId });
  } catch (error) {
    console.error("[deletePost] Error:", error.message, error.stack);
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
  // console.log("[toggleBlockPost] Starting with:", {
  //   postId: req.params.postId,
  //   userId: req.user?._id,
  // });
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error("[toggleBlockPost] Invalid post ID:", postId);
      throw new AppError("Invalid post ID", 400, "ToggleBlockPost");
    }

    if (!req.user?._id || req.user.role !== "admin") {
      console.error("[toggleBlockPost] Unauthorized:", {
        userId: req.user?._id,
        role: req.user?.role,
      });
      throw new AppError("Admin access required", 401, "ToggleBlockPost");
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      console.error("[toggleBlockPost] Post not found:", postId);
      throw new AppError("Post not found", 404, "ToggleBlockPost");
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { blocked: !post.blocked } },
      { new: true, runValidators: true }
    );

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

    // console.log("[toggleBlockPost] Success, post status:", {
    //   postId,
    //   blocked: updatedPost.blocked,
    // });
    res.status(200).json({
      success: true,
      message: `Post ${
        updatedPost.blocked ? "blocked" : "unblocked"
      } successfully`,
      post: updatedPost,
    });
  } catch (error) {
    console.error("[toggleBlockPost] Error:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleBlockPost")
    );
  }
};

export const sendDailyPostEmail = async () => {
  // console.log("[sendDailyPostEmail] Starting");
  try {
    const users = await UserModel.find({
      emailStatus: "sent",
      stopEmailAttempts: false,
    })
      .select("name email")
      .lean();

    const posts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .select("title slug excerpt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (!posts.length) {
      // console.log("[sendDailyPostEmail] No new posts to send");
      return;
    }

    // console.log(
    //   "[sendDailyPostEmail] Posts to send:",
    //   posts.map((p) => p.title)
    // );

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

    await processEmailQueue();
    // console.log("[sendDailyPostEmail] Emails queued successfully");
  } catch (error) {
    console.error("[sendDailyPostEmail] Error:", error.message, error.stack);
    throw new AppError(
      "Failed to send daily post emails",
      500,
      "SendDailyPostEmail"
    );
  }
};

export const submitAppeal = async (req, res, next) => {
  // console.log("[submitAppeal] Starting with:", {
  //   postId: req.params.postId,
  //   userId: req.user?._id,
  // });
  try {
    const { postId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error("[submitAppeal] Invalid post ID:", postId);
      throw new AppError("Invalid post ID", 400, "SubmitAppeal");
    }

    if (!userId) {
      console.error("[submitAppeal] User not authenticated");
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "SubmitAppeal"
      );
    }

    if (!message || !message.trim()) {
      console.error("[submitAppeal] Missing appeal message");
      throw new AppError("Appeal message is required", 400, "SubmitAppeal");
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      console.error("[submitAppeal] Post not found:", postId);
      throw new AppError("Post not found", 404, "SubmitAppeal");
    }

    if (post.author.toString() !== userId.toString()) {
      console.error("[submitAppeal] Unauthorized:", { postId, userId });
      throw new AppError(
        "Only the post author can appeal",
        403,
        "SubmitAppeal"
      );
    }

    if (!post.blocked) {
      console.error("[submitAppeal] Post not blocked:", postId);
      throw new AppError("Post is not blocked", 400, "SubmitAppeal");
    }

    await recordActivity({
      userId,
      action: "POST_APPEAL_SUBMITTED",
      targetPost: postId,
      message: `Appeal submitted for post: ${post.title} - ${message}`,
    });

    io.emit("newAppeal", { postId, userId, message, postTitle: post.title });

    // console.log("[submitAppeal] Success, appeal submitted for post:", postId);
    res
      .status(200)
      .json({ success: true, message: "Appeal submitted successfully" });
  } catch (error) {
    console.error("[submitAppeal] Error:", error.message, error.stack);
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
  // console.log("[incrementShareCount] Starting with:", {
  //   postId: req.params.postId,
  // });
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error("[incrementShareCount] Invalid post ID:", postId);
      throw new AppError("Invalid post ID", 400, "IncrementShareCount");
    }

    const result = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true, select: "shareCount" }
    );

    if (!result) {
      console.error("[incrementShareCount] Post not found:", postId);
      throw new AppError("Post not found", 404, "IncrementShareCount");
    }

    // console.log(
    //   "[incrementShareCount] Success, share count:",
    //   result.shareCount
    // );
    res.status(200).json({
      success: true,
      message: "Share count incremented",
      shareCount: result.shareCount,
    });
  } catch (error) {
    console.error("[incrementShareCount] Error:", error.message, error.stack);
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

export const getDraftAndPendingPosts = async (req, res, next) => {
  // console.log("[getDraftAndPendingPosts] Starting with:", {
  //   userId: req.user?._id,
  //   query: req.query,
  // });
  try {
    const userId = req.user?._id;
    if (!userId) {
      console.error("[getDraftAndPendingPosts] User not authenticated");
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

    const [posts, total] = await Promise.all([
      PostModel.find(query)
        .select(
          "title slug category excerpt thumbnail author createdAt isPublished"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar")
        .lean(),
      PostModel.countDocuments(query),
    ]);

    // Log table blocks for debugging
    // posts.forEach((post) => {
    //   const tableBlocks = post.blocks?.filter((b) => b.type === "table") || [];
    //   if (tableBlocks.length > 0) {
    //     console.log(
    //       `[getDraftAndPendingPosts] Post ${post._id} table blocks:`,
    //       tableBlocks.map((b) => ({ id: b.id, data: b.data }))
    //     );
    //   }
    // });

    // console.log(
    //   "[getDraftAndPendingPosts] Fetched posts:",
    //   posts.map((p) => ({ _id: p._id, title: p.title }))
    // );

    if (!posts.length) {
      // console.log("[getDraftAndPendingPosts] No posts found");
      return res.status(200).json({
        success: true,
        message: "No posts found",
        total: 0,
        page,
        posts: [],
      });
    }

    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    console.error(
      "[getDraftAndPendingPosts] Error:",
      error.message,
      error.stack
    );
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

export const getPublicPost = async (req, res, next) => {
  // console.log("[getPublicPost] Starting with:", { slug: req.params.slug });
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      console.error("[getPublicPost] Invalid slug:", slug);
      throw new AppError("Invalid post slug", 400, "GetPublicPost");
    }

    const sanitizedSlug = slug.trim().toLowerCase();

    const post = await PostModel.findOne({
      slug: sanitizedSlug,
      isPublished: true,
      blocked: false,
    })
      .select(
        `
        title slug category excerpt thumbnail author createdAt
        isPublished readTime readingTime tags language viewsCount shareCount
      `
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (!post) {
      console.error("[getPublicPost] Post not found:", sanitizedSlug);
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPost"
      );
    }

    // Log table blocks for debugging
    // const tableBlocks = post.blocks?.filter((b) => b.type === "table") || [];
    // if (tableBlocks.length > 0) {
    //   console.log(
    //     `[getPublicPost] Post ${post._id} table blocks:`,
    //     tableBlocks.map((b) => ({ id: b.id, data: b.data }))
    //   );
    // }

    // console.log("[getPublicPost] Success, returning post:", {
    //   _id: post._id,
    //   title: post.title,
    // });
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("[getPublicPost] Error:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to fetch public post", 500, "GetPublicPost")
    );
  }
};

export const getFollowingPosts = async (req, res, next) => {
  // console.log("[getFollowingPosts] Starting with:", {
  //   userId: req.user?._id,
  //   query: req.query,
  // });
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    if (!userId) {
      console.error("[getFollowingPosts] User not authenticated");
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "GetFollowingPosts"
      );
    }

    const user = await UserModel.findById(userId).select("following").lean();
    if (!user) {
      console.error("[getFollowingPosts] User not found:", userId);
      throw new AppError("User not found", 404, "GetFollowingPosts");
    }

    const followingIds = user.following
      .map((id) => id.toString())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!followingIds.length) {
      // console.log("[getFollowingPosts] No followed users");
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

    // console.log("[getFollowingPosts] Query:", query);

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

    // Log table blocks for debugging
    // posts.forEach((post) => {
    //   const tableBlocks = post.blocks?.filter((b) => b.type === "table") || [];
    //   if (tableBlocks.length > 0) {
    //     console.log(
    //       `[getFollowingPosts] Post ${post._id} table blocks:`,
    //       tableBlocks.map((b) => ({ id: b.id, data: b.data }))
    //     );
    //   }
    // });

    await recordActivity({
      userId,
      action: "VIEWED_FOLLOWING_POSTS",
      message: `Viewed posts from followed users`,
    });

    // console.log(
    //   "[getFollowingPosts] Success, fetched posts:",
    //   posts.map((p) => ({ _id: p._id, title: p.title }))
    // );
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    console.error("[getFollowingPosts] Error:", error.message, error.stack);
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
