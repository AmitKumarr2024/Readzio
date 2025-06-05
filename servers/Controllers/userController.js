import mongoose from "mongoose";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { uploadToCloudinary } from "../Utils/uploadToCloudinary.js";
import { recordActivity } from "../helpers/activityHelper.js";
import ActivityModel from "../Models/ActivityModel.js";

// GET: Profile of logged-in user (excluding password)
export const getProfile = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError("Unauthorized - No user found", 401, "GetProfile");
    }

    const profile = await UserModel.findById(req.user._id).select("-password");
    if (!profile) throw new AppError("User not found", 404, "GetProfile");

    await recordActivity({
      userId: req.user._id,
      action: "LOGGED_IN", // Changed to match enum in ActivityModel
      message: "Viewed own profile",
    });

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetProfile")
    );
  }
};

// GET: All users except the logged-in one
export const getAllUser = async (req, res, next) => {
  try {
    const users = await UserModel.find()
      .select("name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate ")
      .lean();

    // No activity logging because no user context

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getAllUser")
    );
  }
};


// PATCH: Update user profile with optional avatar/banner upload
export const updateProfile = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError("Unauthorized - No user found", 401, "updateProfile");
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) throw new AppError("User not found", 404, "updateProfile");

    const updatableFields = [
      "name",
      "bio",
      "gender",
      "location",
      "profession",
      "email",
      "avatar",
      "banner",
      "blocked",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    if (req.files) {
      if (req.files.avatar?.[0]) {
        try {
          const uploadedAvatar = await uploadToCloudinary({
            buffer: req.files.avatar[0].buffer,
            folder: "blog/users/avatar",
          });
          user.avatar = uploadedAvatar.secure_url;
        } catch (err) {
          console.error("Avatar upload error:", err);
          throw new AppError("Failed to upload avatar", 500, "updateProfile");
        }
      }

      if (req.files.banner?.[0]) {
        try {
          const uploadedBanner = await uploadToCloudinary({
            buffer: req.files.banner[0].buffer,
            folder: "blog/users/banner",
          });
          user.banner = uploadedBanner.secure_url;
        } catch (err) {
          console.error("Banner upload error:", err);
          throw new AppError("Failed to upload banner", 500, "updateProfile");
        }
      }
    }

    await user.save();

    await recordActivity({
      userId: req.user._id,
      action: "UPDATED_PROFILE", // Matches enum in ActivityModel
      message: "Updated their profile",
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        banner: user.banner,
        bio: user.bio,
        gender: user.gender,
        location: user.location,
        profession: user.profession,
        role: user.role,
        blocked: user.blocked,
        googleId: user.googleId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        joiningDate: user.joiningDate,
        bookmarks: user.bookmarks,
        followers: user.followers,
        following: user.following,
        blockedUsers: user.blockedUsers,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "updateProfile")
    );
  }
};

// DELETE: Remove the currently logged-in user's account
export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new AppError("Unauthorized", 401, "deleteUser");

    const deleted = await UserModel.findByIdAndDelete(userId);
    if (!deleted) throw new AppError("User not found", 404, "deleteUser");

    await recordActivity({
      userId,
      action: "DELETED_ACCOUNT", // New enum value needed in ActivityModel
      message: "Deleted their account",
    });

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "deleteUser")
    );
  }
};

// GET: Get single user by ID (excluding sensitive fields)
export const getSingleUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log("[getSingleUserById] Requested user ID:", id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.warn("[getSingleUserById] Invalid user ID format:", id);
      throw new AppError("Invalid user ID", 400, "getSingleUserById");
    }

    const user = await UserModel.findById(id)
      .select("-password -googleId")
      .populate("subscribedAuthors", "name email avatar")
      .lean();

    if (!user) {
      console.warn("[getSingleUserById] No user found for ID:", id);
      throw new AppError("User not found", 404, "getSingleUserById");
    }

    console.log("[getSingleUserById] User fetched successfully:", user.name);

    // Defensive check before calling recordActivity
    if (req.user && req.user._id) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PROFILE", // New enum value needed in ActivityModel
        message: `Viewed profile of user ${id}`,
      });
    } else {
      console.warn(
        "[getSingleUserById] req.user is missing, skipping activity record"
      );
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("[getSingleUserById] Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getSingleUserById")
    );
  }
};

// NEW: GET user activity by user ID
export const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "getUserActivity");
    }

    // Fetch user with name
    const user = await UserModel.findById(userId).select("name").lean();
    
    if (!user) {
      throw new AppError("User not found", 404, "getUserActivity");
    }

    console.log("[DEBUG] User fetched:", { userId, name: user.name });

    // Fetch activity list
    const activityList = await ActivityModel.find({ user: userId })
      .sort({ createdAt: -1 }) // recent first
      .populate("targetPost", "title slug")
      .populate("targetComment", "text")
      .lean();

    // Record activity for viewing user activity (if authenticated)
    if (req.user && req.user._id) {
      const targetUserName = user.name || userId; // Fallback to userId if name is missing
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_ACTIVITY",
        message: `Viewed activity of user ${targetUserName}`,
      });
    }

    res.status(200).json({
      success: true,
      activity: activityList,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "getUserActivity")
    );
  }
};