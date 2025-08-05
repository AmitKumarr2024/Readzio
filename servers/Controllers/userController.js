import mongoose from "mongoose";
import cron from "node-cron";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { uploadToCloudinary } from "../../servers/Utils/uploadToCloudinary.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import ActivityModel from "../Models/ActivityModel.js";
import { io } from "../sockets/socket.js";
import UserLocation from "../Models/UserLocation.js";
import pLimit from "p-limit";
import NodeCache from "node-cache";
import { logMemory } from "../../servers/Utils/memoryLogger.js";

// Initialize cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Validates ObjectId
const validateObjectId = (id, type = "ID") => {
  logMemory(`🔍 Validating ${type}`);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid ${type}`,
      400,
      "ValidateObjectId",
      `Invalid ${type} provided`
    );
  }
};

// GET /api/user/ip-location
export const getIPLocation = async (req, res, next) => {
  try {
    logMemory("🌍 Start getIPLocation");
    if (!req.geoLocation) {
      throw new AppError(
        "Geolocation not available",
        400,
        "GetIPLocation",
        "No geoLocation data attached"
      );
    }

    logMemory("🌍 End getIPLocation");
    res.status(200).json({
      success: true,
      location: req.geoLocation,
    });
  } catch (error) {
    logMemory("❌ Error in getIPLocation");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to get IP location",
            500,
            "GetIPLocation",
            "Error in getIPLocation"
          )
    );
  }
};

// POST /api/user/track-ip-location
export const trackIPLocation = async (req, res, next) => {
  try {
    logMemory("📍 Start trackIPLocation");
    if (!req.geoLocation || !req.geoLocation.userId) {
      throw new AppError(
        "No authenticated user for tracking IP location",
        400,
        "TrackIPLocation",
        "Missing geoLocation userId"
      );
    }

    logMemory("💾 Before saving IP location");
    await UserLocation.create(req.geoLocation);
    logMemory("💾 After saving IP location");

    logMemory("📍 End trackIPLocation");
    res.status(204).end();
  } catch (error) {
    logMemory("❌ Error in trackIPLocation");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to track IP location",
            500,
            "TrackIPLocation",
            "Error in trackIPLocation"
          )
    );
  }
};

// Saves user location with validation and emits updates
export const saveUserLocation = async (req, res, next) => {
  try {
    logMemory("📍 Start saveUserLocation");
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
      throw new AppError(
        "Invalid or missing coordinates",
        400,
        "SaveUserLocation",
        "Coordinates must be valid non-zero numbers"
      );
    }

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(req.user._id)
      .select("followers")
      .lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "SaveUserLocation",
        "Authenticated user does not exist"
      );
    }

    const ip = req.geoLocation?.ip || req.ip || "";
    const geoData = UserLocation.resolveGeoLocation(longitude, latitude);

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

    logMemory("💾 Before deleting old locations");
    await UserLocation.deleteMany({ userId: req.user._id });
    logMemory("💾 Before saving new location");
    const location = await UserLocation.create(locationData);
    logMemory("💾 After saving new location");

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id,
      action: "SAVED_USER_LOCATION",
      message: `Saved location at ${locationData.city}, ${
        locationData.country
      } (State: ${locationData.state}, Pincode: ${locationData.pincode}) from ${
        req.geoLocation
          ? `${req.geoLocation.city}, ${req.geoLocation.country}`
          : "unknown location"
      }`,
    });
    logMemory("📝 After recording activity");

    const socketLocationData = {
      userId: req.user._id.toString(),
      coordinates: { lat: latitude, lon: longitude },
      city: locationData.city,
      country: locationData.country,
      state: locationData.state,
      pincode: locationData.pincode,
      timestamp: location.timestamp.getTime(),
    };

    logMemory("📡 Before emitting location update");
    io.to("adminRoom").emit("userLocationUpdate", socketLocationData);
    user.followers.forEach((followerId) => {
      io.to(followerId.toString()).emit(
        "userLocationUpdate",
        socketLocationData
      );
    });
    logMemory("📡 After emitting location update");

    logMemory("📍 End saveUserLocation");
    res.status(201).json({
      success: true,
      message: "Location saved successfully",
      location: socketLocationData,
    });
  } catch (error) {
    logMemory("❌ Error in saveUserLocation");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to save user location",
            500,
            "SaveUserLocation",
            "Error in saveUserLocation"
          )
    );
  }
};

// Retrieves paginated user locations with user details
export const getAllUserLocations = async (req, res, next) => {
  try {
    logMemory("📍 Start getAllUserLocations");
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = "userLocations:total";
    let totalCount = cache.get(cacheKey);

    logMemory("📊 Before checking cache for total locations");
    if (!totalCount) {
      totalCount = (await UserLocation.distinct("userId")).length;
      cache.set(cacheKey, totalCount);
    }
    logMemory("📊 After checking cache for total locations");

    const locations = [];
    logMemory("📖 Before fetching user locations");
    const cursor = UserLocation.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $sort: { timestamp: -1 } },
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
      { $skip: skip },
      { $limit: limitNum },
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
    ]).cursor();

    for await (const loc of cursor) {
      logMemory(`📄 Processing location for user ${loc.userId}`);
      locations.push({
        userId: loc.userId.toString(),
        coordinates:
          !loc.coordinates ||
          !Array.isArray(loc.coordinates.coordinates) ||
          loc.coordinates.coordinates.length < 2
            ? null
            : {
                lat: loc.coordinates.coordinates[1],
                lon: loc.coordinates.coordinates[0],
              },
        city: loc.city || "Unknown",
        country: loc.country || "Unknown",
        state: loc.state || "Unknown",
        pincode: loc.pincode || "Unknown",
        timestamp: loc.timestamp,
        name: loc.name || "Unknown",
      });
    }
    logMemory("📖 After fetching user locations");

    logMemory("📍 End getAllUserLocations");
    res.status(200).json({
      success: true,
      locations,
      page: pageNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    logMemory("❌ Error in getAllUserLocations");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch user locations",
            500,
            "GetAllUserLocations",
            "Error in getAllUserLocations"
          )
    );
  }
};

// Retrieves authenticated user's profile
export const getProfile = async (req, res, next) => {
  try {
    logMemory("👤 Start getProfile");
    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "GetProfile",
        "User not authenticated"
      );
    }

    logMemory("📖 Before fetching profile");
    const profile = await UserModel.findById(req.user._id)
      .select("-password")
      .lean();
    logMemory("📖 After fetching profile");
    if (!profile) {
      throw new AppError(
        "User not found",
        404,
        "GetProfile",
        "Authenticated user does not exist"
      );
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id,
      action: "LOGGED_IN",
      message: "Viewed own profile",
    });
    logMemory("📝 After recording activity");

    logMemory("👤 End getProfile");
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    logMemory("❌ Error in getProfile");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch profile",
            500,
            "GetProfile",
            "Error in getProfile"
          )
    );
  }
};

// Retrieves paginated list of all users
export const getAllUser = async (req, res, next) => {
  try {
    logMemory("👥 Start getAllUser");
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const projection =
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate";

    const cacheKey = "users:total";
    let totalUsers = cache.get(cacheKey);

    logMemory("📊 Before checking cache for total users");
    if (!totalUsers) {
      totalUsers = await UserModel.countDocuments().lean();
      cache.set(cacheKey, totalUsers);
    }
    logMemory("📊 After checking cache for total users");

    const users = [];
    logMemory("📖 Before fetching users");
    const cursor = UserModel.find()
      .select(projection)
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    for await (const user of cursor) {
      logMemory(`📄 Processing user ${user._id}`);
      users.push(user);
    }
    logMemory("📖 After fetching users");

    logMemory("👥 End getAllUser");
    res.status(200).json({
      success: true,
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    logMemory("❌ Error in getAllUser");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch users",
            500,
            "GetAllUser",
            "Error in getAllUser"
          )
    );
  }
};

// Updates user profile with avatar and banner compression
export const updateProfile = async (req, res, next) => {
  try {
    logMemory("✏️ Start updateProfile");
    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "UpdateProfile",
        "User not authenticated"
      );
    }

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(req.user._id)
      .select(
        "name email avatar banner bio gender location profession role blocked followers googleId createdAt updatedAt joiningDate bookmarks blockedUsers"
      )
      .lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "UpdateProfile",
        "Authenticated user does not exist"
      );
    }

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
    const updates = {};

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.files) {
      const limit = pLimit(1); // Process one file at a time
      if (req.files.avatar?.[0]) {
        logMemory("📤 Before uploading avatar");
        const uploadedAvatar = await limit(() =>
          uploadToCloudinary({
            buffer: req.files.avatar[0].buffer,
            folder: "blog/users/avatar",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto:good", fetch_format: "auto" },
            ],
          })
        );
        updates.avatar = uploadedAvatar.secure_url;
        logMemory("📤 After uploading avatar");
      }

      if (req.files.banner?.[0]) {
        logMemory("📤 Before uploading banner");
        const uploadedBanner = await limit(() =>
          uploadToCloudinary({
            buffer: req.files.banner[0].buffer,
            folder: "blog/users/banner",
            transformation: [
              { width: 1200, height: 400, crop: "limit" },
              { quality: "auto:good", fetch_format: "auto" },
            ],
          })
        );
        updates.banner = uploadedBanner.secure_url;
        logMemory("📤 After uploading banner");
      }
    }

    logMemory("💾 Before updating profile");
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      updates,
      {
        new: true,
        select:
          updatableFields.join(" ") +
          " followers googleId createdAt updatedAt joiningDate bookmarks blockedUsers",
      }
    ).lean();
    logMemory("💾 After updating profile");

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId: req.user._id,
      action: "UPDATED_PROFILE",
      message: "Updated their profile",
    });
    logMemory("📝 After recording activity");

    const profileUpdateData = {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      banner: updatedUser.banner,
      bio: updatedUser.bio,
      gender: updatedUser.gender,
      location: updatedUser.location,
      profession: updatedUser.profession,
      role: updatedUser.role,
      blocked: updatedUser.blocked,
    };

    logMemory("📡 Before emitting profile update");
    io.to("adminRoom").emit("userProfileUpdate", profileUpdateData);
    updatedUser.followers.forEach((followerId) => {
      io.to(followerId.toString()).emit("userProfileUpdate", profileUpdateData);
    });
    logMemory("📡 After emitting profile update");

    logMemory("✏️ End updateProfile");
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    logMemory("❌ Error in updateProfile");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to update profile",
            500,
            "UpdateProfile",
            "Error in updateProfile"
          )
    );
  }
};

// Deletes authenticated user's account
export const deleteUser = async (req, res, next) => {
  try {
    logMemory("🗑️ Start deleteUser");
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "DeleteUser",
        "User not authenticated"
      );
    }

    logMemory("💾 Before deleting user");
    const deleted = await UserModel.findByIdAndDelete(userId).lean();
    logMemory("💾 After deleting user");
    if (!deleted) {
      throw new AppError(
        "User not found",
        404,
        "DeleteUser",
        "Authenticated user does not exist"
      );
    }

    logMemory("📝 Before recording activity");
    await recordActivity({
      userId,
      action: "DELETED_ACCOUNT",
      message: "Deleted their account",
    });
    logMemory("📝 After recording activity");

    logMemory("📡 Before emitting user deleted");
    io.to("adminRoom").emit("userDeleted", { userId });
    logMemory("📡 After emitting user deleted");

    logMemory("🗑️ End deleteUser");
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    logMemory("❌ Error in deleteUser");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to delete user",
            500,
            "DeleteUser",
            "Error in deleteUser"
          )
    );
  }
};

// Retrieves a single user by ID
export const getSingleUserById = async (req, res, next) => {
  try {
    logMemory("👤 Start getSingleUserById");
    const { id } = req.params;
    validateObjectId(id, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(id)
      .select("-password -googleId")
      .populate("subscribedAuthors", "name email avatar")
      .lean();
    logMemory("📖 After fetching user");

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "GetSingleUserById",
        "User does not exist"
      );
    }

    if (req.user && req.user._id) {
      logMemory("📝 Before recording activity");
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PROFILE",
        message: `Viewed profile of user ${id}`,
      });
      logMemory("📝 After recording activity");
    }

    logMemory("👤 End getSingleUserById");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logMemory("❌ Error in getSingleUserById");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch user",
            500,
            "GetSingleUserById",
            "Error in getSingleUserById"
          )
    );
  }
};

// Retrieves user activity history
export const getUserActivity = async (req, res, next) => {
  try {
    logMemory("📜 Start getUserActivity");
    const userId = req.params.id;
    validateObjectId(userId, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).select("name").lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "GetUserActivity",
        "User does not exist"
      );
    }

    const activityList = [];
    logMemory("📖 Before fetching activities");
    const cursor = ActivityModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("targetPost", "title slug")
      .populate("targetComment", "text")
      .lean()
      .cursor();

    for await (const activity of cursor) {
      logMemory(`📄 Processing activity ${activity._id}`);
      activityList.push(activity);
    }
    logMemory("📖 After fetching activities");

    if (req.user && req.user._id) {
      const targetUserName = user.name || userId;
      logMemory("📝 Before recording activity");
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_ACTIVITY",
        message: `Viewed activity of user ${targetUserName}`,
      });
      logMemory("📝 After recording activity");
    }

    logMemory("📜 End getUserActivity");
    res.status(200).json({
      success: true,
      activity: activityList,
    });
  } catch (error) {
    logMemory("❌ Error in getUserActivity");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch user activity",
            500,
            "GetUserActivity",
            "Error in getUserActivity"
          )
    );
  }
};

// Clears activity history for the authenticated user
export const clearUserActivity = async (req, res, next) => {
  try {
    logMemory("🗑️ Start clearUserActivity");
    const userId = req.user._id;

    logMemory("💾 Before clearing activities");
    await ActivityModel.deleteMany({ user: userId }).lean();
    logMemory("💾 After clearing activities");

    logMemory("🗑️ End clearUserActivity");
    res.status(200).json({
      success: true,
      message: "Activity history cleared",
    });
  } catch (error) {
    logMemory("❌ Error in clearUserActivity");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to clear user activity",
            500,
            "ClearUserActivity",
            "Error in clearUserActivity"
          )
    );
  }
};

// Clears old activity records older than one day
export const clearOldActivity = async (req, res, next) => {
  try {
    logMemory("🧹 Start clearOldActivity");
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const batchSize = 1000;
    let deletedCount = 0;

    logMemory("📖 Before fetching old activities");
    const cursor = ActivityModel.find({ createdAt: { $lt: oneDayAgo } })
      .lean()
      .cursor();

    let batch = [];
    for await (const doc of cursor) {
      logMemory(`📄 Processing activity ${doc._id} for deletion`);
      batch.push(doc._id);
      if (batch.length >= batchSize) {
        logMemory("💾 Before batch deletion");
        await ActivityModel.deleteMany({ _id: { $in: batch } }).lean();
        deletedCount += batch.length;
        batch = [];
        logMemory("💾 After batch deletion");
      }
    }

    if (batch.length > 0) {
      logMemory("💾 Before final batch deletion");
      await ActivityModel.deleteMany({ _id: { $in: batch } }).lean();
      deletedCount += batch.length;
      logMemory("💾 After final batch deletion");
    }

    const message = `Cleared ${deletedCount} old activity records`;

    logMemory("🧹 End clearOldActivity");
    if (res) {
      res.status(200).json({ success: true, message });
    }
  } catch (error) {
    logMemory("❌ Error in clearOldActivity");
    if (next) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to clear old activity",
              500,
              "ClearOldActivity",
              "Error in clearOldActivity"
            )
      );
    }
  }
};

// Saves user cookie consent
export const saveUserCookieConsent = async (req, res, next) => {
  try {
    logMemory("🍪 Start saveUserCookieConsent");
    const { consent } = req.body;
    const userId = req.user?._id;

    if (typeof consent !== "boolean") {
      throw new AppError(
        "Invalid consent value",
        400,
        "SaveUserCookieConsent",
        "Consent must be a boolean"
      );
    }

    if (userId) {
      logMemory("💾 Before updating cookie consent");
      await UserModel.findByIdAndUpdate(
        userId,
        { cookieConsent: consent },
        { lean: true }
      );
      logMemory("💾 After updating cookie consent");
    }

    logMemory("🍪 Before setting cookie");
    res.cookie("user_cookie_consent", String(consent), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    logMemory("🍪 After setting cookie");

    logMemory("🍪 End saveUserCookieConsent");
    res.status(200).json({
      success: true,
      message: `Consent ${consent ? "accepted" : "declined"}`,
    });
  } catch (error) {
    logMemory("❌ Error in saveUserCookieConsent");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to save cookie consent",
            500,
            "SaveUserCookieConsent",
            "Error in saveUserCookieConsent"
          )
    );
  }
};

// POST /api/user/feedback/trigger/:userId (Admin only)
export const adminSendFeedbackPrompt = async (req, res, next) => {
  try {
    logMemory("📬 Start adminSendFeedbackPrompt");
    if (!req.user?.isAdmin) {
      throw new AppError(
        "Only admins can trigger feedback prompts",
        403,
        "AdminSendFeedbackPrompt"
      );
    }

    const { userId } = req.params;
    validateObjectId(userId, "User ID");

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId)
      .select("name feedbackPrompt")
      .lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError("User not found", 404, "AdminSendFeedbackPrompt");
    }

    logMemory("💾 Before updating feedback prompt");
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        feedbackPrompt: { shown: true, shownAt: new Date(), responded: false },
      },
      { new: true, select: "name feedbackPrompt" }
    ).lean();
    logMemory("💾 After updating feedback prompt");

    logMemory("📡 Before emitting feedback prompt");
    io.to(userId).emit("showFeedbackPrompt", {
      message: "📬 We'd love your feedback. How are we doing?",
      fromAdmin: true,
    });
    logMemory("📡 After emitting feedback prompt");

    logMemory("📬 End adminSendFeedbackPrompt");
    res.status(200).json({
      success: true,
      message: `Feedback prompt sent to ${updatedUser.name}`,
    });
  } catch (error) {
    logMemory("❌ Error in adminSendFeedbackPrompt");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to send feedback prompt",
            500,
            "AdminSendFeedbackPrompt"
          )
    );
  }
};

// Checks if feedback prompt should be shown
export const shouldShowFeedbackPrompt = async (req, res, next) => {
  try {
    logMemory("📬 Start shouldShowFeedbackPrompt");
    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(req.user._id)
      .select("joiningDate feedbackPrompt")
      .lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError("User not found", 404, "ShouldShowFeedbackPrompt");
    }

    const accountAgeInDays = Math.floor(
      (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24)
    );
    const shouldShow =
      accountAgeInDays >= 7 &&
      (!user.feedbackPrompt ||
        (!user.feedbackPrompt.shown && !user.feedbackPrompt.responded));

    if (shouldShow) {
      logMemory("💾 Before updating feedback prompt");
      await UserModel.findByIdAndUpdate(
        req.user._id,
        {
          feedbackPrompt: {
            shown: true,
            shownAt: new Date(),
            responded: false,
          },
        },
        { lean: true }
      );
      logMemory("💾 After updating feedback prompt");
    }

    logMemory("📬 End shouldShowFeedbackPrompt");
    res.status(200).json({
      success: true,
      showFeedback: shouldShow,
    });
  } catch (error) {
    logMemory("❌ Error in shouldShowFeedbackPrompt");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to check feedback prompt",
            500,
            "ShouldShowFeedbackPrompt"
          )
    );
  }
};

// Submits user feedback
export const submitFeedback = async (req, res, next) => {
  try {
    logMemory("📬 Start submitFeedback");
    const { rating, message } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError(
        "Invalid rating (1-5 required)",
        400,
        "SubmitFeedback"
      );
    }

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(req.user._id)
      .select("feedbackPrompt")
      .lean();
    logMemory("📖 After fetching user");
    if (!user) {
      throw new AppError("User not found", 404, "SubmitFeedback");
    }

    logMemory("💾 Before updating feedback");
    await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        feedbackPrompt: {
          ...user.feedbackPrompt,
          responded: true,
          rating,
          message,
        },
      },
      { lean: true }
    );
    logMemory("💾 After updating feedback");

    logMemory("📬 End submitFeedback");
    res.status(200).json({ success: true, message: "Feedback submitted" });
  } catch (error) {
    logMemory("❌ Error in submitFeedback");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to submit feedback",
            500,
            "SubmitFeedback"
          )
    );
  }
};

// GET /api/user/feedback/all (Admin only)
export const getAllFeedbacks = async (req, res, next) => {
  try {
    logMemory("📬 Start getAllFeedbacks");
    if (!req.user?.isAdmin) {
      throw new AppError("Access denied: Admins only", 403, "GetAllFeedbacks");
    }

    const feedbacks = [];
    logMemory("📖 Before fetching feedbacks");
    const cursor = UserModel.find({ "feedbackPrompt.responded": true })
      .select(
        "name email avatar feedbackPrompt.createdAt feedbackPrompt.rating feedbackPrompt.message feedbackPrompt.shown feedbackPrompt.shownAt feedbackPrompt.responded"
      )
      .sort({ "feedbackPrompt.shownAt": -1 })
      .lean()
      .cursor();

    for await (const user of cursor) {
      logMemory(`📄 Processing feedback for user ${user._id}`);
      feedbacks.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        rating: user.feedbackPrompt?.rating,
        message: user.feedbackPrompt?.message,
        shown: user.feedbackPrompt?.shown,
        responded: user.feedbackPrompt?.responded,
        submittedAt: user.feedbackPrompt?.shownAt,
      });
    }
    logMemory("📖 After fetching feedbacks");

    logMemory("📬 End getAllFeedbacks");
    res.status(200).json({
      success: true,
      total: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    logMemory("❌ Error in getAllFeedbacks");
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch feedback",
            500,
            "GetAllFeedbacks",
            "Error in getAllFeedbacks"
          )
    );
  }
};

// Schedules daily cleanup of old activity records
cron.schedule(
  "0 0 * * *",
  () => {
    logMemory("🧹 Scheduled clearOldActivity");
    clearOldActivity(null, null, null);
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
