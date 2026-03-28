import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import mongoose from "mongoose";

import {
  CLIENT_URL,
  NODE_ENV,
  MONGO_URI,
  JWT_SECRET,
} from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import initializeSocket from "./sockets/socket.js";
import { startTempCleanup } from "./Utils/cleanupTemp.js";
import { startDailyDigestJob } from "./Utils/startDailyDigestJob.js";

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
import playlistsRoutes from "./Routes/playlistRoutes.js";
import AdminRoutes from "./Routes/adminRoutes.js";
import AdsRoutes from "./Routes/adsRoutes.js";
import BannerNotificationRoutes from "./Routes/bannerNotificationRoutes.js";
import guestRoutes from "./Routes/guestRoutes.js";
import DailyEmailRoutes from "./Routes/dailyMailRoutes.js";
import errorHandler from "./Middlewares/errorHandler.js";
import { smartRateLimiter } from "./Middlewares/smartRateLimiter.js";
import {
  botRenderMiddleware,
  rendererAdminRoutes,
  warmUpRenderer,
} from "./services/puppeteerRenderer.js";

const app = express();
app.set("trust proxy", true);
const __dirname = path.resolve();

// =============================================================================
// CONSTANTS
// =============================================================================

const PORT = process.env.PORT || 10002;
const SITEMAP_PATH = path.resolve(process.cwd(), "clients/dist/sitemap.xml");
const CLIENT_PATH = path.join(__dirname, "clients", "dist");
const CLIENT_INDEX_PATH = path.join(CLIENT_PATH, "index.html");
const PUBLIC_PATH = path.join(__dirname, "servers", "public");

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://readzio.com",
  "https://www.readzio.com",
];

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      "❌ Missing required environment variables:",
      missing.join(", "),
    );
    process.exit(1);
  }
  console.log("✅ Environment variables validated");
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const validateRouter = (router, routeName) => {
  if (!router || typeof router !== "function") {
    console.error(`❌ Invalid router: ${routeName}`);
    return false;
  }
  return true;
};

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

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

const server = http.createServer(app);
server.setTimeout(120000);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const io = initializeSocket(server);

// =============================================================================
// MIDDLEWARE
// =============================================================================

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
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS policy"), false);
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      if (req.path.includes("/webhook")) req.rawBody = buf;
    },
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 50000,
  }),
);

app.use(cookieParser());

// =============================================================================
// BOT SSR MIDDLEWARE (Puppeteer — production only)
// Bots get fully-rendered HTML. Normal users get React CSR as before.
// =============================================================================

if (NODE_ENV === "production") {
  app.use(botRenderMiddleware);
  console.log("✅ Puppeteer bot-render middleware active");
}

// =============================================================================
// SPECIAL ROUTES
// =============================================================================

app.get("/robots.txt", (req, res) => {
  res
    .type("text/plain")
    .send(
      `User-agent: *\nAllow: /\nSitemap: https://www.readzio.com/sitemap.xml\n\nDisallow: /api/\nDisallow: /admin/`,
    );
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    if (!fsSync.existsSync(SITEMAP_PATH)) {
      console.error("❌ Sitemap not found at:", SITEMAP_PATH);
      return res.status(404).type("text/plain").send("Sitemap not found");
    }

    const stats = await fs.stat(SITEMAP_PATH);
    const lastModified = stats.mtime.toUTCString();
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;

    if (
      req.headers["if-none-match"] === etag ||
      req.headers["if-modified-since"] === lastModified
    ) {
      return res.status(304).end();
    }

    const sitemapContent = await fs.readFile(SITEMAP_PATH, "utf-8");

    if (
      !sitemapContent.includes("<?xml") ||
      !sitemapContent.includes("<urlset")
    ) {
      return res.status(500).type("text/plain").send("Invalid sitemap format");
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, max-age=0",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Last-Modified", lastModified);
    res.setHeader("ETag", etag);
    res.send(sitemapContent);
  } catch (error) {
    console.error("❌ Error serving sitemap:", error.message);
    res.status(500).type("text/plain").send("Error loading sitemap");
  }
});

