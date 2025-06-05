import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../Utils/uploadToCloudinary.js";
import sharp from "sharp";
import slugify from "slugify";
import axios from "axios";
import { recordActivity } from "../helpers/activityHelper.js";
import mongoose from "mongoose"; // Added for ObjectId validation

/**
 * @desc Create a new blog post with optimized thumbnail handling
 */
export const createPost = async (req, res, next) => {
  try {
    console.log("[DEBUG] Incoming create post request");

    const {
      title,
      category,
      excerpt,
      tags: rawTags,
      blocks: rawBlocks,
      thumbnail,
      isFeatured = false,
      isPinned = false,
      isPublished = false,
      language = "en",
      status = "draft",
    } = req.body;
    console.log("[DEBUG] Received body:", {
      title,
      category,
      excerpt,
      isFeatured,
      isPinned,
      isPublished,
      language,
      status,
    });

    if (!req.user?._id) {
      throw new AppError("User authentication required", 401, "CreatePost Controller");
    }

    // Validate new fields
    if (typeof isFeatured !== "boolean") {
      throw new AppError("isFeatured must be a boolean", 400, "CreatePost Controller");
    }
    if (typeof isPinned !== "boolean") {
      throw new AppError("isPinned must be a boolean", 400, "CreatePost Controller");
    }
    if (typeof isPublished !== "boolean") {
      throw new AppError("isPublished must be a boolean", 400, "CreatePost Controller");
    }
    if (typeof language !== "string" || !language.match(/^[a-z]{2}$/i)) {
      throw new AppError(
        "Language must be a valid two-letter code (e.g., 'en')",
        400,
        "CreatePost Controller"
      );
    }
    if (!["draft", "review", "published", "archived"].includes(status)) {
      throw new AppError(
        "Status must be one of: draft, review, published, archived",
        400,
        "CreatePost Controller"
      );
    }

    let tags = [];
    try {
      tags = typeof rawTags === "string" ? JSON.parse(rawTags) : rawTags || [];
    } catch (err) {
      throw new AppError("Invalid tags format", 400, "CreatePost Controller");
    }

    let blocks = [];
    try {
      blocks = typeof rawBlocks === "string" ? JSON.parse(rawBlocks) : rawBlocks || [];
    } catch (err) {
      throw new AppError("Invalid blocks format", 400, "CreatePost Controller");
    }

    if (!title || !category || !Array.isArray(blocks) || !blocks.length) {
      throw new AppError("Title, category, and blocks are required", 400, "CreatePost Controller");
    }

    const slug = slugify(title, { lower: true, strict: true });

    const blocksWithIds = blocks.map((block) => ({
      id: block.id || uuidv4(),
      ...block,
    }));

    async function uploadImageFromUrl(imageUrl) {
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      const image = sharp(buffer);
      const metadata = await image.metadata();
      if (metadata.width > 1200) image.resize({ width: 1200 });
      const compressedBuffer = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      const result = await uploadToCloudinary({
        buffer: compressedBuffer,
        folder: "blogs/post/blocks/images/",
      });
      return result.secure_url;
    }

    async function processImageBlockSrc(src) {
      if (!src) return src;
      if (src.startsWith("data:image")) {
        const uploadResult = await uploadToCloudinary({
          base64: src,
          folder: "blogs/post/blocks/images/",
        });
        return uploadResult.secure_url;
      } else if (src.startsWith("http")) {
        return await uploadImageFromUrl(src);
      }
      return src;
    }

    const processedBlocks = await Promise.all(
      blocksWithIds.map(async (block, index) => {
        const processedBlock = { ...block };

        if (block.type === "image" && block.src) {
          try {
            processedBlock.src = await processImageBlockSrc(block.src);
          } catch (err) {
            console.warn("[WARN] Failed to upload image block:", err.message);
          }
        }

        if (block.type === "poll") {
          if (!block.question || !Array.isArray(block.options)) {
            throw new AppError(
              `Poll block at index ${index} must have a question and options array`,
              400,
              "CreatePost Controller"
            );
          }

          processedBlock.options = block.options.map((opt) => {
            if (typeof opt === "string") {
              return { option: opt, votes: 0 };
            } else if (opt && typeof opt === "object" && opt.option) {
              return { option: opt.option, votes: opt.votes || 0 };
            } else {
              throw new AppError(
                `Invalid option in poll block`,
                400,
                "CreatePost Controller"
              );
            }
          });

          processedBlock.votedUserIds = block.votedUserIds || [];
        }

        return processedBlock;
      })
    );

    let thumbnailUrl = "";
    if (req.file) {
      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();
      let quality = 80;
      if (req.file.size > 4 * 1024 * 1024) quality = 70;
      else if (req.file.size < 1 * 1024 * 1024) quality = 85;
      if (metadata.width > 1200) image.resize({ width: 1200 });
      const compressedBuffer = await image.jpeg({ quality, mozjpeg: true }).toBuffer();
      const result = await uploadToCloudinary({
        buffer: compressedBuffer,
        folder: "blogs/post/Create-post/",
      });
      thumbnailUrl = result.secure_url;
    } else if (thumbnail?.startsWith("data:image")) {
      const result = await uploadToCloudinary({
        base64: thumbnail,
        folder: "blogs/post/Thumbnail/",
      });
      thumbnailUrl = result.secure_url;
    } else if (typeof thumbnail === "string" && thumbnail.trim() !== "") {
      thumbnailUrl = await uploadImageFromUrl(thumbnail);
    }

    const postData = {
      title,
      slug,
      category,
      tags,
      thumbnail: thumbnailUrl,
      excerpt,
      blocks: processedBlocks,
      author: req.user._id,
      isFeatured, // New field
      isPinned, // New field
      isPublished, // New field
      language, // New field
      status, // New field
    };

    const newPost = await PostModel.create(postData);

    // Record Activity
    await recordActivity({
      userId: req.user._id,
      action: "POST_CREATED",
      targetPost: newPost._id,
      message: `Created post: ${title}`,
    });

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to create post", 500, "CreatePost Controller")
    );
  }
};

