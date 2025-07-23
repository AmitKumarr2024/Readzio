import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import mongoose from "mongoose";
import { CLIENT_URL, NODE_ENV, PORT } from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import initializeSocket from "./sockets/socket.js";
import { startTempCleanup } from "./Utils/cleanupTemp.js";
import { handleRazorpayWebhook } from "./Controllers/paymentController.js";

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
import { startDailyDigestJob } from "./Utils/startDailyDigestJob.js";

console.log("[Server:Startup] Initializing Express server");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

const __dirname = path.resolve();

// 🔐 Razorpay webhook (raw body needed)
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

// Compression middleware
app.use(compression());
console.log("[Server:Middleware] Compression applied");

// CORS config
const allowedOrigins = [
  CLIENT_URL?.replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:8001",
  "https://inksha.onrender.com",
].filter(Boolean);

console.log("[Server:CORS] Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        console.log("[Server:CORS] ✅ Allowed:", origin);
        return callback(null, true);
      }
      console.error("[Server:CORS] ❌ Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Request parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
console.log("[Server:Middleware] JSON, URL-encoded, cookie-parser applied");

// 🔌 Mount API Routes
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
];

routes.forEach(([path, router]) => {
  console.log(`🔌 Mounting route: ${path}`);
  app.use(path, router);
});

// ✅ Serve static frontend in production
const clientPath = path.join(__dirname, "clients", "dist");
const clientIndexPath = path.join(clientPath, "index.html");

// ✅ Serve static public files (logo.png, robots.txt, etc.)
app.get("/test-logo", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "assets", "logo.png"));
});

// Static ads.txt file
app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// ✅ Serve frontend in production
if (NODE_ENV === "production") {
  if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(clientPath));

    // ⚠️ This must come LAST
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(clientIndexPath);
    });
  } else {
    console.warn("⚠️ Production build missing: index.html not found");
  }
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Inksha API is running",
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Custom global error handler
app.use(errorHandler);
console.log("[Server:Middleware] Error handler applied");

// In development, print all route paths
if (NODE_ENV !== "production") {
  console.log("📜 Dumping all registered route paths (dev):");
  try {
    app._router.stack.forEach((middleware) => {
      if (middleware?.route?.path) {
        const methods = Object.keys(middleware.route.methods)
          .join(", ")
          .toUpperCase();
        console.log(`✔ ${methods} ${middleware.route.path}`);
      } else if (middleware?.name === "router" && middleware?.handle?.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler?.route?.path) {
            const methods = Object.keys(handler.route.methods)
              .join(", ")
              .toUpperCase();
            console.log(`✔ ${methods} ${handler.route.path}`);
          }
        });
      }
    });
  } catch (err) {
    console.error("❌ Route inspection error:", err.message);
  }
}

// Socket and HTTP error listeners
io.on("error", (err) => {
  console.error("[Server:SocketIO] Error:", err.message);
});

server.on("error", (err) => {
  console.error("[Server:HTTP] Error:", err.message);
});

// Global error listeners
process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] ❌", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("[UnhandledRejection] ❌", err.message);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    console.log("[Server:Startup] Connecting to MongoDB...");
    await connectDb();
    console.log("[Server:Startup] ✅ Database connected");

    startTempCleanup();
    startDailyDigestJob();

    server.listen(PORT, () => {
      console.log(`[Server:Startup] ✅ Inksha API is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("[Server:Startup] ❌ Failed to start:", err.message);
    process.exit(1);
  }
};

startServer();
