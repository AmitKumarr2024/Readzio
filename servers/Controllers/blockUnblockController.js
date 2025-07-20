import { recordActivity } from "../helpers/activityHelper.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import mongoose from "mongoose";

// Blocks a user by adding them to the blockedUsers list
export const blockUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const blockedUserId = req.params.id; // from URL

    // Validates authenticated user
    if (!userId)
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "BlockUser",
        "User not authenticated"
      );

    // Validates blocked user ID
    if (!blockedUserId || !mongoose.Types.ObjectId.isValid(blockedUserId))
      throw new AppError(
        "Valid user ID to block is required",
        400,
        "BlockUser",
        "Invalid user ID"
      );

    // Prevents self-blocking
    if (blockedUserId === userId.toString())
      throw new AppError(
        "You cannot block yourself",
        400,
        "BlockUser",
        "Self-blocking not allowed"
      );

    const blockedUser = await UserModel.findById(blockedUserId);
    // Checks if user to block exists
    if (!blockedUser)
      throw new AppError(
        "User to block not found",
        404,
        "BlockUser",
        "User does not exist"
      );

    // Adds blocked user to the list
    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: blockedUserId },
    });

    // Logs blocking activity
    await recordActivity({
      userId: userId.toString(),
      action: "BLOCKED_USER",
      message: `Blocked user with ID ${blockedUserId}`,
    });

    res
      .status(200)
      .json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    // AppError with context for blocking issues
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "BlockUser", "Failed to block user")
    );
  }
};

// Unblocks a user by removing them from the blockedUsers list
export const unblockUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { blockedUserId } = req.body;

    // Validates authenticated user
    if (!userId)
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "UnblockUser",
        "User not authenticated"
      );

    // Validates unblocked user ID
    if (!blockedUserId || !mongoose.Types.ObjectId.isValid(blockedUserId))
      throw new AppError(
        "Valid user ID to unblock is required",
        400,
        "UnblockUser",
        "Invalid user ID"
      );

    const blockedUser = await UserModel.findById(blockedUserId);
    // Checks if user to unblock exists
    if (!blockedUser)
      throw new AppError(
        "User to unblock not found",
        404,
        "UnblockUser",
        "User does not exist"
      );

    // Removes user from blocked list
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: blockedUserId },
    });

    // Logs unblocking activity
    await recordActivity({
      userId: userId.toString(),
      action: "UNBLOCKED_USER",
      message: `Unblocked user with ID ${blockedUserId}`,
    });

    res
      .status(200)
      .json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    // AppError with context for unblocking issues
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "UnblockUser",
            "Failed to unblock user"
          )
    );
  }
};
