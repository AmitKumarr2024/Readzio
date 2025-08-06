import mongoose from "mongoose";
import cron from "node-cron";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { uploadToCloudinary } from "../../servers/Utils/uploadToCloudinary.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import ActivityModel from "../Models/ActivityModel.js";
import { io } from "../sockets/socket.js";
import UserLocation from "../Models/UserLocation.js";

// GET /api/user/ip-location
export const getIPLocation = async (req, res, next) => {
  try {
    if (!req.geoLocation) {
      throw new AppError(
        "Geolocation not available",
        400,
        "GetIPLocation",
        "No geoLocation data attached"
      );
    }

    res.status(200).json({
      success: true,
      location: req.geoLocation,
    });
  } catch (error) {
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
    if (!req?.geoLocation || !req?.geoLocation?.userId) {
      throw new AppError(
        "No authenticated user for tracking IP location",
        400,
        "TrackIPLocation",
        "Missing geoLocation userId"
      );
    }

    const savedLocation = await UserLocation.create(req.geoLocation);

    // ✅ Return the saved location
    res.status(200).json({ location: savedLocation });
  } catch (error) {
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
    const { coordinates, city, country } = req.body;
    const latitude = coordinates?.lat;
    const longitude = coordinates?.lon;

    // ✅ Validate coordinates
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

    // ✅ Validate user
    const user = await UserModel.findById(req.user._id).select("followers");
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "SaveUserLocation",
        "Authenticated user does not exist"
      );
    }

    const geo = req.geoLocation || {};
    const ip = geo.ip || req.ip || "";

    // ✅ Construct clean and correct location data
    const locationData = {
      userId: req.user._id,
      coordinates: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      city: geo.city || city || "Unknown",
      country: geo.country || country || "Unknown",
      state: geo.state || "Unknown",
      pincode: geo.pincode || "Unknown",
      ip,
      timestamp: new Date(),
    };

    console.log("[saveUserLocation] Final locationData:", locationData);

    // Replace existing location for the user
    await UserLocation.deleteMany({ userId: req.user._id });
    const location = await UserLocation.create(locationData);

    // ✅ Log user activity
    await recordActivity({
      userId: req.user._id,
      action: "SAVED_USER_LOCATION",
      message: `Saved location at ${locationData.city}, ${locationData.country} (State: ${locationData.state}, Pincode: ${locationData.pincode}) from IP ${ip}`,
    });

    // ✅ Emit to socket rooms (admin + followers)
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
      io.to(followerId.toString()).emit(
        "userLocationUpdate",
        socketLocationData
      );
    });

    res.status(201).json({
      success: true,
      message: "Location saved successfully",
      location: socketLocationData,
    });
  } catch (error) {
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
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);

    // Aggregates latest locations per user
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

    // Counts total unique user locations
    const total = await UserLocation.aggregate([
      { $group: { _id: "$userId" } },
      { $count: "total" },
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    // Formats location data, handling invalid coordinates
    const validLocations = locations.map((loc) => {
      if (
        !loc.coordinates ||
        !Array.isArray(loc.coordinates.coordinates) ||
        loc.coordinates.coordinates.length < 2
      ) {
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
    // AppError with context for fetching user locations
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
    // Validates authentication
    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "GetProfile",
        "User not authenticated"
      );
    }

    // Fetches user profile
    const profile = await UserModel.findById(req.user._id).select("-password");
    if (!profile) {
      throw new AppError(
        "User not found",
        404,
        "GetProfile",
        "Authenticated user does not exist"
      );
    }

    // Logs activity
    await recordActivity({
      userId: req.user._id,
      action: "LOGGED_IN",
      message: "Viewed own profile",
    });

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    // AppError with context for fetching profile
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const projection =
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories subscribedAuthors subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate";

    // Fetches users and total count
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
    // AppError with context for fetching all users
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
    // Validates authentication
    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "UpdateProfile",
        "User not authenticated"
      );
    }

    // Fetches user
    const user = await UserModel.findById(req.user._id);
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "UpdateProfile",
        "Authenticated user does not exist"
      );
    }

    // Updates allowed fields
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

    // Handles avatar and banner uploads with compression
    if (req.files) {
      if (req.files.avatar?.[0]) {
        try {
          const uploadedAvatar = await uploadToCloudinary({
            buffer: req.files.avatar[0].buffer,
            folder: "blog/users/avatar",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto:good", fetch_format: "auto" }, // Compresses image while maintaining good quality
            ],
          });
          user.avatar = uploadedAvatar.secure_url;
        } catch (err) {
          throw new AppError(
            "Failed to upload avatar",
            500,
            "UpdateProfile",
            "Error uploading avatar to Cloudinary"
          );
        }
      }

      if (req.files.banner?.[0]) {
        try {
          const uploadedBanner = await uploadToCloudinary({
            buffer: req.files.banner[0].buffer,
            folder: "blog/users/banner",
            transformation: [
              { width: 1200, height: 400, crop: "limit" },
              { quality: "auto:good", fetch_format: "auto" }, // Compresses image while maintaining good quality
            ],
          });
          user.banner = uploadedBanner.secure_url;
        } catch (err) {
          throw new AppError(
            "Failed to upload banner",
            500,
            "UpdateProfile",
            "Error uploading banner to Cloudinary"
          );
        }
      }
    }

    await user.save();

    // Logs activity
    await recordActivity({
      userId: req.user._id,
      action: "UPDATED_PROFILE",
      message: "Updated their profile",
    });

    // Emits profile update to admin and followers
    const profileUpdateData = {
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
    };

    io.to("adminRoom").emit("userProfileUpdate", profileUpdateData);
    user.followers.forEach((followerId) => {
      io.to(followerId.toString()).emit("userProfileUpdate", profileUpdateData);
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
    // AppError with context for updating profile
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
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "DeleteUser",
        "User not authenticated"
      );
    }

    // Deletes user
    const deleted = await UserModel.findByIdAndDelete(userId);
    if (!deleted) {
      throw new AppError(
        "User not found",
        404,
        "DeleteUser",
        "Authenticated user does not exist"
      );
    }

    // Logs activity
    await recordActivity({
      userId,
      action: "DELETED_ACCOUNT",
      message: "Deleted their account",
    });

    // Emits deletion event to admin
    io.to("adminRoom").emit("userDeleted", { userId });

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    // AppError with context for deleting user
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
    const { id } = req.params;

    // Validates user ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "Invalid user ID",
        400,
        "GetSingleUserById",
        "Invalid MongoDB ObjectId"
      );
    }

    // Fetches user
    const user = await UserModel.findById(id)
      .select("-password -googleId")
      .populate("subscribedAuthors", "name email avatar")
      .lean();

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "GetSingleUserById",
        "User does not exist"
      );
    }

    // Logs activity for authenticated users
    if (req.user && req.user._id) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PROFILE",
        message: `Viewed profile of user ${id}`,
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    // AppError with context for fetching single user
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
    const userId = req.params.id;

    // Validates user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(
        "Invalid user ID",
        400,
        "GetUserActivity",
        "Invalid MongoDB ObjectId"
      );
    }

    // Fetches user
    const user = await UserModel.findById(userId).select("name").lean();
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "GetUserActivity",
        "User does not exist"
      );
    }

    // Fetches activity history
    const activityList = await ActivityModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("targetPost", "title slug")
      .populate("targetComment", "text")
      .lean();

    // Logs activity for authenticated users
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
    // AppError with context for fetching user activity
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
    const userId = req.user._id;

    // Deletes user activity
    await ActivityModel.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: "Activity history cleared",
    });
  } catch (error) {
    // AppError with context for clearing user activity
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
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Deletes old activity records
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
    // AppError with context for clearing old activity
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
    const { consent } = req.body;
    const userId = req.user?._id;

    // Validates consent value
    if (typeof consent !== "boolean") {
      throw new AppError(
        "Invalid consent value",
        400,
        "SaveUserCookieConsent",
        "Consent must be a boolean"
      );
    }

    // Updates user consent in database if authenticated
    if (userId) {
      await UserModel.findByIdAndUpdate(userId, { cookieConsent: consent });
    }

    // Sets consent cookie
    res.cookie("user_cookie_consent", String(consent), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    res.status(200).json({
      success: true,
      message: `Consent ${consent ? "accepted" : "declined"}`,
    });
  } catch (error) {
    // AppError with context for saving cookie consent
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
// POST /api/user/feedback/manual/:userId (admin only)
export const adminSendFeedbackPrompt = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return next(
        new AppError("Only admins can trigger feedback prompts", 403)
      );
    }

    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Update user's feedbackPrompt status in DB
    user.feedbackPrompt = {
      shown: true,
      shownAt: new Date(),
      responded: false,
    };
    await user.save();

    // 🔴 Emit socket to that user's room
    io.to(userId).emit("showFeedbackPrompt", {
      message: "📬 We'd love your feedback. How are we doing?",
      fromAdmin: true,
    });

    res.status(200).json({
      success: true,
      message: `Feedback prompt sent to ${user.name}`,
    });
  } catch (error) {
    next(error);
  }
};

