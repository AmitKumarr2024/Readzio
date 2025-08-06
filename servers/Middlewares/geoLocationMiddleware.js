export const geoLocationMiddleware = async (req, res, next) => {
  try {
    let ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;

    // Normalize IPv6 mapped IPv4 (e.g. ::ffff:192.168.x.x)
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);

    // Skip local/private IPs
    const isPrivateIP =
      !ip ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.");

    if (isPrivateIP) {
      console.warn("[GeoIP] Skipping private IP:", ip);
      req.geoLocation = null;
      return next();
    }

    // Log request
    console.log(`[GeoIP] Looking up IP: ${ip}`);

    // Use ipapi.co for reliable backend geolocation
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        "User-Agent": "GeoMiddleware",
        Accept: "application/json",
      },
      timeout: 5000,
    });

    const data = await response.json();

    if (!data || data.error) {
      console.warn("[GeoIP] Lookup failed. Response:", data);
      req.geoLocation = null;
      return next();
    }

    const lat = parseFloat(data.latitude);
    const lon = parseFloat(data.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      console.warn("[GeoIP] Invalid coordinates from response:", data);
      req.geoLocation = null;
      return next();
    }

    // Attach to request
    req.geoLocation = {
      userId: req.user?._id || null,
      ip,
      city: data.city || "Unknown",
      country: data.country_name || "Unknown",
      countryCode: data.country || "XX",
      state: data.region || "Unknown",
      pincode: data.postal || "Unknown",
      latitude: lat,
      longitude: lon,
      coordinates: {
        type: "Point",
        coordinates: [lon, lat],
      },
      timestamp: new Date(),
    };

    // Log success
    console.log("[GeoIP] Geolocation successful:", {
      ip,
      city: req.geoLocation.city,
      country: req.geoLocation.country,
      state: req.geoLocation.state,
      pincode: req.geoLocation.pincode,
      lat,
      lon,
    });

    next();
  } catch (error) {
    console.error("[GeoIP] Middleware error:", error.message);
    req.geoLocation = null;
    next();
  }
};
