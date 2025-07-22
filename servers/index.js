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

// Routes
import AuthRoutes from "../servers/Routes/authRoutes.js";
import UserRoutes from "../servers/Routes/userRoutes.js";
import PostRoutes from "../servers/Routes/postRoutes.js";
import CategoryRoutes from "../servers/Routes/categoryRoutes.js";
import BlockRoutes from "../servers/Routes/blockRoutes.js";
import FollowRoutes from "../servers/Routes/userFollowRoutes.js";
import NotificationRoutes from "../servers/Routes/notificationRoutes.js";
import RazorpayRoutes from "../servers/Routes/paymentRoutes.js";
import SubscriptionRoutes from "../servers/Routes/subscriptionRoutes.js";
import EarningRoutes from "../servers/Routes/earningRoutes.js";
import AchievementRoutes from "../servers/Routes/AchievementRoutes.js";
import CommentsRoutes from "../servers/Routes/commentRoutes.js";
import AdminRoutes from "../servers/Routes/adminRoutes.js";
import GeojsonRoutes from "../servers/Routes/geojsonRoutes.js";
import PostEmailRoutes from "../servers/Routes/postEmailRoutes.js";
import BannerNotificationRoutes from "../servers/Routes/bannerNotificationRoutes.js";
import guestRoutes from "../servers/Routes/guestRoutes.js";
import errorHandler from "../servers/Middlewares/errorHandler.js";
import { handleRazorpayWebhook } from "./Controllers/paymentController.js";

console.log("[Server:Startup] Initializing Express server");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

const __dirname = path.resolve();

// Add this BEFORE any global express.json() middleware
app.post(
  "/api/razorpay/webhook",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
  handleRazorpayWebhook
);

// Attach Socket.IO instance to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(compression());
console.log("[Server:Middleware] Compression applied");

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
        if (origin) console.log("[Server:CORS] ✅ Allowed:", origin);
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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
console.log("[Server:Middleware] JSON, URL-encoded, cookie-parser applied");

// API Routes
try {
  const routeMounts = [
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

  for (const [mountPath, router] of routeMounts) {
    console.log(`🔌 Mounting route: ${mountPath}`);
    app.use(mountPath, router);
  }
} catch (err) {
  console.error("❌ Route mount error:", err?.stack || err?.message || err);
}

// ads.txt Snippet
app.get("/ads.txt", (req, res) => {
  res.type("text/plain");
  res.send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// Health check route
app.get("/health", (req, res) => {
  const status = {
    status: "OK",
    message: "Server running",
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(status);
});

// ✅ Root path handler to fix "Cannot GET /"
app.get("/", (req, res) => {
  res.redirect(CLIENT_URL);
});


// Error handler
app.use(errorHandler);
console.log("[Server:Middleware] Error handler applied");

// Route inspection (only in development)
if (NODE_ENV !== "production") {
  app.use(express.static(path.join(__dirname, "/clients/dist")));
  console.log("📜 Dumping all registered route paths (safe):");

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
    console.error("❌ Error during route inspection:", err?.stack || err?.message || err);
  }

  const clientIndexPath = path.join(__dirname, "clients", "dist", "index.html");
  if (fs.existsSync(clientIndexPath)) {
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(clientIndexPath);
    });
  } else {
    console.warn("⚠️ Skipping wildcard route: index.html not found");
  }
}

// Socket / HTTP error listeners
io.on("error", (err) => {
  console.error("[Server:SocketIO] Error:", err.message);
});

server.on("error", (err) => {
  console.error("[Server:HTTP] Error:", err.message);
});

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("[Server:UncaughtException] Error:", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("[Server:UnhandledRejection] Error:", err.message);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    console.log("[Server:Startup] Connecting to MongoDB...");
    await connectDb();
    console.log("[Server:Startup] Database connected ✅");

    startTempCleanup();

    server.listen(PORT, () => {
      console.log(`[Server:Startup] 🚀 Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error("[Server:Startup] ❌ Failed to start server:", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();
