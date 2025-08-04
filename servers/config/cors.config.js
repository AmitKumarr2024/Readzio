const normalizeOrigin = (url) => url?.replace(/\/+$/, "");

const allowedOrigins = [
  normalizeOrigin(process.env.CLIENT_URL),
  "http://localhost:5173",
  "http://127.0.0.1:5173", // Added for local testing
  "http://localhost:8001",
  "https://inksha-uedq.onrender.com",
  "https://www.inksha-uedq.onrender.com",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (origin) {
      console.log("[CORS] Request from:", origin);
    }
    if (
      !origin ||
      allowedOrigins.some((allowed) => origin.startsWith(allowed))
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
