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
  SESSION_SECRET,
  MONGO_URI,
  JWT_SECRET,
} from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import initializeSocket from "./sockets/socket.js";
import { startTempCleanup } from "./Utils/cleanupTemp.js";
import { logMemory } from "../servers/Utils/memoryLogger.js";

// Routes
import AuthRoutes from "./Routes/authRoutes.js";
import UserRoutes from "./Routes/userRoutes.js";
import PostRoutes from "./Routes/postRoutes.js";
import CategoryRoutes from "./Routes/categoryRoutes.js";
import BlockRoutes from "./Routes/blockRoutes.js";
import FollowRoutes from "./Routes/userFollowRoutes.js";
import NotificationRoutes from "./Routes/notificationRoutes.js";
import SubscriptionRoutes from "./Routes/subscriptionRoutes.js";
import EarningRoutes from "./Routes/earningRoutes.js";
import AchievementRoutes from "./Routes/AchievementRoutes.js";
import CommentsRoutes from "./Routes/commentRoutes.js";
import AdminRoutes from "./Routes/adminRoutes.js";
import BannerNotificationRoutes from "./Routes/bannerNotificationRoutes.js";
import guestRoutes from "./Routes/guestRoutes.js";
import errorHandler from "./Middlewares/errorHandler.js";
import { startDailyDigestJob } from "./Utils/startDailyDigestJob.js";

const app = express();
app.set("trust proxy", true);

// Route validation helper
const validateRouter = (router, routeName) => {
  try {
    if (!router || typeof router !== "function") {
      throw new Error(`${routeName} is not a valid router function`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Invalid router detected: ${routeName}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
};

const server = http.createServer(app);
server.setTimeout(120000);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const __dirname = path.resolve();
const io = initializeSocket(server);

const setRouteTimeout = (timeoutMs) => (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      const err = new Error(`Request timeout after ${timeoutMs}ms`);
      err.status = 408;
      next(err);
    }
  }, timeoutMs);

  res.on("finish", () => clearTimeout(timeout));
  res.on("close", () => clearTimeout(timeout));
  next();
};

const requiredEnv = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[dotenv] Missing required env variable: ${key}`);
    process.exit(1);
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  })
);

const allowedOrigins = [
  "http://localhost:5173", // your dev frontend
  "https://readzio.com", // production frontend
  "https://www.readzio.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // if you need cookies/auth
  })
);

app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      if (req.path.includes("/webhook")) req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 50000 })
);

app.use(cookieParser());

const routeConfigs = [
  { path: "/api/auth", router: AuthRoutes, name: "AuthRoutes" },
  { path: "/api/user", router: UserRoutes, name: "UserRoutes" },
  {
    path: "/api/post",
    router: PostRoutes,
    name: "PostRoutes",
    middleware: setRouteTimeout(60000),
  },
  { path: "/api/category", router: CategoryRoutes, name: "CategoryRoutes" },
  { path: "/api/block", router: BlockRoutes, name: "BlockRoutes" },
  { path: "/api/follow", router: FollowRoutes, name: "FollowRoutes" },
  {
    path: "/api/notification",
    router: NotificationRoutes,
    name: "NotificationRoutes",
  },
  {
    path: "/api/subscription",
    router: SubscriptionRoutes,
    name: "SubscriptionRoutes",
  },
  { path: "/api/earning", router: EarningRoutes, name: "EarningRoutes" },
  {
    path: "/api/achievement",
    router: AchievementRoutes,
    name: "AchievementRoutes",
  },
  { path: "/api/comment", router: CommentsRoutes, name: "CommentsRoutes" },
  { path: "/api/admin", router: AdminRoutes, name: "AdminRoutes" },
  {
    path: "/api/bannerNotification",
    router: BannerNotificationRoutes,
    name: "BannerNotificationRoutes",
  },
  {
    path: "/api/public",
    router: guestRoutes,
    name: "guestRoutes",
    middleware: setRouteTimeout(60000),
  },
];

let successfulRoutes = 0;
let failedRoutes = 0;

routeConfigs.forEach(({ path, router, name, middleware }) => {
  try {
    if (!validateRouter(router, name)) {
      console.error(`❌ Skipping invalid router: ${name} at ${path}`);
      failedRoutes++;
      return;
    }
    if (NODE_ENV !== "production")
      console.log(`🛤️ Mounting route: ${path} (${name})`);

    console.log(`[DEBUG] About to mount: ${name} at ${path}`);

    if (middleware) app.use(path, middleware, router);
    else app.use(path, router);

    console.log(`[DEBUG] Successfully mounted: ${name}`);

    successfulRoutes++;
  } catch (err) {
    console.error(`❌ Failed to mount route ${path} (${name}):`, err.message);
    console.error(`Stack trace:`, err.stack);
    failedRoutes++;
    app.use(path, (req, res) => {
      res.status(503).json({
        error: `Service temporarily unavailable: ${name} failed to load`,
        path: req.path,
        method: req.method,
      });
    });
  }
});

console.log(`\n📊 Route mounting summary:`);
console.log(`✅ Successfully mounted: ${successfulRoutes} routes`);
if (failedRoutes > 0) console.log(`❌ Failed to mount: ${failedRoutes} routes`);

if (NODE_ENV !== "production") {
  console.log("⚠️ Route inspection disabled");
}

const publicPath = path.join(__dirname, "servers", "public");
if (fs.existsSync(publicPath)) {
  app.use(
    "/public",
    express.static(publicPath, {
      maxAge: NODE_ENV === "production" ? "1d" : 0,
      etag: true,
      lastModified: true,
    })
  );
} else {
  console.warn("⚠️ Public directory not found:", publicPath);
}

const clientPath = path.join(__dirname, "clients", "dist");
const clientIndexPath = path.join(clientPath, "index.html");

console.log("Client path:", clientPath);
console.log("Index exists:", fs.existsSync(clientIndexPath));

// Static special routes after API routes but before client serving
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /
Sitemap: https://readzio.com/sitemap.xml`);
});

