import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import mongoose from "mongoose";
import { CLIENT_URL, NODE_ENV, PORT } from "../servers/config/dotenv.js";
import connectDb from "../servers/config/mongodb.js";
import initializeSocket from "../servers/sockets/socket.js";
import { startTempCleanup } from "../servers/Utils/cleanupTemp.js";
import { handleRazorpayWebhook } from "../servers/Controllers/paymentController.js";
import { corsOptions } from "../servers/config/cors.config.js";

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
    try {
      handleRazorpayWebhook(req, res, next);
    } catch (err) {
      console.error("[Server:Razorpay] ❌ Webhook error:", err.message);
      next(err);
    }
  }
);

// Attach socket to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Compression middleware
app.use(compression());

// CORS config
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Request parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Mount API Routes
const routes = [
  ["/api/auth", AuthRoutes, "AuthRoutes"],
  ["/api/user", UserRoutes, "UserRoutes"],
  ["/api/post", PostRoutes, "PostRoutes"],
  ["/api/category", CategoryRoutes, "CategoryRoutes"],
  ["/api/block", BlockRoutes, "BlockRoutes"],
  ["/api/follow", FollowRoutes, "FollowRoutes"],
  ["/api/notification", NotificationRoutes, "NotificationRoutes"],
  ["/api/payment", RazorpayRoutes, "RazorpayRoutes"],
  ["/api/subscription", SubscriptionRoutes, "SubscriptionRoutes"],
  ["/api/earning", EarningRoutes, "EarningRoutes"],
  ["/api/achievement", AchievementRoutes, "AchievementRoutes"],
  ["/api/comment", CommentsRoutes, "CommentsRoutes"],
  ["/api/admin", AdminRoutes, "AdminRoutes"],
  ["/api/geojson", GeojsonRoutes, "GeojsonRoutes"],
  ["/api/dailyMail", PostEmailRoutes, "PostEmailRoutes"],
  [
    "/api/bannerNotification",
    BannerNotificationRoutes,
    "BannerNotificationRoutes",
  ],
  ["/api/public", guestRoutes, "guestRoutes"],
];

routes.forEach(([path, router, name]) => {
  console.log(`[Server:Routes] Mounting ${name} at ${path}`);
  try {
    app.use(path, router);
  } catch (err) {
    console.error(
      `[Server:Routes] ❌ Error mounting ${name} at ${path}:`,
      err.message
    );
  }
});

// Serve static public files
const publicPath = path.join(__dirname, "servers", "public");
app.use("/public", express.static(publicPath));

// Static ads.txt file
app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// Serve frontend in production
const clientPath = path.join(__dirname, "clients", "dist");
const clientIndexPath = path.join(clientPath, "index.html");

if (NODE_ENV === "production") {
  if (fs.existsSync(clientIndexPath)) {
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
  } else {
    console.error(
      "[Server:Static] ❌ Production build missing: index.html not found"
    );
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
    socket: io.engine.clientsCount > 0 ? "active" : "inactive",
    timestamp: new Date().toISOString(),
  });
});

// Custom global error handler
app.use(errorHandler);

// In development, print all route paths
if (NODE_ENV !== "production") {
  try {
    app._router.stack.forEach((middleware) => {
      if (middleware?.route?.path) {
        const methods = Object.keys(middleware?.route?.methods || {})
          .join(", ")
          .toUpperCase();
        console.log(`[Server:Routes] ✔ ${methods} ${middleware.route.path}`);
      } else if (middleware?.name === "router" && middleware?.handle?.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler?.route?.path) {
            const methods = Object.keys(handler?.route?.methods || {})
              .join(", ")
              .toUpperCase();
            console.log(`[Server:Routes] ✔ ${methods} ${handler.route.path}`);
          }
        });
      }
    });
  } catch (err) {
    console.error(
      "[Server:Routes] ❌ Route inspection error:",
      err?.message || "Unknown error"
    );
    if (err instanceof Error) {
      console.error(err.stack);
    } else {
      console.error("[Server:Routes] Non-Error thrown:", err);
    }
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

    server.listen(PORT, "0.0.0.0", function () {
      console.log(
        `[Server:Startup] ✅ Inksha API running on port ${this.address().port}`
      );
    });
  } catch (err) {
    console.error(
      "[Server:Startup] ❌ Failed to start:",
      err.message,
      err.stack
    );
    process.exit(1);
  }
};

startServer();
