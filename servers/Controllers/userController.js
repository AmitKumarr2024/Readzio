import mongoose from "mongoose";
import cron from "node-cron";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { uploadToCloudinary } from "../Utils/uploadToCloudinary.js";
import { recordActivity } from "../helpers/activityHelper.js";
import ActivityModel from "../Models/ActivityModel.js";
import { io } from "../sockets/socket.js";
import UserLocation from "../Models/UserLocation.js";

export const saveUserLocation = async (req, res, next) => {
  try {
    const { coordinates, city, country } = req.body;
    const latitude = coordinates?.lat;
    const longitude = coordinates?.lon;

    if (
      !latitude ||
      !longitude ||
      latitude === 0 ||
      longitude === 0 ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      throw new AppError("Invalid or missing coordinates", 400, "SaveUserLocation");
    }

    const ip = req.geoLocation?.ip || req.ip || "";
    const user = await UserModel.findById(req.user._id).select("followers");
    if (!user) throw new AppError("User not found", 404, "SaveUserLocation");

    const geoData = UserLocation.resolveGeoLocation(longitude, latitude);
    console.log("[saveUserLocation] GeoJSON resolution for coordinates [", longitude, ",", latitude, "]:", geoData);

    const locationData = {
      userId: req.user._id,
      coordinates: { type: "Point", coordinates: [longitude, latitude] },
      city: city || "Unknown",
      country: geoData.country || country || "Unknown",
      state: geoData.state || "Unknown",
      pincode: geoData.pincode || "Unknown",
      ip,
      timestamp: new Date(),
    };

    await UserLocation.deleteMany({ userId: req.user._id });
    const location = await UserLocation.create(locationData);

    await recordActivity({
      userId: req.user._id,
      action: "SAVED_USER_LOCATION",
      message: `Saved location at ${locationData.city}, ${locationData.country} (State: ${locationData.state}, Pincode: ${locationData.pincode}) from ${req.geoLocation ? `${req.geoLocation.city}, ${req.geoLocation.country}` : "unknown location"}`,
    });

    const socketLocationData = {
      userId: req.user._id.toString(),
      coordinates: { lat: latitude, lon: longitude },
      city: locationData.city,
      country: locationData.country,
      state: locationData.state,
      pincode: locationData.pincode,
      timestamp: location.timestamp.getTime(),
    };

    io.to("adminRoom").emit("userLocationUpdate", socketLocationData);
    user.followers.forEach((followerId) => {
      io.to(followerId.toString()).emit("userLocationUpdate", socketLocationData);
    });

    res.status(201).json({
      success: true,
      message: "Location saved successfully",
      location: socketLocationData,
    });
  } catch (error) {
    console.error("[saveUserLocation] Error:", error.message);
    next(error instanceof AppError ? error : new AppError(error.message, 500, "SaveUserLocation"));
  }
};

export const getAllUserLocations = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const locations = await UserLocation.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$userId",
          userId: { $first: "$userId" },
          coordinates: { $first: "$coordinates" },
          city: { $first: "$city" },
          country: { $first: "$country" },
          state: { $first: "$state" },
          pincode: { $first: "$pincode" },
          timestamp: { $first: "$timestamp" },
          name: { $first: "$user.name" },
        },
      },
      {
        $project: {
          userId: 1,
          coordinates: 1,
          city: 1,
          country: 1,
          state: 1,
          pincode: 1,
          timestamp: 1,
          name: 1,
        },
      },
      {
        $skip: (pageNum - 1) * limitNum,
      },
      {
        $limit: limitNum,
      },
    ]);

    const total = await UserLocation.aggregate([
      {
        $group: {
          _id: "$userId",
        },
      },
      {
        $count: "total",
      },
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    const validLocations = locations.map((loc) => {
      if (
        !loc.coordinates ||
        !Array.isArray(loc.coordinates.coordinates) ||
        loc.coordinates.coordinates.length < 2
      ) {
        console.warn("[getAllUserLocations] No valid coordinates for userId:", loc.userId);
        return {
          userId: loc.userId.toString(),
          coordinates: null,
          city: loc.city || "Unknown",
          country: loc.country || "Unknown",
          state: loc.state || "Unknown",
          pincode: loc.pincode || "Unknown",
          timestamp: loc.timestamp,
          name: loc.name || "Unknown",
        };
      }
      return {
        userId: loc.userId.toString(),
        coordinates: {
          lat: loc.coordinates.coordinates[1],
          lon: loc.coordinates.coordinates[0],
        },
        city: loc.city || "Unknown",
        country: loc.country || "Unknown",
        state: loc.state || "Unknown",
        pincode: loc.pincode || "Unknown",
        timestamp: loc.timestamp,
        name: loc.name || "Unknown",
      };
    });

    res.status(200).json({
      success: true,
      locations: validLocations,
      page: pageNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error("[getAllUserLocations] Error:", error.message);
    next(error instanceof AppError ? error : new AppError(error.message, 500, "GetAllUserLocations"));
  }
};

export const getProfile = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError("Unauthorized - No user found", 401, "GetProfile");
    }

    const profile = await UserModel.findById(req.user._id).select("-password");
    if (!profile) throw new AppError("User not found", 404, "GetProfile");

    await recordActivity({
      userId: req.user._id,
      action: "LOGGED_IN",
      message: "Viewed own profile",
    });

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "GetProfile"));
  }
};