app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.resolve(process.cwd(), "clients/dist/sitemap.xml");
  console.log("Serving sitemap from:", sitemapPath);
  if (fs.existsSync(sitemapPath)) {
    res.setHeader("Content-Type", "application/xml");
    res.sendFile(sitemapPath);
  } else {
    console.warn("⚠️ Sitemap not found:", sitemapPath);
    res.status(404).type("text/plain").send("Sitemap not found");
  }
});

app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

app.get("/health", (req, res) => {
  const memUsage = process.memoryUsage();
  res.status(200).json({
    status: "OK",
    message: "readzio API is running",
    uptime: Math.floor(process.uptime()),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    socket: {
      status: io.engine.clientsCount > 0 ? "active" : "inactive",
      clients: io.engine.clientsCount,
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
    },
    routes: {
      successful: successfulRoutes,
      failed: failedRoutes,
      total: successfulRoutes + failedRoutes,
    },
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    nodeVersion: process.version,
  });
});

if (NODE_ENV === "production") {
  if (fs.existsSync(clientIndexPath)) {
    app.use(
      express.static(clientPath, {
        maxAge: "1d",
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
          if (path.endsWith(".html"))
            res.setHeader("Cache-Control", "no-cache");
        },
      })
    );

    // Serve index.html for all non-API/public paths
    // app.get("*", (req, res, next) => {
    //   const disallowed = [
    //     req.path.startsWith("/api"),
    //     req.path.startsWith("/public"),
    //     req.path === "/health",
    //     req.path === "/robots.txt",
    //     req.path === "/sitemap.xml",
    //     req.path === "/ads.txt",
    //   ];
    //   if (disallowed.some(Boolean)) return next();
    //   res.sendFile(clientIndexPath, (err) => {
    //     if (err) {
    //       console.error(
    //         "[Server:Static] ❌ Failed to serve index.html:",
    //         err.message
    //       );
    //       if (!res.headersSent) res.status(500).send("Internal Server Error");
    //     }
    //   });
    // });

    app.get("/{*splat}", (req, res, next) => {
      const disallowed = [
        req.path.startsWith("/api"),
        req.path.startsWith("/public"),
        req.path === "/health",
        req.path === "/robots.txt",
        req.path === "/sitemap.xml",
        req.path === "/ads.txt",
      ];
      if (disallowed.some(Boolean)) return next();
      res.sendFile(clientIndexPath, (err) => {
        if (err) {
          console.error(
            "[Server:Static] ❌ Failed to serve index.html:",
            err.message
          );
          if (!res.headersSent) res.status(500).send("Internal Server Error");
        }
      });
    });
  } else {
    console.error("❌ Client build not found:", clientIndexPath);
    app.get("/{*splat}", (req, res) => {
      res.status(503).send("Service temporarily unavailable - build not found");
    });
  }
}

