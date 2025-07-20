import mongoose from "mongoose";
import { recordActivity } from "../helpers/activityHelper.js";
import UserLocation from "../Models/UserLocation.js";
import { AppError } from "../utils/AppError.js";

// Attaches geolocation data to request based on IP address
export const geoLocationMiddleware = async (req, res, next) => {
  try {
    // Extracts IP address
    const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";

    // Initializes default location data
    let locationData = {
      userId: req.user?._id || null,
      ip,
      city: "Unknown",
      country: "Unknown",
      state: "Unknown",
      pincode: "Unknown",
      latitude: null,
      longitude: null,
      coordinates: null,
      reqUserExists: !!req.user,
    };

    // Handles localhost with mock coordinates
    if (ip === "::1" || ip === "127.0.0.1") {
      locationData = {
        ...locationData,
        latitude: 28.6139, // Mock: New Delhi, India
        longitude: 77.2090,
        city: "New Delhi",
        country: "India",
        state: "Delhi",
        pincode: "110001",
        coordinates: { type: "Point", coordinates: [77.2090, 28.6139] },
      };
    } else {
      // Fetches geolocation data from ip-api.com
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon,city,country,regionName,zip`);
      const data = await response.json();

      if (data.status !== "success" || !data.lat || !data.lon) {
        throw new AppError(
          "Failed to fetch geolocation",
          400,
          "GeoLocationMiddleware",
          "Invalid or missing geolocation data from ip-api.com"
        );
      }

      locationData = {
        ...locationData,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        city: data.city || "Unknown",
        country: data.country || "Unknown",
        state: data.regionName || "Unknown",
        pincode: data.zip || "Unknown",
        coordinates: { type: "Point", coordinates: [parseFloat(data.lon), parseFloat(data.lat)] },
      };
    }

    // Validates data before logging
    if (
      !locationData.userId ||
      isNaN(locationData.latitude) ||
      isNaN(locationData.longitude)
    ) {
      req.geoLocation = null;
      return next();
    }

    // Saves location data
    await UserLocation.create(locationData);

    // Logs activity for authenticated users
    if (locationData.userId) {
      await recordActivity({
        userId: locationData.userId,
        action: "LOCATION_LOGGED",
        message: `User ${req.user?.name || "Unknown"} location logged: ${locationData.city}, ${locationData.country}`,
      });
    }

    // Attaches location data to request
    req.geoLocation = locationData;
    next();
  } catch (error) {
    // AppError with context for geolocation middleware
    req.geoLocation = null;
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to process geolocation",
            500,
            "GeoLocationMiddleware",
            "Error in geoLocationMiddleware"
          )
    );
  }
};