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
import { logMemory } from "../servers/Utils/memoryLogger.js"; // Import logMemory

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

// Attach socket to every request
app.use((req, res, next) => {
  logMemory("🔌 Attaching socket to request");
  req.io = io;
  next();
});

// Compression middleware
app.use((req, res, next) => {
  logMemory("🗜️ Compression middleware");
  compression()(req, res, next);
});

// CORS config
const allowedOrigins = [
  CLIENT_URL?.replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:8001",
  "https://inksha-uedq.onrender.com",
  "https://www.inksha-uedq.onrender.com",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      logMemory("🌐 CORS check");
      console.log("[Server:CORS] Request from:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
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
app.use((req, res, next) => {
  logMemory("📝 JSON parsing middleware");
  express.json({ limit: "10mb" })(req, res, next);
});
app.use((req, res, next) => {
  logMemory("📝 URL-encoded parsing middleware");
  express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
});
app.use((req, res, next) => {
  logMemory("🍪 Cookie parsing middleware");
  cookieParser()(req, res, next);
});

// Mount API Routes
const routes = [
  ["/api/auth", AuthRoutes],
  ["/api/user", UserRoutes],
  ["/api/post", PostRoutes],
  ["/api/category", CategoryRoutes],
  ["/api/block", BlockRoutes],
  ["/api/follow", FollowRoutes],
  ["/api/notification", NotificationRoutes],
  ["/api/payment", RazorpaymentRoutes],
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

// Serve static public files
const publicPath = path.join(__dirname, "servers", "public");
app.use("/public", (req, res, next) => {
  logMemory("📂 Serving static public files");
  express.static(publicPath)(req, res, next);
});

// Static ads.txt file
app.get("/ads.txt", (req, res) => {
  logMemory("📜 Serving ads.txt");
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// Serve frontend in production
const clientPath = path.join(__dirname, "clients", "dist");
const clientIndexPath = path.join(clientPath, "index.html");

if (NODE_ENV === "production") {
  if (fs.existsSync(clientIndexPath)) {
    app.use((req, res, next) => {
      logMemory("📄 Serving static client files");
      express.static(clientPath)(req, res, next);
    });
    app.get(/^\/(?!api\/).*/, (req, res) => {
      logMemory("📄 Serving index.html");
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
  logMemory("🩺 Health check");
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
app.use((err, req, res, next) => {
  logMemory("❌ Error handler");
  errorHandler(err, req, res, next);
});

// In development, print all route paths
if (NODE_ENV !== "production") {
  try {
    logMemory("🛤️ Inspecting routes");
    app._router.stack.forEach((middleware) => {
      if (middleware?.route?.path) {
        const methods = Object.keys(middleware?.route?.methods || {})
          .join(", ")
          .toUpperCase();
        console.log(`✔ ${methods} ${middleware.route.path}`);
      } else if (middleware?.name === "router" && middleware?.handle?.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler?.route?.path) {
            const methods = Object.keys(handler?.route?.methods || {})
              .join(", ")
              .toUpperCase();
            console.log(`✔ ${methods} ${handler.route.path}`);
          }
        });
      }
    });
    logMemory("🛤️ Route inspection complete");
  } catch (err) {
    console.error(
      "❌ Route inspection error:",
      err?.message || "Unknown error"
    );
    if (err instanceof Error) {
      console.error(err.stack);
    } else {
      console.error("Non-Error thrown:", err);
    }
  }
}

// Socket and HTTP error listeners
io.on("error", (err) => {
  logMemory("🔌 SocketIO error");
  console.error("[Server:SocketIO] Error:", err.message);
});

server.on("error", (err) => {
  logMemory("🌐 HTTP server error");
  console.error("[Server:HTTP] Error:", err.message);
});

// Global error listeners
process.on("uncaughtException", (err) => {
  logMemory("❌ Uncaught exception");
  console.error("[UncaughtException] ❌", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logMemory("❌ Unhandled rejection");
  console.error("[UnhandledRejection] ❌", err.message);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    logMemory("🚀 Server startup begin");
    console.log("[Server:Startup] Connecting to MongoDB...");
    logMemory("📚 Before MongoDB connection");
    await connectDb();
    logMemory("📚 After MongoDB connection");
    console.log("[Server:Startup] ✅ Database connected");

    logMemory("🧹 Starting temp cleanup");
    startTempCleanup();
    logMemory("📧 Starting daily digest job");
    startDailyDigestJob();

    server.listen(PORT, "0.0.0.0", function () {
      logMemory(`🌐 Server listening on port ${this.address().port}`);
      console.log(
        `[Server:Startup] ✅ Inksha API running on port ${this.address().port}`
      );
    });
    logMemory("🚀 Server startup complete");
  } catch (err) {
    logMemory("❌ Server startup failed");
    console.error(
      "[Server:Startup] ❌ Failed to start:",
      err.message,
      err.stack
    );
    process.exit(1);
  }
};

startServer();