export const shouldShowFeedbackPrompt = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id).select(
      "joiningDate feedbackPrompt"
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const accountAgeInDays = Math.floor(
      (Date.now() - new Date(user.joiningDate)) / (1000 * 60 * 60 * 24)
    );

    const shouldShow =
      accountAgeInDays >= 7 &&
      (!user.feedbackPrompt ||
        (!user.feedbackPrompt.shown && !user.feedbackPrompt.responded));

    if (shouldShow) {
      user.feedbackPrompt = {
        shown: true,
        shownAt: new Date(),
        responded: false,
      };
      await user.save();
    }

    res.status(200).json({
      success: true,
      showFeedback: shouldShow,
    });
  } catch (err) {
    next(err);
  }
};
export const submitFeedback = async (req, res, next) => {
  try {
    const { rating, message } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Invalid rating (1-5 required)", 400);
    }

    const user = await UserModel.findById(req.user._id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.feedbackPrompt = {
      ...user.feedbackPrompt,
      responded: true,
      rating,
      message,
    };

    await user.save();

    res.status(200).json({ success: true, message: "Feedback submitted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/user/feedback/all (Admin only)
export const getAllFeedbacks = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return next(new AppError("Access denied: Admins only", 403));
    }

    const feedbackUsers = await UserModel.find({
      "feedbackPrompt.responded": true,
    })
      .select(
        "name email avatar feedbackPrompt.createdAt feedbackPrompt.rating feedbackPrompt.message feedbackPrompt.shown feedbackPrompt.shownAt feedbackPrompt.responded"
      )
      .sort({ "feedbackPrompt.shownAt": -1 })
      .lean();

    const feedbacks = feedbackUsers.map((user) => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      rating: user.feedbackPrompt?.rating,
      message: user.feedbackPrompt?.message,
      shown: user.feedbackPrompt?.shown,
      responded: user.feedbackPrompt?.responded,
      submittedAt: user.feedbackPrompt?.shownAt,
    }));

    res.status(200).json({
      success: true,
      total: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
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
cron.schedule("0 0 * * *", clearOldActivity, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});