/**
 * @desc Get all posts with pagination
 */
export const getAllPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name");

    const total = await PostModel.countDocuments();

    // ✅ Record Activity (Optional, added for consistency)
    if (req.user?._id) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_POSTS", // New enum value needed in ActivityModel
        message: "Viewed all posts",
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
        : new AppError(error.message, 500, "GetAllPosts Controller")
    );
  }
};

/**
 * @desc Get a single post by slug
 */
export const getSinglePost = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const post = await PostModel.findOne({ slug }).populate("author", "name");

    if (!post) {
      throw new AppError("Post not found", 404, "GetSinglePost Controller");
    }

    // ✅ Record Activity (Optional, added for consistency)
    if (req.user?._id) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_POST", // New enum value needed in ActivityModel
        targetPost: post._id,
        message: `Viewed post: ${post.title}`,
      });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetSinglePost Controller")
    );
  }
};

/**
 * @desc Update a post (partial update)
 */
export const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "UpdatePost Controller");
    }

    if (!req.user?._id) {
      throw new AppError("User authentication required", 401, "UpdatePost Controller");
    }

    const updates = req.body;

    let updatedPost;

    if (updates.poll) {
      updatedPost = await PostModel.findOneAndUpdate(
        { _id: postId, "blocks.type": "poll" },
        {
          $set: {
            "blocks.$[elem].question": updates.poll.question,
            "blocks.$[elem].options": updates.poll.options,
            "blocks.$[elem].votedUserIds": updates.poll.votedUserIds || [],
          },
        },
        {
          arrayFilters: [{ "elem.type": "poll" }],
          new: true,
          runValidators: true,
        }
      );
    } else {
      updatedPost = await PostModel.findByIdAndUpdate(postId, updates, {
        new: true,
        runValidators: true,
      });
    }

    if (!updatedPost) {
      throw new AppError("Post not found", 404, "UpdatePost Controller");
    }

    // ✅ Record Activity (Fixed action value)
    await recordActivity({
      userId: req.user._id,
      action: "POST_EDITED", // Matches ActivityModel enum
      targetPost: updatedPost._id,
      message: `Edited post: ${updatedPost.title}`,
    });

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "UpdatePost Controller")
    );
  }
};

/**
 * @desc Delete a post
 */
export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "DeletePost Controller");
    }

    if (!req.user?._id) {
      throw new AppError("User authentication required", 401, "DeletePost Controller");
    }

    const deletedPost = await PostModel.findByIdAndDelete(postId);

    if (!deletedPost) {
      throw new AppError("Post not found", 404, "DeletePost Controller");
    }

    // ✅ Record Activity (Fixed action value)
    await recordActivity({
      userId: req.user._id,
      action: "POST_DELETED", // Matches ActivityModel enum
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