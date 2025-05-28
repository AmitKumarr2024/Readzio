import PostModel from '../Models/Post.js';
import { AppError } from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary } from '../Utils/uploadToCloudinary.js';

/**
 * @desc Create a new blog post
 */
export const createPost = async (req, res, next) => {
  try {
    // Destructure required fields from request body
    const { title, slug, category, excerpt } = req.body;

    // Parse tags and blocks (can be JSON strings or already parsed arrays)
    let tags = [];
    let blocks = [];

    try {
      tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
    } catch {
      tags = [];
    }

    try {
      blocks = typeof req.body.blocks === 'string' ? JSON.parse(req.body.blocks) : req.body.blocks;
    } catch {
      blocks = [];
    }

    // Ensure required fields are present
    if (!title || !slug || !category || !blocks.length) {
      throw new AppError('Missing required fields', 400, 'CreatePost Controller');
    }

    // Assign unique ID to each block
    const blocksWithIds = blocks.map((block) => ({
      id: uuidv4(),
      ...block,
    }));

    // Handle thumbnail upload (supporting file, base64, or existing URL)
    let thumbnailUrl = '';

    if (req.file) {
      // If file was uploaded via multipart/form-data
      const result = await uploadToCloudinary({ buffer: req.file.buffer, folder: 'blogs/Create-post/' });
      thumbnailUrl = result.secure_url;
    } else if (req.body.thumbnail && req.body.thumbnail.startsWith('data:image')) {
      // If base64 image is provided
      const result = await uploadToCloudinary({ base64: req.body.thumbnail, folder: 'blogs/Create-post/' });
      thumbnailUrl = result.secure_url;
    } else if (typeof req.body.thumbnail === 'string' && req.body.thumbnail.trim() !== '') {
      // Use the provided URL as-is
      thumbnailUrl = req.body.thumbnail;
    }

    // Get user ID from authenticated user (or fallback ID for testing)
    const userId = req.user?._id || '6642000e2beabc469bd91d98';

    // Construct and save the new post
    const newPost = new PostModel({
      title,
      slug,
      category,
      tags,
      thumbnail: thumbnailUrl,
      excerpt,
      blocks: blocksWithIds,
      author: userId,
    });

    await newPost.save();

    // Respond with success
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: newPost,
    });
  } catch (error) {
    // If error isn't an AppError, convert it
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, 'CreatePost Controller'));
    }
    next(error);
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

    // Fetch paginated posts and total count
    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name");

    const total = await PostModel.countDocuments();

    res.status(200).json({
      success: true,
      total,
      page,
      posts,
    });
  } catch (error) {
    next(new AppError(error.message, 500, "GetAllPosts Controller"));
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

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "GetSinglePost Controller"));
  }
};

/**
 * @desc Update a post (partial update)
 */
export const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const updates = req.body;

    // Update post and return the updated document
    const updatedPost = await PostModel.findByIdAndUpdate(postId, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedPost) {
      throw new AppError("Post not found", 404, "UpdatePost Controller");
    }

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "UpdatePost Controller"));
    }
    next(error);
  }
};

/**
 * @desc Delete a post
 */
export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const deletedPost = await PostModel.findByIdAndDelete(postId);

    if (!deletedPost) {
      throw new AppError("Post not found", 404, "DeletePost Controller");
    }

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(new AppError(error.message, 500, "DeletePost Controller"));
  }
};

