import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import mongoose from "mongoose";
import {
  CLIENT_URL,
  NODE_ENV,
  PORT,
  ALLOWED_ORIGINS,
} from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import initializeSocket from "./sockets/socket.js";
import { startTempCleanup } from "./Utils/cleanupTemp.js";
import { startDailyDigestJob } from "./Utils/startDailyDigestJob.js";
import { handleRazorpayWebhook } from "./Controllers/paymentController.js";
import errorHandler from "./Middlewares/errorHandler.js";

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

// Initialize
const app = express();
app.set("trust proxy", true);
const server = http.createServer(app);
const io = initializeSocket(server);
const __dirname = path.resolve();

// Middleware
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = ALLOWED_ORIGINS.split(",").filter(Boolean);
      if (!origin || allowed.includes(origin)) return callback(null, true);
      console.error("[Server:CORS] Blocked:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => (req.rawBody = buf.toString()),
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.io = io;
  next();
});

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
routes.forEach(([path, router]) => app.use(path, router));

// Razorpay Webhook
app.post("/api/razorpay/webhook", (req, res, next) => {
  try {
    handleRazorpayWebhook(req, res, next);
  } catch (err) {
    console.error("[Server:Razorpay] Webhook error:", err.message);
    next(err);
  }
});

// Static Files
app.use("/public", express.static(path.join(__dirname, "servers", "public")));
app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// Production SPA Serving
if (NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "clients", "dist");
  const clientIndexPath = path.join(clientPath, "index.html");
  if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(clientPath));
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(clientIndexPath, (err) => {
        if (err) {
          console.error(
            "[Server:Static] Failed to serve index.html:",
            err.message
          );
          res.status(500).json({ message: "Internal Server Error" });
        }
      });
    });
  } else {
    console.error(
      "[Server:Static] Production build missing: index.html not found"
    );
  }
}

// Unknown API Routes
app.all("/api/*", (req, res) =>
  res.status(404).json({ message: "API route not found" })
);

// Health Check
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

// Error Handling
app.use(errorHandler);
io.on("error", (err) => console.error("[Server:SocketIO] Error:", err.message));
server.on("error", (err) => console.error("[Server:HTTP] Error:", err.message));
process.on("uncaughtException", (err) => {
  console.error("[UncaughtException]", err.message, err.stack);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("[UnhandledRejection]", err.message);
  process.exit(1);
});
process.on("SIGTERM", () => {
  console.log("[Server:Shutdown] SIGTERM received. Shutting down...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("[Server:Shutdown] MongoDB connection closed.");
      process.exit(0);
    });
  });
});

// Route Logging (Dev Only)
if (NODE_ENV !== "production") {
  try {
    app._router.stack.forEach((middleware) => {
      if (middleware?.route?.path) {
        const methods = Object.keys(middleware.route.methods)
          .join(", ")
          .toUpperCase();
        console.log(`[Server:Routes] ${methods} ${middleware.route.path}`);
      } else if (middleware?.name === "router" && middleware?.handle?.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler?.route?.path) {
            const methods = Object.keys(handler.route.methods)
              .join(", ")
              .toUpperCase();
            console.log(`[Server:Routes] ${methods} ${handler.route.path}`);
          }
        });
      }
    });
  } catch (err) {
    console.error("[Server:Routes] Inspection error:", err.message);
  }
}

// Start Server
const startServer = async () => {
  try {
    await connectDb();
    console.log(
      `[Server:Startup] Database connected at ${new Date().toLocaleString()}`
    );
    startTempCleanup();
    startDailyDigestJob();
    server.listen(PORT, "0.0.0.0", function () {
      console.log(
        `[Server:Startup] Inksha API running on port ${this.address().port}`
      );
    });
  } catch (err) {
    console.error("[Server:Startup] Failed to start:", err.message, err.stack);
    process.exit(1);
  }
};
startServer();
