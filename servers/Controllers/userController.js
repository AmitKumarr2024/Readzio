import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { uploadToCloudinary } from "../Utils/uploadToCloudinary.js"; // Cloudinary helper

// Get logged-in user profile (without password)
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

// Get all other users except the logged-in user
export const getAllUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError("Unauthorized access", 401, "getAllUser Controller");
    }

    const otherUsers = await UserModel.find({ _id: { $ne: req.user._id } })
      .select("name email gender avatar createdAt") // only expose necessary fields
      .lean();

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

// Update user profile with optional avatar upload
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError("Unauthorized", 401, "updateProfile Controller");
    }

    const disallowedFields = ["password", "roles", "_id"];
    const updateData = {};

    // Copy allowed fields from req.body
    for (const key in req.body) {
      if (!disallowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    // Handle avatar image upload if provided

    if (req.file) {
      // Upload file buffer from multer middleware
      const result = await uploadToCloudinary({ buffer: req.file.buffer, folder: "users/profilePics" });
      updateData.avatar = result.secure_url;
    } else if (req.body.avatar && req.body.avatar.startsWith("data:image")) {
      // Upload base64 image string
      const result = await uploadToCloudinary({ base64: req.body.avatar, folder: "users/profilePics" });
      updateData.avatar = result.secure_url;
    } else if (typeof req.body.avatar === "string" && req.body.avatar.trim() !== "") {
      // Use avatar URL string directly
      updateData.avatar = req.body.avatar;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError("No valid fields to update", 400, "updateProfile Controller");
    }

    // Update user in DB and exclude password from response
    const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    // Emit realtime profile update event if socket.io present
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

// Delete logged-in user account
export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError("Unauthorized", 401, "deleteUser Controller");
    }

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
