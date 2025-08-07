// middlewares/geoLocationMiddleware.js
import axios from "axios";

const geoLocationMiddleware = async (req, res, next) => {
  try {
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip;

    if (ip?.startsWith("::ffff:")) ip = ip.slice(7); // clean IPv4 format

    console.log(`[GeoLocationMiddleware] Detected IP: ${ip}`);

    let geoRes = await axios.get(
      `http://ip-api.com/json/${ip}?fields=lat,lon,query,status`
    );
    const { lat, lon, status } = geoRes.data;

    if (status !== "success") {
      console.warn(`[GeoLocationMiddleware] IP lookup failed for ${ip}`);
      req.geoLocation = {
        ip,
        lat: null,
        lon: null,
        city: "Unknown",
        state: "Unknown",
        country: "Unknown",
        pincode: "Unknown",
      };
      return next();
    }

    // Reverse geocoding with OpenStreetMap
    let reverseRes = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat,
          lon,
          format: "json",
          zoom: 10,
          addressdetails: 1,
        },
        headers: {
          "User-Agent": "GeoApp",
        },
      }
    );

    const address = reverseRes.data.address || {};
    const city = address.city || address.town || address.village || "Unknown";
    const state = address.state || "Unknown";
    const country = address.country || "Unknown";
    const pincode = address.postcode || "Unknown";

    req.geoLocation = {
      ip,
      lat,
      lon,
      city,
      state,
      country,
      pincode,
    };

    console.log(
      "[GeoLocationMiddleware] Final location data:",
      req.geoLocation
    );
    next();
  } catch (error) {
    console.error("[GeoLocationMiddleware] Error:", error.message);
    req.geoLocation = {
      ip: req.ip || "Unknown",
      lat: null,
      lon: null,
      city: "Unknown",
      state: "Unknown",
      country: "Unknown",
      pincode: "Unknown",
    };
    next();
  }
};

export default geoLocationMiddleware;
