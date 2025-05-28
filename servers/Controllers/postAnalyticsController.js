import mongoose from 'mongoose';
import PostModel from '../Models/Post.js';
import { AppError } from '../utils/AppError.js';

/**
 * @desc Get total views and likes of a post
 */
export const getPostStats = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await PostModel.findById(postId);

    if (!post) throw new AppError("Post not found", 404, "getPostStats Controller");

    res.status(200).json({
      success: true,
      stats: {
        views: post.views || 0,
        likes: post.likes ? post.likes.length : 0,
        commentsCount: post.comments ? post.comments.length : 0,
      }
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getPostStats Controller"));
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

    const stats = await PostModel.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: {
            $sum: {
              $cond: [
                { $isArray: "$likes" },
                { $size: "$likes" },
                0
              ]
            }
          },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          totalBookmarks: {
            $sum: {
              $cond: [
                { $isArray: "$bookmarks" },
                { $size: "$bookmarks" },
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalPosts: 0,
      totalLikes: 0,
      totalBookmarks: 0,
      totalViews: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(new AppError(error.message, 500, "getUserEngagementStats Controller"));
  }
};