app.get("/ads.txt", (req, res) => {
  res
    .type("text/plain")
    .send("google.com, pub-8408980890451581, DIRECT, f08c47fec0942fa0");
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/health", (req, res) => {
  const memUsage = process.memoryUsage();
  const sitemapExists = fsSync.existsSync(SITEMAP_PATH);
  let sitemapStats = null;

  if (sitemapExists) {
    const stats = fsSync.statSync(SITEMAP_PATH);
    sitemapStats = {
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      lastModified: stats.mtime.toISOString(),
      age: `${Math.floor((Date.now() - stats.mtime.getTime()) / 60000)} minutes ago`,
    };
  }

  res.status(200).json({
    status: "OK",
    message: "readzio API is running",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    nodeVersion: process.version,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    socket: {
      status: io.engine.clientsCount > 0 ? "active" : "inactive",
      clients: io.engine.clientsCount,
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    sitemap: {
      exists: sitemapExists,
      path: sitemapExists ? SITEMAP_PATH : null,
      stats: sitemapStats,
    },
    renderer: {
      mode: NODE_ENV === "production" ? "puppeteer (local)" : "disabled (dev)",
      status: "check /api/render/status for live metrics",
    },
  });
});

// =============================================================================
// ROUTES
// =============================================================================

const routeConfigs = [
  {
    path: "/api/auth",
    name: "AuthRoutes",
    router: AuthRoutes,
    middleware: smartRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 500,
      keyGenerator: (req) => req.ip,
    }),
  },
  { path: "/api/user", router: UserRoutes, name: "UserRoutes" },
  { path: "/api/playlists", router: playlistsRoutes, name: "playlistsRoutes" },
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
    path: "/api/dailyMail",
    router: DailyEmailRoutes,
    name: "DailyEmailRoutes",
  },
  {
    path: "/api/bannerNotification",
    router: BannerNotificationRoutes,
    name: "BannerNotificationRoutes",
  },
  {
    path: "/api/public",
    name: "guestRoutes",
    router: guestRoutes,
    middleware: [
      smartRateLimiter({
        windowMs: 10 * 60 * 1000,
        max: 200,
        keyGenerator: (req) => req.ip,
      }),
      setRouteTimeout(60000),
    ],
  },
  { path: "/api/ads", router: AdsRoutes, name: "AdsRoutes" },
  // Renderer admin — /api/render/status  and  DELETE /api/render/cache
  {
    path: "/api/render",
    name: "RendererAdmin",
    router: rendererAdminRoutes(express.Router()),
  },
];

function mountRoutes() {
  let successfulRoutes = 0;
  let failedRoutes = 0;

  routeConfigs.forEach(({ path, router, name, middleware }) => {
    try {
      if (!validateRouter(router, name)) {
        failedRoutes++;
        app.use(path, (req, res) =>
          res
            .status(503)
            .json({ error: `Service unavailable: ${name} failed to load` }),
        );
        return;
      }
      if (middleware) {
        if (Array.isArray(middleware)) app.use(path, ...middleware, router);
        else app.use(path, middleware, router);
      } else {
        app.use(path, router);
      }
      successfulRoutes++;
    } catch (err) {
      console.error(`❌ Failed to mount ${path} (${name}):`, err.message);
      failedRoutes++;
      app.use(path, (req, res) =>
        res.status(503).json({
          error: `Service unavailable: ${name} initialization failed`,
        }),
      );
    }
  });

  console.log(
    `\n📊 Routes: ✅ ${successfulRoutes} mounted, ❌ ${failedRoutes} failed`,
  );
  return { successfulRoutes, failedRoutes };
}

mountRoutes();

// =============================================================================
// STATIC FILE SERVING
// =============================================================================

if (fsSync.existsSync(PUBLIC_PATH)) {
  app.use(
    "/public",
    express.static(PUBLIC_PATH, {
      maxAge: NODE_ENV === "production" ? "1d" : 0,
      etag: true,
      lastModified: true,
    }),
  );
}

app.use(express.static(path.join(__dirname, "clients", "public")));

// =============================================================================
// CLIENT SERVING — production
// =============================================================================