export const getAllUser = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const projection =
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate";

    const [users, totalUsers] = await Promise.all([
      UserModel.find().select(projection).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getAllUsers"));
  }
};

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
            transformation: [{ width: 800, height: 800, crop: "limit", quality: 70 }],
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
            transformation: [{ width: 1200, height: 400, crop: "limit", quality: 70 }],
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
      action: "UPDATED_PROFILE",
      message: "Updated their profile",
    });

    io.to("adminRoom").emit("userProfileUpdate", {
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
    });

    user.followers.forEach((followerId) => {
      io.to(followerId.toString()).emit("userProfileUpdate", {
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
      });
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
    next(error instanceof AppError ? error : new AppError(error.message, 500, "updateProfile"));
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new AppError("Unauthorized", 401, "deleteUser");

    const deleted = await UserModel.findByIdAndDelete(userId);
    if (!deleted) throw new AppError("User not found", 404, "deleteUser");

    await recordActivity({
      userId,
      action: "DELETED_ACCOUNT",
      message: "Deleted their account",
    });

    io.to("adminRoom").emit("userDeleted", { userId });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500, "deleteUser"));
  }
};

export const getSingleUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400, "getSingleUserById");
    }

    const user = await UserModel.findById(id)
      .select("-password -googleId")
      .populate("subscribedAuthors", "name email avatar")
      .lean();

    if (!user) {
      throw new AppError("User not found", 404, "getSingleUserById");
    }

    if (req.user && req.user._id) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PROFILE",
        message: `Viewed profile of user ${id}`,
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("[getSingleUserById] Error:", error.message);
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getSingleUserById"));
  }
};

export const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "getUserActivity");
    }

    const user = await UserModel.findById(userId).select("name").lean();

    if (!user) {
      throw new AppError("User not found", 404, "getUserActivity");
    }

    const activityList = await ActivityModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("targetPost", "title slug")
      .populate("targetComment", "text")
      .lean();

    if (req.user && req.user._id) {
      const targetUserName = user.name || userId;
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
    next(error instanceof AppError ? error : new AppError(error.message, 500, "getUserActivity"));
  }
};

export const clearUserActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await ActivityModel.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: "Activity history cleared",
    });
  } catch (error) {
    next(new AppError(error.message, 500, "clearUserActivity"));
  }
};

export const clearOldActivity = async (req, res, next) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const result = await ActivityModel.deleteMany({
      createdAt: { $lt: oneDayAgo },
    });

    const message = `Cleared ${result.deletedCount} old activity records`;

    if (res) {
      res.status(200).json({
        success: true,
        message,
      });
    }
  } catch (error) {
    console.error("Error clearing old activity:", error.message);
    if (next) {
      next(new AppError(error.message, 500, "clearOldActivity"));
    }
  }
};

cron.schedule("0 0 * * *", clearOldActivity, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});