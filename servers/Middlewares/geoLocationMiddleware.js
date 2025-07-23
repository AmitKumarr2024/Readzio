import mongoose from "mongoose";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import UserLocation from "../Models/UserLocation.js";
import { AppError } from "../../servers/Utils/AppError.js";

// GeoIP Middleware — removes predefined location fallback
export const geoLocationMiddleware = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || null;

    // Reject private or unknown IPs
    const isPrivateIP =
      !ip ||
      ip === "::1" ||
      ip === "127.0.0.1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.");

    if (isPrivateIP) {
      req.geoLocation = null;
      return next(); // Don't save or assign location
    }

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,lat,lon,city,country,countryCode,regionName,zip`
    );
    const data = await response.json();

    if (data.status !== "success" || !data.lat || !data.lon) {
      req.geoLocation = null;
      return next(); // Fail silently
    }

    const locationData = {
      userId: req.user?._id || null,
      ip,
      city: data.city || "Unknown",
      country: data.country || "Unknown",
      countryCode: data.countryCode || "XX",
      state: data.regionName || "Unknown",
      pincode: data.zip || "Unknown",
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      coordinates: {
        type: "Point",
        coordinates: [parseFloat(data.lon), parseFloat(data.lat)],
      },
    };

    if (req.user?._id) {
      await UserLocation.create(locationData);
      await recordActivity({
        userId: req.user._id,
        action: "LOCATION_LOGGED",
        message: `User ${req.user.name} location logged: ${locationData.city}, ${locationData.country}`,
      });
    }

    req.geoLocation = locationData;
    next();
  } catch (error) {
    console.error("[geoLocationMiddleware]", error.message);
    req.geoLocation = null;
    next(); // Continue even on failure
  }
};
