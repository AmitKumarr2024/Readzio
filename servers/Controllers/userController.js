import mongoose from "mongoose";
import cron from "node-cron";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { uploadToCloudinary } from "../../servers/Utils/uploadToCloudinary.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import ActivityModel from "../../servers/Models/ActivityModel.js";
import { io } from "../../servers/sockets/socket.js";
import UserLocation from "../../servers/Models/UserLocation.js";

// GET /api/user/ip-location
export const getIPLocation = async (req, res, next) => {
  try {
    if (!req.geoLocation) {
      return res.status(200).json({
        success: false,
        location: null,
      });
    }

    res.status(200).json({
      success: true,
      location: req.geoLocation,
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      location: null,
    });
  }
};

// POST /api/user/track-ip-location
// POST /api/user/track-ip-location
export const trackIPLocation = async (req, res, next) => {
  try {
    const { user } = req;
    const location = req.geoLocation;

    // ✅ DO NOT BLOCK LOGIN
    if (!user || !user._id) {
      return res.status(200).json({ message: "User not authenticated" });
    }

    if (
      !location ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) {
      return res.status(200).json({ message: "Location data not available" });
    }

    const locationData = {
      userId: new mongoose.Types.ObjectId(user._id),
      coordinates: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
      city: location.city || "Unknown",
      country: location.country || "Unknown",
      state: location.state || "Unknown",
      pincode: location.pincode || "Unknown",
      ip: location.ip || "",
      timestamp: new Date(),
    };

    await UserLocation.create(locationData);

    return res.status(200).json({ message: "Location tracked successfully" });
  } catch (err) {
    console.error("[trackIPLocation] Error:", err.message);
    // ✅ NEVER THROW — tracking must not break auth
    return res.status(200).json({ message: "Location tracking skipped" });
  }
};

// Saves user location with validation and emits updates
export const saveUserLocation = async (req, res, next) => {
  try {
    const { coordinates, city: bodyCity, country: bodyCountry } = req.body;
    const geo = req.geoLocation || {};
    const latitude = geo.latitude || coordinates?.lat;
    const longitude = geo.longitude || coordinates?.lon;

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return res
        .status(400)
        .json({ message: "Invalid or missing coordinates" });
    }

    const user = await UserModel.findById(req.user._id).select("followers");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const locationData = {
      userId: req.user._id,
      coordinates: { type: "Point", coordinates: [longitude, latitude] },
      city: geo.city || bodyCity || "Unknown",
      country: geo.country || bodyCountry || "Unknown",
      state: geo.state || "Unknown",
      pincode: geo.pincode || "Unknown",
      ip: geo.ip || req.ip || "",
      timestamp: new Date(),
    };

    await UserLocation.deleteMany({ userId: req.user._id });
    const location = await UserLocation.create(locationData);

    await recordActivity({
      userId: req.user._id,
      action: "SAVED_USER_LOCATION",
      message: `Location saved: ${locationData.city}, ${locationData.state}, ${locationData.country} (Pincode: ${locationData.pincode})`,
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

    // Emit updates safely
    io.to("adminRoom").emit("userLocationUpdate", socketLocationData);

    const followers = Array.isArray(user.followers) ? user.followers : [];
    followers.forEach((followerId) =>
      io
        .to(followerId.toString())
        .emit("userLocationUpdate", socketLocationData)
    );

    res.status(201).json({
      success: true,
      message: "Location saved successfully",
      location: socketLocationData,
    });
  } catch (error) {
    console.error("💥 saveUserLocation error:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to save user location",
            500,
            "SaveUserLocation",
            "Unhandled error in location save"
          )
    );
  }
};

// export const saveUserLocation = async (req, res, next) => {
//   try {
//     // ✅ This is the right place for the log
//     console.log("[geoLocation from middleware]", req.geoLocation);
//     const { coordinates, city: bodyCity, country: bodyCountry } = req.body;
//     const latitude = coordinates?.lat;
//     const longitude = coordinates?.lon;

//     if (
//       !latitude ||
//       !longitude ||
//       latitude === 0 ||
//       longitude === 0 ||
//       isNaN(latitude) ||
//       isNaN(longitude)
//     ) {
//       throw new AppError(
//         "Invalid coordinates",
//         400,
//         "SaveUserLocation",
//         "Latitude or longitude is missing or invalid"
//       );
//     }

