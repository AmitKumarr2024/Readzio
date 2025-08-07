import axios from "axios";

const geoLocationMiddleware = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "0.0.0.0";

    const geoAPI = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon,query`;

    const response = await axios.get(geoAPI);
    const data = response.data;

    if (data.status === "success") {
      req.geoLocation = {
        ip: data.query || ip,
        country: data.country || "Unknown",
        state: data.regionName || "Unknown",
        city: data.city || "Unknown",
        pincode: data.zip || "Unknown",
        latitude: data.lat,
        longitude: data.lon,
      };
    } else {
      req.geoLocation = {
        ip,
        country: "Unknown",
        state: "Unknown",
        city: "Unknown",
        pincode: "Unknown",
        latitude: null,
        longitude: null,
      };
    }

    console.log("[geoLocationMiddleware] Resolved:", req.geoLocation);
    next();
  } catch (error) {
    console.error("[geoLocationMiddleware] Failed:", error.message);
    req.geoLocation = {
      ip: "0.0.0.0",
      country: "Unknown",
      state: "Unknown",
      city: "Unknown",
      pincode: "Unknown",
      latitude: null,
      longitude: null,
    };
    next();
  }
};

export default geoLocationMiddleware;