if (NODE_ENV === "production") {
  if (fsSync.existsSync(CLIENT_INDEX_PATH)) {
    app.use(
      express.static(CLIENT_PATH, {
        maxAge: "1d",
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html"))
            res.setHeader("Cache-Control", "no-cache");
        },
      }),
    );

    app.get("/{*wildcard}", (req, res, next) => {
      const skipRoutes = [
        "/api",
        "/public",
        "/health",
        "/robots.txt",
        "/sitemap.xml",
        "/ads.txt",
      ];
      if (skipRoutes.some((route) => req.path.startsWith(route))) return next();
      res.sendFile(CLIENT_INDEX_PATH, (err) => {
        if (err) {
          console.error("❌ Failed to serve index.html:", err.message);
          if (!res.headersSent) res.status(500).send("Internal Server Error");
        }
      });
    });

    console.log("✅ Client app mounted (production mode)");
  } else {
    console.error("❌ Client build not found:", CLIENT_INDEX_PATH);
    app.get("/{*wildcard}", (req, res) =>
      res.status(503).send("Service unavailable - client build not found"),
    );
  }
} else {
  app.get("/", (req, res) => {
    res.json({
      message: "readzio API is running in development mode",
      endpoints: {
        health: "/health",
        api: "/api/*",
        sitemap: "/sitemap.xml",
        robots: "/robots.txt",
      },
    });
  });
}

// =============================================================================
// API 404 HANDLER
// =============================================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.use(errorHandler);

// =============================================================================
// ERROR LISTENERS
// =============================================================================

io.on("error", (err) => console.error("[Socket.IO] ❌ Error:", err.message));

server.on("error", (err) => {
  console.error("[HTTP Server] ❌ Error:", err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  }
});

server.on("clientError", (err, socket) => {
  if (!socket.destroyed) socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] ❌", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[UnhandledRejection] ❌", reason);
  process.exit(1);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

function gracefulShutdown(signal) {
  console.log(
    `\n[Shutdown] 🛑 Received ${signal}, starting graceful shutdown...`,
  );
  const shutdownTimeout = setTimeout(() => {
    console.error("[Shutdown] ⚠️  Forcing shutdown after timeout");
    process.exit(1);
  }, 30000);

  server.close((err) => {
    clearTimeout(shutdownTimeout);
    if (err) {
      console.error("[Shutdown] ❌ Error closing server:", err.message);
      process.exit(1);
    }
    console.log("[Shutdown] ✅ HTTP server closed");
    mongoose.connection
      .close()
      .then(() => {
        console.log("[Shutdown] ✅ Database closed");
        process.exit(0);
      })
      .catch((err) => {
        console.error("[Shutdown] ❌ DB close error:", err.message);
        process.exit(1);
      });
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    console.log("\n🚀 Starting readzio API server...");
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`📊 Node: ${process.version}`);
    console.log(`📊 Platform: ${process.platform}`);

    validateEnvironment();

    console.log("🔌 Connecting to MongoDB...");
    await connectDb();
    console.log("✅ Database connected");

    console.log("🧹 Starting background jobs...");
    startTempCleanup();
    startDailyDigestJob();
    console.log("✅ Background jobs started");

    if (NODE_ENV === "production") {
      if (fsSync.existsSync(SITEMAP_PATH)) {
        const stats = fsSync.statSync(SITEMAP_PATH);
        console.log(`✅ Sitemap found: ${(stats.size / 1024).toFixed(2)}KB`);
      } else {
        console.warn("⚠️  Sitemap not found - run sitemap generator");
      }

      // Warm up browser so first bot request doesn't stall
      console.log("🌐 Warming up Puppeteer browser...");
      await warmUpRenderer();
    }

    server.listen(PORT, "0.0.0.0", function () {
      const address = this.address();
      console.log(`\n✅ Server running on port ${address.port}`);
      console.log(`🌐 URL: http://0.0.0.0:${address.port}`);
      console.log(`🔗 Health: http://0.0.0.0:${address.port}/health`);
      console.log(`🗺️  Sitemap: http://0.0.0.0:${address.port}/sitemap.xml`);
      console.log(
        `📊 Renderer: http://0.0.0.0:${address.port}/api/render/status`,
      );
      console.log(
        NODE_ENV === "production"
          ? "🎯 Mode: Production"
          : "🔧 Mode: Development",
      );
      console.log("\n✨ Server ready!\n");
    });
  } catch (err) {
    console.error("\n❌ Failed to start server:", err.message, err.stack);
    process.exit(1);
  }
}

startServer();
