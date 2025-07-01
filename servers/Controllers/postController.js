import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../Utils/uploadToCloudinary.js";
import sharp from "sharp";
import slugify from "slugify";
import axios from "axios";
import { recordActivity } from "../helpers/activityHelper.js";
import mongoose from "mongoose";
import { checkIfSubscribed } from "../Utils/checkIfSubscribed.js";
import PostInteraction from "../models/PostInteraction.js";
import { processBlock } from "../Utils/processBlock.js";


export const createPost = async (req, res, next) => {
  try {
    const {
      title, category, excerpt, tags: rawTags, blocks: rawBlocks = [],
      thumbnail: rawThumbnail, isFeatured = false, isPinned = false,
      isPublished = false, language = "en", status = "draft",
    } = req.body;

    if (!req.user?._id) throw new AppError("User authentication required", 401, "CreatePost");

    const tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
    if (!Array.isArray(tags)) throw new AppError("Tags must be an array", 400, "CreatePost");

    const blocks = Array.isArray(rawBlocks) ? rawBlocks : JSON.parse(rawBlocks || "[]");
    if (!Array.isArray(blocks)) throw new AppError("Blocks must be an array", 400, "CreatePost");

    const blocksWithIds = blocks.map((block, index) => {
      if (!block || typeof block !== "object" || !block.type) {
        throw new AppError(`Invalid block at index ${index}`, 400, "CreatePost");
      }
      return { id: block.id || uuidv4(), type: block.type, status: block.status || "draft", ...block };
    });

    const processImage = async (source, id, folder) => {
      try {
        let buffer;
        if (source.startsWith("data:image")) {
          const [, base64Data] = source.match(/^data:image\/[a-z]+;base64,(.+)$/) || [];
          if (!base64Data) throw new AppError("Invalid base64 image", 400, "CreatePost");
          buffer = Buffer.from(base64Data, "base64");
        } else if (source.startsWith("http")) {
          const response = await axios.get(source, { responseType: "arraybuffer", timeout: 5000 });
          buffer = Buffer.from(response.data, "binary");
        } else {
          console.warn(`Unsupported image source for ${id}: ${source}`);
          throw new AppError("Unsupported image format", 400, "CreatePost");
        }

        const image = sharp(buffer);
        const metadata = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
          console.warn(`Unsupported image format for ${id}: ${metadata.format}`);
          throw new AppError("Unsupported image format", 400, "CreatePost");
        }
        if (metadata.width > 1200) image.resize({ width: 1200 });
        const compressedBuffer = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        const result = await uploadToCloudinary({ buffer: compressedBuffer, folder });
        if (!result?.secure_url) throw new AppError("Image upload failed", 500, "CreatePost");
        console.log(`Image uploaded for ${id}: ${result.secure_url}`);
        return result.secure_url;
      } catch (err) {
        console.error(`Image processing failed for ${id}: ${err.message}`);
        throw new AppError(`Image processing failed: ${err.message}`, 400, "CreatePost");
      }
    };

    const processedBlocks = await Promise.all(
      blocksWithIds.map(async (block) => {
        const processed = { ...block };

        if (block.type === "image" && block.src) {
          processed.src = await processImage(block.src, `block ${block.id}`, "blogs/post/blocks/images/");
        }

        if (block.type === "poll") {
          if (!block.question || !Array.isArray(block.options)) {
            throw new AppError("Poll requires question and options array", 400, "CreatePost");
          }
          processed.options = block.options.map((opt) => ({
            option: typeof opt === "string" ? opt : opt.option,
            votes: opt.votes || 0,
          }));
          processed.votedUserIds = block.votedUserIds || [];
        }

        if (block.type === "list" && Array.isArray(block.items)) {
          processed.items = block.items.map((item) => (item == null ? "" : String(item)));
        }

        const allowedFields = [
          "id", "type", "status", "value", "level", "text", "code", "caption",
          "src", "href", "url", "name", "size", "ordered", "author", "question",
          "options", "votedUserIds", "items", "data"
        ];
        return Object.fromEntries(Object.entries(processed).filter(([key]) => allowedFields.includes(key)));
      })
    );

    let processedThumbnail = rawThumbnail;
    if (rawThumbnail) {
      processedThumbnail = await processImage(rawThumbnail, "thumbnail", "blogs/post/thumbnails/");
    }

    const blockTextContent = processedBlocks
      .flatMap((block) => ["text", "value", "code", "caption", "question"].map((f) => block[f]).filter(Boolean))
      .join("\n");

    const fullText = `${title}\n${excerpt || ""}\n${blockTextContent}`;
    const moderation = await moderateContent(fullText);
    if (moderation.isFlagged) {
      const reasons = Object.entries(moderation.categories).filter(([_, flagged]) => flagged).map(([key]) => key);
      throw new AppError(`Restricted content: ${reasons.join(", ")}`, 400, "CreatePost");
    }

    const slug = slugify(title, { lower: true, strict: true });
    const postData = {
      title, slug, category, tags, thumbnail: processedThumbnail, excerpt, blocks: processedBlocks,
      author: req.user._id, isFeatured, isPinned, isPublished, language, status,
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const [newPost] = await PostModel.create([postData], { session });
      await recordActivity({
        userId: req.user._id,
        action: "POST_CREATED",
        targetPost: newPost._id,
        message: `Created post: ${title}`,
      }, { session });
      await session.commitTransaction();
      res.status(200).json({ success: true, message: "Post created", post: newPost });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message || "Failed to create post", 500, "CreatePost"));
  }
};

