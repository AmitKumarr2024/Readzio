import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";

export const blockUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const blockedUserId = req.params.id; // 👈 from URL instead of body

    if (!blockedUserId) {
      throw new AppError("User ID to block is required", 400);
    }

    if (blockedUserId === userId.toString()) {
      throw new AppError("You cannot block yourself", 400);
    }

    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: blockedUserId },
    });

    res.status(200).json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};


export const unblockUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.body;

    if (!blockedUserId) {
      throw new AppError("User ID to unblock is required", 400);
    }

    await UserModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: blockedUserId },
    });

    res.status(200).json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};
