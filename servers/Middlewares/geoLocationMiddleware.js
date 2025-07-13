import { recordActivity } from "../helpers/activityHelper.js";
import UserLocation from "../Models/UserLocation.js";

export const geoLocationMiddleware = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
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

    // Handle localhost (::1) with mock coordinates for development
    if (ip === "::1" || ip === "127.0.0.1") {
      console.log("[GeoLocationMiddleware] Localhost detected, using mock location");
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
      // Use ip-api.com for IP-based geolocation
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon,city,country,regionName,zip`);
      const data = await response.json();

      if (data.status !== "success" || !data.lat || !data.lon) {
        console.warn("[GeoLocationMiddleware] Invalid IP geolocation data:", data);
        req.geoLocation = null;
        return next();
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

    if (!locationData.userId || isNaN(locationData.latitude) || isNaN(locationData.longitude)) {
      console.warn("[GeoLocationMiddleware] Skipping location logging:", {
        userId: locationData.userId,
        lat: locationData.latitude,
        lng: locationData.longitude,
        ip,
        reqUserExists: locationData.reqUserExists,
      });
      req.geoLocation = null;
      return next();
    }

    await UserLocation.create(locationData);

    await recordActivity({
      userId: locationData.userId,
      action: "LOCATION_LOGGED",
      message: `User ${req.user?.name || "Unknown"} location logged: ${locationData.city}, ${locationData.country}`,
    });

    console.log("[GeoLocationMiddleware] Location set:", locationData);
    req.geoLocation = locationData;
    next();
  } catch (error) {
    console.error("[GeoLocationMiddleware] Error:", error.message);
    req.geoLocation = null;
    next();
  }
};