export const getAllPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;
    const authorId = req.query.authorId;

    const query = authorId ? { author: authorId } : {};

    const [posts, total] = await Promise.all([
      PostModel.find(query)
        .select("title slug category excerpt thumbnail author createdAt isPublished isPinned")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar")
        .lean(),
      PostModel.countDocuments(query),
    ]);

    if (req.user?._id) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_POSTS",
        message: "Viewed all posts",
      });
    }

    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message || "Failed to fetch posts", 500, "GetAllPosts"));
  }
};

export const getSinglePost = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id;

    if (!slug || typeof slug !== "string") throw new AppError("Invalid post slug", 400, "GetSinglePost");

    const post = await PostModel.findOne({
      slug: { $regex: `^${slug}$`, $options: "i" },
      $or: [{ isPublished: true }, { author: userId }],
    })
      .select("title slug category excerpt thumbnail blocks author isPublished createdAt")
      .populate("author", "name email avatar")
      .populate("category")
      .lean();

    if (!post) throw new AppError("Post not found", 404, "GetSinglePost");

    res.status(200).json({ success: true, post });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message || "Failed to fetch post", 500, "GetSinglePost"));
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

    // Use Promise.all to parallelize both updates
    const [interactionUpdate, postUpdate] = await Promise.all([
      PostInteraction.findOneAndUpdate(
        { postId, userId },
        {
          $inc: { timeSpent: duration },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: false }
      ),
      PostModel.updateOne(
        { _id: postId },
        { $inc: { timeSpent: duration } }
      ),
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


export const updatePostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id;

    if (!slug) {
      throw new AppError("Missing slug", 400, "UpdatePostBySlug");
    }

    if (!userId) {
      throw new AppError("Authentication required", 401, "UpdatePostBySlug");
    }

    const updates = { ...req.body };

    // Validate blocks if provided
    if (updates.blocks) {
      updates.blocks = await Promise.all(
        updates.blocks.map(async (block, i) => {
          if (!block || typeof block !== "object" || !block.type) {
            throw new AppError(`Invalid block at index ${i}`, 400, "UpdatePostBySlug");
          }
          return await processBlock({
            ...block,
            id: block.id || uuidv4(),
            status: block.status || "draft",
          });
        })
      );
    }

    const updatedPost = await PostModel.findOneAndUpdate(
      { slug, author: userId }, // Ensure only author can update
      { ...updates, lastEditedAt: new Date() },
      { new: true, runValidators: true }
    ).select("title slug category excerpt thumbnail blocks author isPublished isPinned createdAt lastEditedAt");

    if (!updatedPost) {
      throw new AppError("Post not found or unauthorized", 404, "UpdatePostBySlug");
    }

    await recordActivity({
      userId,
      action: "POST_EDITED",
      targetPost: updatedPost._id,
      message: `Edited post: ${updatedPost.title}`,
    });

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost, // Consistent with createPost
    });
  } catch (error) {
    console.error("[UpdatePostBySlug Error]:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to update post", 500, "UpdatePostBySlug")
    );
  }
};



export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "DeletePost Controller");
    }

    if (!req.user?._id) {
      throw new AppError(
        "User authentication required",
        401,
        "DeletePost Controller"
      );
    }

    const deletedPost = await PostModel.findByIdAndDelete(postId);

    if (!deletedPost) {
      throw new AppError("Post not found", 404, "DeletePost Controller");
    }

    await recordActivity({
      userId: req.user._id,
      action: "POST_DELETED",
      targetPost: deletedPost._id,
      message: `Deleted post: ${deletedPost.title}`,
    });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "DeletePost Controller")
    );
  }
};

export const toggleBlockPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "ToggleBlockPost Controller");
    }

    if (!req.user?._id || req.user.role !== 'admin') {
      throw new AppError(
        "Admin authentication required",
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

    await recordActivity({
      userId: req.user._id,
      action: updatedPost.blocked ? "POST_BLOCKED" : "POST_UNBLOCKED",
      targetPost: postId,
      message: `${updatedPost.blocked ? 'Blocked' : 'Unblocked'} post: ${updatedPost.title}`,
    });

    res.status(200).json({
      success: true,
      message: `Post ${updatedPost.blocked ? 'blocked' : 'unblocked'} successfully`,
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