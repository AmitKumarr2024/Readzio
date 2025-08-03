import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { CLIENT_URL, NODE_ENV, PORT } from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import initializeSocket from "./sockets/socket.js";
import { startTempCleanup } from "./Utils/cleanupTemp.js";
import { handleRazorpayWebhook } from "./Controllers/paymentController.js";
import logger from "./Utils/Logger.js"; // Adjust path as needed

// Routes
import AuthRoutes from "./Routes/authRoutes.js";
import UserRoutes from "./Routes/userRoutes.js";
import PostRoutes from "./Routes/postRoutes.js";
import CategoryRoutes from "./Routes/categoryRoutes.js";
import BlockRoutes from "./Routes/blockRoutes.js";
import FollowRoutes from "./Routes/userFollowRoutes.js";
import NotificationRoutes from "./Routes/notificationRoutes.js";
import RazorpayRoutes from "./Routes/paymentRoutes.js";
import SubscriptionRoutes from "./Routes/subscriptionRoutes.js";
import EarningRoutes from "./Routes/earningRoutes.js";
import AchievementRoutes from "./Routes/AchievementRoutes.js";
import CommentsRoutes from "./Routes/commentRoutes.js";
import AdminRoutes from "./Routes/adminRoutes.js";
import GeojsonRoutes from "./Routes/geojsonRoutes.js";
import PostEmailRoutes from "./Routes/postEmailRoutes.js";
import BannerNotificationRoutes from "./Routes/bannerNotificationRoutes.js";
import guestRoutes from "./Routes/guestRoutes.js";
import errorHandler from "./Middlewares/errorHandler.js";

const app = express();
app.set("trust proxy", true);
const server = http.createServer(app);
const io = initializeSocket(server);

const __dirname = path.resolve();

// Razorpay webhook
app.post(
  "/api/razorpay/webhook",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
  handleRazorpayWebhook
);

// Attach socket to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Compression and rate limiting
app.use(compression({ level: 6, threshold: 0 }));
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP
    message: { success: false, message: "Too many requests" },
  })
);

// CORS config
const allowedOrigins = [
  CLIENT_URL?.replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:8001",
  "https://inksha-uedq.onrender.com",
].filter(Boolean);

if (NODE_ENV !== "production") {
  logger.info("[Server:CORS] Allowed origins:", allowedOrigins);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        if (NODE_ENV !== "production") {
          logger.info("[Server:CORS] ✅ Allowed:", origin);
        }
        return callback(null, true);
      }
      logger.error("[Server:CORS] ❌ Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Request parsing middleware
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

// Mount API Routes
const routes = [
  ["/api/auth", AuthRoutes],
  ["/api/user", UserRoutes],
  ["/api/post", PostRoutes],
  ["/api/category", CategoryRoutes],
  ["/api/block", BlockRoutes],
  ["/api/follow", FollowRoutes],
  ["/api/notification", NotificationRoutes],
  ["/api/payment", RazorpayRoutes],
  ["/api/subscription", SubscriptionRoutes],
  ["/api/earning", EarningRoutes],
  ["/api/achievement", AchievementRoutes],
  ["/api/comment", CommentsRoutes],
  ["/api/admin", AdminRoutes],
  ["/api/geojson", GeojsonRoutes],
  ["/api/dailyMail", PostEmailRoutes],
  ["/api/bannerNotification", BannerNotificationRoutes],
  ["/api/public", guestRoutes],
  ["/api/dailyDigest", PostEmailRoutes], // Added for external cron
];

routes.forEach(([path, router]) => {
  if (NODE_ENV !== "production") {
    logger.info(`🔌 Mounting route: ${path}`);
  }
  app.use(path, router);
});

// Serve static public files
const publicPath = path.join(__dirname, "servers", "public");
app.use(
  "/public",
  express.static(publicPath, {
    maxAge: "1d",
    etag: true,
    lastModified: true,
  })
);

// Static ads.txt file
app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// Serve frontend in production
const clientPath = path.join(__dirname, "clients", "dist");
const clientIndexPath = path.join(clientPath, "index.html");

if (NODE_ENV === "production" && fs.existsSync(clientIndexPath)) {
  app.use(
    express.static(clientPath, {
      maxAge: "1h",
      etag: true,
      lastModified: true,
    })
  );
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(clientIndexPath);
  });
} else if (NODE_ENV === "production") {
  logger.warn("⚠️ Production build missing: index.html not found");
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Custom global error handler
app.use(errorHandler);

// In development, print routes
if (NODE_ENV !== "production") {
  try {
    app._router.stack.forEach((middleware) => {
      if (middleware?.route?.path) {
        const methods = Object.keys(middleware?.route?.methods || {})
          .join(", ")
          .toUpperCase();
        logger.info(`✔ ${methods} ${middleware.route.path}`);
      } else if (middleware?.name === "router" && middleware?.handle?.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler?.route?.path) {
            const methods = Object.keys(handler?.route?.methods || {})
              .join(", ")
              .toUpperCase();
            logger.info(`✔ ${methods} ${handler.route.path}`);
          }
        });
      }
    });
  } catch (err) {
    logger.error("❌ Route inspection error:", err?.message || "Unknown error");
  }
}

// Socket and HTTP error listeners
io.on("error", (err) => {
  logger.error("[Server:SocketIO] Error:", err.message);
});

server.on("error", (err) => {
  logger.error("[Server:HTTP] Error:", err.message);
});

// Global error listeners
process.on("uncaughtException", (err) => {
  logger.error("[UncaughtException] ❌", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("[UnhandledRejection] ❌", err.message);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    await connectDb();
    logger.info("[Server:Startup] ✅ Database connected");

    // Memory monitoring
    setInterval(() => {
      const used = process.memoryUsage();
      logger.info(
        `[Memory Usage] RSS: ${(used.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(
          used.heapUsed /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
    }, 60_000);

    startTempCleanup();
    // Note: startDailyDigestJob moved to external cron

    server.listen(PORT, () => {
      logger.info(`[Server:Startup] ✅ Inksha API is running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("[Server:Startup] ❌ Failed to start:", err.message);
    process.exit(1);
  }
};

startServer();
F