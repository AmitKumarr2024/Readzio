import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import mongoose from "mongoose";
import listEndpoints from "express-list-endpoints";

import { CLIENT_URL, NODE_ENV } from "./config/dotenv.js"; // ❌ Removed PORT import
import connectDb from "./config/mongodb.js";
import initializeSocket from "./sockets/socket.js";
import { startTempCleanup } from "./Utils/cleanupTemp.js";
import { handleRazorpayWebhook } from "./Controllers/paymentController.js";
import { logMemory } from "../servers/Utils/memoryLogger.js";

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
  (req, res, next) => {
    logMemory("💸 Razorpay webhook start");
    try {
      handleRazorpayWebhook(req, res, next);
      logMemory("💸 Razorpay webhook end");
    } catch (err) {
      console.error("[Server:Razorpay] ❌ Webhook error:", err.message);
      next(err);
    }
  }
);

// Middleware
app.use((req, res, next) => {
  logMemory("🔌 Attaching socket to request");
  req.io = io;
  next();
});
app.use((req, res, next) => {
  logMemory("🗜️ Compression middleware");
  compression()(req, res, next);
});
app.use(
  cors({
    origin: (origin, callback) => {
      logMemory("🌐 CORS check");
      console.log("[Server:CORS] Request from:", origin);
      const allowedOrigins = [
        CLIENT_URL?.replace(/\/$/, ""),
        "http://localhost:5173",
        "http://localhost:8001",
        "https://inksha-uedq.onrender.com",
        "https://www.inksha-uedq.onrender.com",
      ].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Routes
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
  logMemory(`🛤️ Mounting route: ${path}`);
  app.use(path, router);
});

// Route listing in dev
if (NODE_ENV !== "production") {
  try {
    const endpoints = listEndpoints(app);
    console.log("📋 All registered routes:");
    endpoints.forEach((route) => {
      console.log(`${route.methods.join(", ")} ${route.path}`);
    });
  } catch (err) {
    console.error("❌ Route inspection failed:", err.message);
  }
}

// Public/static
const publicPath = path.join(__dirname, "servers", "public");
app.use("/public", express.static(publicPath));

app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "clients", "dist", "sitemap.xml"));
});

app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// Serve frontend (production)
const clientPath = path.join(__dirname, "clients", "dist");
const clientIndexPath = path.join(clientPath, "index.html");

if (NODE_ENV === "production" && fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientPath));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(clientIndexPath, (err) => {
      if (err) {
        console.error(
          "[Server:Static] ❌ Failed to serve index.html:",
          err.message
        );
        res.status(500).send("Internal Server Error");
      }
    });
  });
}
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /
Sitemap: https://inksha-uedq.onrender.com/sitemap.xml`);
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Inksha API is running",
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    socket: io.engine.clientsCount > 0 ? "active" : "inactive",
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorHandler);

// Global error logs
io.on("error", (err) => console.error("[Socket.IO] Error:", err.message));
server.on("error", (err) => console.error("[HTTP Server] Error:", err.message));
process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] ❌", err.message);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("[UnhandledRejection] ❌", err.message);
  process.exit(1);
});

// ✅ FIXED: Correct port handling for Render
const startServer = async () => {
  try {
    console.log("[Server:Startup] Connecting to MongoDB...");
    await connectDb();
    console.log("[Server:Startup] ✅ Database connected");

    startTempCleanup();
    startDailyDigestJob();

    const port = process.env.PORT || 10000;
    server.listen(port, "0.0.0.0", function () {
      console.log(
        `[Server:Startup] ✅ Inksha API running on port ${this.address().port}`
      );
    });
  } catch (err) {
    console.error("[Server:Startup] ❌ Failed to start:", err.message);
    process.exit(1);
  }
};

startServer();
