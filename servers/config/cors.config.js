const normalizeOrigin = (url) => {
  if (!url) return null;
  try {
    return new URL(url).origin.replace(/\/+$/, ""); // remove trailing slash
  } catch {
    return url.replace(/\/+$/, "");
  }
};

// Allowed origins (both env + hardcoded)
const allowedOrigins = [
  normalizeOrigin(process.env.CLIENT_URL),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8001",
  "https://inksha-uedq.onrender.com",
  "https://www.inksha-uedq.onrender.com",
].filter(Boolean);

// Debug mode toggle
const DEBUG_CORS = process.env.NODE_ENV !== "production";

// Final CORS options
const corsOptions = {
  origin: (origin, callback) => {
    const cleanedOrigin = normalizeOrigin(origin);

    if (DEBUG_CORS && origin) {
      console.log("[CORS] 🧪 Request from:", origin);
    }

    // Allow:
    // - No origin (e.g. Postman, mobile apps)
    // - Any origin that starts with allowed origins
    if (
      !origin ||
      allowedOrigins.some((allowed) => cleanedOrigin?.startsWith(allowed))
    ) {
      return callback(null, true);
    }

    console.error("[CORS] ❌ Blocked:", origin);
    return callback(new Error("CORS not allowed"));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

export { allowedOrigins, corsOptions };
