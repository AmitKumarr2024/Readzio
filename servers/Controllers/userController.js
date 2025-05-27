import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await UserModel.findById(userId).select("-password");
    if (!profile) {
      throw new AppError("User not found", 404, "GetProfile Controller");
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "GetProfile Controller"));
    }
    next(error);
  }
};

export const getAllUser = async (req, res, next) => {
  try {
    // Ensure request comes from an authenticated user
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized access", 401, "getAllUser Controller");
    }

    const otherUsers = await UserModel.find({ _id: { $ne: req.user._id } })
      .select("name email gender profilePic createdAt") // only expose necessary fields
      .lean(); // return plain JS objects (faster + safer for read-only)

    res.status(200).json({
      success: true,
      data: otherUsers,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "getAllUser Controller"));
    }
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError("Unauthorized", 401, "updateProfile Controller");
    }

    const disallowedFields = ["password", "roles", "_id"];
    const updateData = {};

    for (const key in req.body) {
      if (!disallowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        "No valid fields to update",
        400,
        "updateProfile Controller"
      );
    }

    const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password"); // select all but password

    // Emit real-time update event if needed
    const io = req.app.get("io");
    if (io) {
      io.to(userId.toString()).emit("profileUpdated", updatedUser);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "updateProfile Controller"));
    }
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError("Unauthorized", 401, "deleteUser Controller");
    }

    // Optionally, you can add checks like admin-only delete or user deleting own profile

    const deletedUser = await UserModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      throw new AppError("User not found", 404, "deleteUser Controller");
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "deleteUser Controller"));
    }
    next(error);
  }
};
