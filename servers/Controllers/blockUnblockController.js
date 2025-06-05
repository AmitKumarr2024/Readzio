import { recordActivity } from "../helpers/activityHelper.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import mongoose from "mongoose"; // Added for ObjectId validation

export const blockUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const blockedUserId = req.params.id; // from URL

    if (!userId) {
      throw new AppError("Unauthorized - No user found", 401, "BlockUser Controller");
    }

    if (!blockedUserId || !mongoose.Types.ObjectId.isValid(blockedUserId)) {
      throw new AppError("Valid user ID to block is required", 400, "BlockUser Controller");
    }

    if (blockedUserId === userId.toString()) {
      throw new AppError("You cannot block yourself", 400, "BlockUser Controller");
    }

    const blockedUser = await UserModel.findById(blockedUserId);
    if (!blockedUser) {
      throw new AppError("User to block not found", 404, "BlockUser Controller");
    }

    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: blockedUserId },
    });

    // Record activity for blocking user
    await recordActivity({
      userId: userId.toString(),
      action: "BLOCKED_USER", // New enum value needed in ActivityModel
      message: `Blocked user with ID ${blockedUserId}`,
    });

    res.status(200).json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "BlockUser Controller")
    );
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { blockedUserId } = req.body;

    if (!userId) {
      throw new AppError("Unauthorized - No user found", 401, "UnblockUser Controller");
    }

    if (!blockedUserId || !mongoose.Types.ObjectId.isValid(blockedUserId)) {
      throw new AppError("Valid user ID to unblock is required", 400, "UnblockUser Controller");
    }

    const blockedUser = await UserModel.findById(blockedUserId);
    if (!blockedUser) {
      throw new AppError("User to unblock not found", 404, "UnblockUser Controller");
    }

    await UserModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: blockedUserId },
    });

    // Record activity for unblocking user
    await recordActivity({
      userId: userId.toString(),
      action: "UNBLOCKED_USER", // New enum value needed in ActivityModel
      message: `Unblocked user with ID ${blockedUserId}`,
    });

    res.status(200).json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "UnblockUser Controller")
    );
  }
};