import PostModel from '../Models/Post.js';
import UserModel from '../Models/User.js';
import { AppError } from '../utils/AppError.js';

/**
 * @desc Get posts from user's subscribed categories
 */
export const getSubscribedPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId);

    if (!user) throw new AppError("User not found", 404, "getSubscribedPosts Controller");

    const subscribedCategories = user.subscribedCategories || [];

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await PostModel.find({ category: { $in: subscribedCategories } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name");

    const total = await PostModel.countDocuments({ category: { $in: subscribedCategories } });

    res.status(200).json({
      success: true,
      total,
      page,
      posts,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getSubscribedPosts Controller"));
  }
};