//     const user = await UserModel.findById(req.user._id).select("followers");
//     if (!user) {
//       throw new AppError(
//         "User not found",
//         404,
//         "SaveUserLocation",
//         "User not found in DB"
//       );
//     }

//     // ✅ Pull from geoLocation middleware
//     const geo = req.geoLocation || {};
//     const ip = geo.ip || req.ip || "";

//     // ✅ Clean fallback: prefer geoLocation > body > "Unknown"
//     const locationData = {
//       userId: req.user._id,
//       coordinates: {
//         type: "Point",
//         coordinates: [longitude, latitude],
//       },
//       city: geo.city || bodyCity || "Unknown",
//       country: geo.country || bodyCountry || "Unknown",
//       state: geo.state || "Unknown",
//       pincode: geo.pincode || "Unknown",
//       ip,
//       timestamp: new Date(),
//     };

//     console.log("[saveUserLocation] Saving location:", locationData);

//     await UserLocation.deleteMany({ userId: req.user._id }); // overwrite
//     const location = await UserLocation.create(locationData);

//     await recordActivity({
//       userId: req.user._id,
//       action: "SAVED_USER_LOCATION",
//       message: `Location saved: ${locationData.city}, ${locationData.state}, ${locationData.country} (Pincode: ${locationData.pincode})`,
//     });

//     const socketLocationData = {
//       userId: req.user._id.toString(),
//       coordinates: { lat: latitude, lon: longitude },
//       city: locationData.city,
//       country: locationData.country,
//       state: locationData.state,
//       pincode: locationData.pincode,
//       timestamp: location.timestamp.getTime(),
//     };

//     io.to("adminRoom").emit("userLocationUpdate", socketLocationData);
//     user.followers.forEach((followerId) =>
//       io
//         .to(followerId.toString())
//         .emit("userLocationUpdate", socketLocationData)
//     );

//     res.status(201).json({
//       success: true,
//       message: "Location saved successfully",
//       location: socketLocationData,
//     });
//   } catch (error) {
//     next(
//       error instanceof AppError
//         ? error
//         : new AppError(
//             error.message || "Failed to save user location",
//             500,
//             "SaveUserLocation",
//             "Unhandled error in location save"
//           )
//     );
//   }
// };

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
    if (!req.user?._id) {
      return res.status(401).json({ authenticated: false });
    }

    const profile = await UserModel.findById(req.user._id).select("-password");
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    await recordActivity({
      userId: req.user._id,
      action: "LOGGED_IN",
      message: "Viewed own profile",
    });

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
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
      "name email gender avatar banner bio profession location createdAt role blocked bookmarks following followers blockedUsers subscribedCategories  subscribers hasSubscriptionPlan subscriptionPlan subscriptionDate tourCompleted";

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

// Updates user profile with avatar and banner upload to Cloudinary

