import mongoose from "mongoose";
import PostModel from "../Models/Post.js";
import { AppError } from "../../servers/Utils/AppError.js";

/**
 * @desc Get total views and likes of a post
 */
export const getPostStats = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const postIds = postId.split(',').map(id => id.trim()); // Split and trim IDs

    // Validate ObjectIds
    const validIds = postIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new AppError("Invalid Post IDs", 400, "getPostStats Controller");
    }

    // Query posts using $in
    const posts = await PostModel.find({ _id: { $in: validIds } });

    if (!posts || posts.length === 0) {
      throw new AppError("No posts found", 404, "getPostStats Controller");
    }

    // Map posts to stats
    const stats = posts.map(post => ({
      postId: post._id,
      views: post.views || 0,
      likes: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0,
    }));

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getPostStats Controller")
    );
  }
};

/**
 * @desc Get engagement stats for the logged-in user
 * @route GET /analytics/user-engagement
 * @access Protected
 */

export const getUserEngagementStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [stats] = await PostModel.aggregate([
      {
        $match: {
          author: new mongoose.Types.ObjectId(userId),
          isPublished: true,
        },
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          totalBookmarks: { $sum: { $ifNull: ["$bookmarksCount", 0] } },
          totalComments: { $sum: { $ifNull: ["$commentsCount", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalPosts: 1,
          totalLikes: 1,
          totalViews: 1,
          totalBookmarks: 1,
          totalComments: 1,
        },
      },
    ]).exec();

    const result = stats || {
      totalPosts: 0,
      totalLikes: 0,
      totalViews: 0,
      totalBookmarks: 0,
      totalComments: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(new AppError(error.message, 500, "getUserEngagementStats Controller"));
  }
};