app.use("/api/{*splat}", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
    method: req.method,
  });
});

app.use(errorHandler);

const gracefulShutdown = (signal) => {
  console.log(
    `\n[Server:Shutdown] 🛑 Received ${signal}, starting graceful shutdown...`
  );
  server.close((err) => {
    if (err) {
      console.error("[Server:Shutdown] ❌ Error during shutdown:", err.message);
      process.exit(1);
    }
    console.log("[Server:Shutdown] ✅ HTTP server closed");
    mongoose.connection
      .close()
      .then(() => {
        console.log("[Server:Shutdown] ✅ Database connection closed");
        process.exit(0);
      })
      .catch((err) => {
        console.error(
          "[Server:Shutdown] ❌ Database close error:",
          err.message
        );
        process.exit(1);
      });
  });
  setTimeout(() => {
    console.error("[Server:Shutdown] ⚠️ Forcing shutdown after timeout");
    process.exit(1);
  }, 30000);
};

io.on("error", (err) => {
  console.error("[Socket.IO] ❌ Error:", err.message);
});

server.on("error", (err) => {
  console.error("[HTTP Server] ❌ Error:", err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${err.port} is already in use`);
    process.exit(1);
  }
});

server.on("clientError", (err, socket) => {
  console.error("[HTTP Server] ❌ Client error:", err.message);
  if (!socket.destroyed) socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] ❌", err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UnhandledRejection] ❌", reason);
  console.error("Unhandled Rejection at:", promise);
  process.exit(1);
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const startServer = async () => {
  try {
    console.log("[Server:Startup] 🚀 Starting readzio API server...");
    console.log("[Server:Startup] 📊 Environment:", NODE_ENV);
    console.log("[Server:Startup] 📊 Node version:", process.version);
    console.log("[Server:Startup] 📊 Platform:", process.platform);
    console.log("[Server:Startup] 🔌 Connecting to MongoDB...");
    await connectDb();
    console.log("[Server:Startup] ✅ Database connected successfully");
    console.log("[Server:Startup] 🧹 Starting cleanup jobs...");
    startTempCleanup();
    console.log("[Server:Startup] ✅ Background jobs started");
    // ✅ Start daily digest emails
    console.log("[Server:Startup] 🕒 Starting daily digest email job...");
    startDailyDigestJob();
    const port = process.env.PORT || 10002;
    server.listen(port, "0.0.0.0", function () {
      const address = this.address();
      console.log(
        `[Server:Startup] ✅ readzio API running on port ${address.port}`
      );
      console.log(
        `[Server:Startup] 🌐 Server URL: http://0.0.0.0:${address.port}`
      );
      console.log(
        `[Server:Startup] 🔗 Health check: http://0.0.0.0:${address.port}/health`
      );
      if (NODE_ENV === "production")
        console.log(
          "[Server:Startup] 🎯 Production mode: Client app will be served"
        );
      else console.log("[Server:Startup] 🔧 Development mode: API only");
      if (failedRoutes > 0)
        console.warn(
          `[Server:Startup] ⚠️ Warning: ${failedRoutes} routes failed to mount`
        );
    });
  } catch (err) {
    console.error("[Server:Startup] ❌ Failed to start server:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

if (NODE_ENV !== "production") {
  app.get("/", (req, res) => {
    res.send("readzio API is running. Use /health or API endpoints.");
  });
}

startServer();
