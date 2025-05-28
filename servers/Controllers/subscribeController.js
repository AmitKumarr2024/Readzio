import SubscribeModel from "../Models/SubscribeModel.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";

// Toggle follow/unfollow a user
export const toggleFollowUser = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { followUserId } = req.params;

    // Optional: prevent self-follow if needed
    // if (userId === followUserId) {
    //   return next(new AppError("Cannot follow yourself", 400, "toggleFollowUser Controller"));
    // }

    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404, "toggleFollowUser Controller");

    const existingSub = await SubscribeModel.findOne({
      subscriber: userId,
      subscribedToUser: followUserId,
    });

    if (existingSub) {
      await SubscribeModel.findByIdAndDelete(existingSub._id);
    } else {
      await SubscribeModel.create({
        subscriber: userId,
        subscribedToUser: followUserId,
      });
    }

    const followingCount = await SubscribeModel.countDocuments({
      subscriber: userId,
      subscribedToUser: { $ne: null },
    });

    res.status(200).json({
      success: true,
      followingCount,
      following: !existingSub,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "toggleFollowUser Controller"));
  }
};

// Toggle subscribe/unsubscribe a category
export const toggleSubscribeCategory = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { category } = req.params;

    if (!category) {
      return next(new AppError("Category is required", 400, "toggleSubscribeCategory Controller"));
    }

    const existingSub = await SubscribeModel.findOne({
      subscriber: userId,
      subscribedToCategory: category,
    });

    if (existingSub) {
      await SubscribeModel.findByIdAndDelete(existingSub._id);
    } else {
      await SubscribeModel.create({
        subscriber: userId,
        subscribedToCategory: category,
      });
    }

    const subscribedCategoryCount = await SubscribeModel.countDocuments({
      subscriber: userId,
      subscribedToCategory: { $ne: null },
    });

    res.status(200).json({
      success: true,
      subscribedCategoryCount,
      subscribed: !existingSub,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "toggleSubscribeCategory Controller"));
  }
};

// Get list of users who follow the current user (followers)
export const getFollowersList = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    // Find all Subscribe documents where subscribedToUser = userId
    const followers = await SubscribeModel.find({ subscribedToUser: userId })
      .populate("subscriber", "username email profilePicture") // Select fields you want to expose
      .lean();

    res.status(200).json({
      success: true,
      count: followers.length,
      followers: followers.map(f => f.subscriber),
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getFollowersList Controller"));
  }
};

// Get list of users that current user is following
export const getFollowingList = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    // Find all Subscribe documents where subscriber = userId and subscribedToUser exists
    const following = await SubscribeModel.find({ subscriber: userId, subscribedToUser: { $ne: null } })
      .populate("subscribedToUser", "username email profilePicture")
      .lean();

    res.status(200).json({
      success: true,
      count: following.length,
      following: following.map(f => f.subscribedToUser),
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getFollowingList Controller"));
  }
};

// Check if current user follows another user
export const checkFollowingStatus = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { otherUserId } = req.params;

    const existingSub = await SubscribeModel.findOne({
      subscriber: userId,
      subscribedToUser: otherUserId,
    });

    res.status(200).json({
      success: true,
      following: !!existingSub,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "checkFollowingStatus Controller"));
  }
};