export const updateProfile = async (req, res, next) => {
  console.log("🔍 updateProfile started:", {
    userId: req.user?._id,
    hasFiles: !!req.files,
  });
  try {
    if (!req.user?._id) {
      console.log("❌ Unauthorized - No user found");
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "UpdateProfile",
        "User not authenticated"
      );
    }

    const user = await UserModel.findById(req.user._id);
    console.log("✅ User found:", { userId: user?._id, name: user?.name });
    if (!user) {
      console.log("❌ User not found");
      throw new AppError(
        "User not found",
        404,
        "UpdateProfile",
        "Authenticated user does not exist"
      );
    }

    // Only update text fields, exclude avatar/banner
    const updatableFields = [
      "name",
      "bio",
      "gender",
      "location",
      "profession",
      "email",
      "blocked",
      "tourCompleted",
    ];

    const updatedFields = [];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
        updatedFields.push(`${field}: ${req.body[field]}`);
      }
    });
    console.log("📝 Text fields updated:", updatedFields);

    // Handle file uploads separately
    if (req.files) {
      console.log("📁 Files received:", Object.keys(req.files));

      // ---------- Avatar ----------
      if (req.files.avatar?.[0]) {
        console.log("🖼️ Processing avatar upload");
        const file = req.files.avatar[0];
        console.log("📄 Avatar file details:", {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer, // <-- Check this
        });
        if (!file.buffer || !file.mimetype.startsWith("image/")) {
          console.log("❌ Invalid avatar file:", {
            mimetype: file.mimetype,
            hasBuffer: !!file.buffer,
          });
          throw new AppError(
            "Invalid avatar file",
            400,
            "UpdateProfile",
            "Avatar must be a valid image file"
          );
        }

        console.log("☁️ Calling uploadToCloudinary for avatar");
        try {
          const uploadParams = {
            buffer: file.buffer,
            folder: "readzio/users/avatar",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto:good", fetch_format: "auto" },
            ],
          };
          console.log("📤 Upload params (sans buffer):", {
            folder: uploadParams.folder,
            transformation: uploadParams.transformation,
          });

          const uploadedAvatar = await uploadToCloudinary(uploadParams);
          console.log("📥 Cloudinary response:", {
            public_id: uploadedAvatar.public_id,
            secure_url: uploadedAvatar.secure_url,
            version: uploadedAvatar.version,
          });

          user.avatar = uploadedAvatar.secure_url;
          console.log(
            "✅ Avatar uploaded successfully:",
            uploadedAvatar.secure_url
          );
        } catch (err) {
          console.error("💥 Cloudinary avatar upload error:", {
            message: err.message,
            code: err.code,
            statusCode: err.http_code,
          });
          throw new AppError(
            "Failed to upload avatar",
            500,
            "UpdateProfile",
            `Cloudinary error: ${err.message}`
          );
        }
      } else {
        console.log("ℹ️ No avatar file provided");
      }

      // ---------- Banner ----------
      if (req.files.banner?.[0]) {
        console.log("🖼️ Processing banner upload");
        const file = req.files.banner[0];
        console.log("📄 Banner file details:", {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer,
        });

        if (!file.buffer || !file.mimetype.startsWith("image/")) {
          console.log("❌ Invalid banner file:", {
            mimetype: file.mimetype,
            hasBuffer: !!file.buffer,
          });
          throw new AppError(
            "Invalid banner file",
            400,
            "UpdateProfile",
            "Banner must be a valid image file"
          );
        }

        console.log("☁️ Calling uploadToCloudinary for banner");
        try {
          const uploadParams = {
            buffer: file.buffer,
            folder: "readzio/users/banner",
            transformation: [
              { width: 1200, height: 400, crop: "limit" },
              { quality: "auto:good", fetch_format: "auto" },
            ],
          };
          console.log("📤 Upload params (sans buffer):", {
            folder: uploadParams.folder,
            transformation: uploadParams.transformation,
          });

          const uploadedBanner = await uploadToCloudinary(uploadParams);
          console.log("📥 Cloudinary response:", {
            public_id: uploadedBanner.public_id,
            secure_url: uploadedBanner.secure_url,
            version: uploadedBanner.version,
          });

          user.banner = uploadedBanner.secure_url;
          console.log(
            "✅ Banner uploaded successfully:",
            uploadedBanner.secure_url
          );
        } catch (err) {
          console.error("💥 Cloudinary banner upload error:", {
            message: err.message,
            code: err.code,
            statusCode: err.http_code,
          });
          throw new AppError(
            "Failed to upload banner",
            500,
            "UpdateProfile",
            `Cloudinary error: ${err.message}`
          );
        }
      } else {
        console.log("ℹ️ No banner file provided");
      }
    } else {
      console.log("ℹ️ No files provided");
    }

    // Save user
    await user.save();
    console.log("💾 User saved successfully");

    // Record activity
    await recordActivity({
      userId: req.user._id,
      action: "UPDATED_PROFILE",
      message: "Updated their profile",
    });
    console.log("📊 Activity recorded");

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
      tourCompleted: user.tourCompleted,
    };

    // Emit updates via Socket.IO
    console.log("📡 Emitting updates to:", [
      "adminRoom",
      ...user.followers.map((f) => f.toString()),
    ]);
    io.to("adminRoom").emit("userProfileUpdate", profileUpdateData);
    user.followers.forEach((followerId) => {
      io.to(followerId.toString()).emit("userProfileUpdate", profileUpdateData);
    });
    console.log("✅ Emits sent");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        ...profileUpdateData,
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
    console.log("✅ Response sent: 200 OK");
  } catch (error) {
    console.error("💥 updateProfile error:", {
      message: error.message,
      stack: error.stack,
    });
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to update profile",
            500,
            "UpdateProfile",
            "Unhandled error in updateProfile"
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

    const result = await ActivityModel.deleteMany({
      createdAt: { $lt: oneDayAgo },
    });

    if (res) {
      res.status(200).json({
        success: true,
        message: `Cleared ${result.deletedCount} old activity records`,
      });
    }
  } catch (error) {
    console.error("[clearOldActivity] Error:", error.message);
    if (next) next(error);
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
