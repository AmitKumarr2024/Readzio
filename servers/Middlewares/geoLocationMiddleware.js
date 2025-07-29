export const geoLocationMiddleware = async (req, res, next) => {
  try {
    let ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;

    // Normalize IPv6 mapped IPv4 (e.g. ::ffff:192.168.x.x)
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);

    // Skip if it's localhost or private IP
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

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,lat,lon,city,country,countryCode,regionName,zip`
    );
    const data = await response.json();

    const lat = parseFloat(data.lat);
    const lon = parseFloat(data.lon);

    // Validate lat/lon
    if (data.status !== "success" || isNaN(lat) || isNaN(lon)) {
      req.geoLocation = null;
      return next();
    }

    // Attach formatted geolocation data to the request
    req.geoLocation = {
      userId: req.user?._id || null,
      ip,
      city: data.city || "Unknown",
      country: data.country || "Unknown",
      countryCode: data.countryCode || "XX",
      state: data.regionName || "Unknown",
      pincode: data.zip || "Unknown",
      latitude: lat,
      longitude: lon,
      coordinates: {
        type: "Point",
        coordinates: [lon, lat],
      },
      timestamp: new Date(), // ✅ Required for location tracking
    };

    next();
  } catch (error) {
    console.error("[geoLocationMiddleware]", error.message);
    req.geoLocation = null;
    next();
  }
};
