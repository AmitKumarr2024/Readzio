import PostModel from "../Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../Utils/uploadToCloudinary.js";
import sharp from "sharp";
import slugify from "slugify";
import axios from "axios";
import { recordActivity } from "../helpers/activityHelper.js";
import mongoose from "mongoose";
import { checkIfSubscribed } from "../Utils/checkIfSubscribed.js";
import PostInteraction from "../models/PostInteraction.js";
import UserModel from "../Models/User.js";
import { io } from "../sockets/socket.js";

export const voteOnPoll = async (req, res, next) => {
  try {
    const { postId, blockId, optionIndex } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "VoteOnPoll");
    }
    if (!userId) {
      throw new AppError("You must be signed in to access this feature.", 401, "VoteOnPoll");
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

    // Increment vote count and add user to votedUserIds
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
      throw new AppError("User You must be signed in to access this feature.", 401, "CreatePost");

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

        // Resize only if necessary, preserving aspect ratio
        if (metadata.width > 1200 || metadata.height > 1200) {
          image.resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        // Convert to WebP for better compression
        const compressedBuffer = await image
          .webp({ quality: 75, effort: 4 }) // effort: 4 balances speed and compression
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
        const processed = { ...block };
        if (block.type === "image" && block.src) {
          processed.src = await processImage(
            block.src,
            `block ${block.id}`,
            "blogs/post/blocks/images/"
          );
        }
        if (block.type === "poll") {
          if (!block.question || !Array.isArray(block.options)) {
            throw new AppError(
              "Poll requires question and options array",
              400,
              "CreatePost"
            );
          }
          processed.options = block.options.map((opt) => ({
            option: typeof opt === "string" ? opt : opt.option,
            votes: opt.votes || 0,
          }));
          processed.votedUserIds = block.votedUserIds || [];
        }
        if (block.type === "list" && Array.isArray(block.items)) {
          processed.items = block.items.map((item) =>
            item == null ? "" : String(item)
          );
        }
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
          Object.entries(processed).filter(([key]) =>
            allowedFields.includes(key)
          )
        );
      })
    );

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

    const slug = slugify(title, { lower: true, strict: true });
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

    // Build secure query based on user type
    const query = {
      slug: sanitizedSlug,
      ...(userId
        ? {
            $or: [
              { isPublished: true, blocked: false },
              { author: userId },
              ...(userRole === "admin" ? [{}] : []), // Admin can see all
            ],
          }
        : { isPublished: true, blocked: false }), // Guest
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

    // Blocked post check (author or admin only)
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

    // Log activity
    if (userId) {
      await recordActivity({
        userId,
        action: "VIEWED_POST",
        targetPost: post._id,
        message: `Viewed post: ${post.title}`,
      });
    }

    console.log(
      "[GetSinglePost] Post fetched:",
      post._id,
      "isPublished:",
      post.isPublished,
      "blocked:",
      post.blocked
    );

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
        {
          $inc: { timeSpent: duration },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: false }
      ),
      PostModel.updateOne({ _id: postId }, { $inc: { timeSpent: duration } }),
    ]);

    if (!postUpdate.modifiedCount && !interactionUpdate) {
      throw new AppError("Post not found", 404, "trackTimeSpent");
    }

    res.status(200).json({
      success: true,
      message: "Time spent recorded",
    });
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

// Process block (sanitize and enforce defaults)
const processBlock = async (block) => {
  const processedBlock = { ...block };

  // Sanitize text fields to prevent XSS (basic example, use a library like sanitize-html in production)
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

  // Ensure poll block has valid structure
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

  return processedBlock;
};

// Update Post by Slug
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
      throw new AppError("You must be signed in to access this feature.", 401, "UpdatePostBySlug");
    }

    const updates = { ...req.body };

    // Validate and transform blocks if provided
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

          // Process block fields (sanitize, enforce defaults)
          const processedBlock = await processBlock({
            ...block,
            id: block.id || uuidv4(),
            blocked: typeof block.blocked === "boolean" ? block.blocked : false,
          });

          // Whitelist allowed fields
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

    // Case-insensitive slug query
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
      {
        ...updates,
        isPublished: true,
        lastEditedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
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

    io.emit("postBlockToggled", {
      postId: post._id,
      blocked: post.blocked,
    });
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

export const sendDailyPostEmail = async () => {
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
      console.log("No new posts to send.");
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

    await processEmailQueue();
    console.log("Daily post emails queued successfully.");
  } catch (error) {
    console.error("Error sending daily post emails:", error);
    throw new AppError(
      "Failed to send daily post emails",
      500,
      "SendDailyPostEmail"
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
      throw new AppError("You must be signed in to access this feature.", 401, "SubmitAppeal");
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

    io.emit("newAppeal", {
      postId,
      userId,
      message,
      postTitle: post.title,
    });

    res.status(200).json({
      success: true,
      message: "Appeal submitted successfully",
    });
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
    console.log(`[incrementPostShare] PostId:`, postId);

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

    res.status(200).json({
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

export const getDraftAndPendingPosts = async (req, res, next) => {
  try {
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

    const query = {
      author: userId,
      blocked: { $ne: true },
    };

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

    if (!posts.length) {
      return res.status(200).json({
        success: true,
        message: "No posts found",
        total: 0,
        page,
        posts: [],
      });
    }

    res.status(200).json({
      success: true,
      total,
      page,
      posts,
    });
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
        `
        title slug category excerpt thumbnail author createdAt
        isPublished readTime tags language viewsCount shareCount
      `
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
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Higher limit for proactive fetching
    const skip = (page - 1) * limit;

    if (!userId) {
      throw new AppError("You must be signed in to access this feature.", 401, "GetFollowingPosts");
    }

    // Fetch the user's following list
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

    // Query posts from followed users
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
          tags language isFeatured allowComments timeSpent updatedAt
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

    // Log activity
    await recordActivity({
      userId,
      action: "VIEWED_FOLLOWING_POSTS",
      message: `Viewed posts from followed users`,
    });

    res.status(200).json({
      success: true,
      total,
      page,
      posts,
    });
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
