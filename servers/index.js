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
import playlistsRoutes from "./Routes/playlistRoutes.js";
import AdminRoutes from "./Routes/adminRoutes.js";
import AdsRoutes from "./Routes/adsRoutes.js";
import BannerNotificationRoutes from "./Routes/bannerNotificationRoutes.js";
import guestRoutes from "./Routes/guestRoutes.js";
import DailyEmailRoutes from "./Routes/dailyMailRoutes.js";
import errorHandler from "./Middlewares/errorHandler.js";
import prerender from "prerender-node";
import PostModel from "../servers/Models/Post.js";
import { smartRateLimiter } from "./Middlewares/smartRateLimiter.js";

const app = express();
app.set("trust proxy", true);

const __dirname = path.resolve();

// =============================================================================
// CONFIGURATION & CONSTANTS
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

// Cache for sitemap stats (to track changes)
let sitemapCache = {
  lastModified: null,
  etag: null,
  content: null,
};

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
// MIDDLEWARE SETUP
// =============================================================================

// Socket.io middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Compression
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  }),
);

// CORS
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

// Body parsing
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
// UTILITY FUNCTIONS (FINAL, SAFE, ONE-TIME ESCAPE)
// =============================================================================

// Decode entities that may already exist in stored content
const decodeHtmlEntities = (str = "") =>
  String(str)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// Escape ONLY for HTML output (after decode)
const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Escape for JSON-LD only (not HTML)
const escapeJson = (str = "") =>
  String(str)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .trim();

// =============================================================================
// SEO BOT HANDLING (GOOGLEBOT, ADSENSE, ETC.) — FIXED
// =============================================================================
app.use(async (req, res, next) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();

  const isSearchBot = /googlebot|bingbot|yandex|duckduckbot|baiduspider/i.test(
    ua,
  );

  // ✅ FIX: AdsBot needs full HTML too — Google AdSense uses this to verify content
  const isAdsBot = /adsbot-google|mediapartners-google/i.test(ua);

  const isAnyBot = isSearchBot || isAdsBot;

  // Skip APIs, sockets, static assets
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/socket.io") ||
    /\.(js|css|png|jpg|jpeg|ico|svg|woff|woff2|ttf|eot|xml|txt)$/.test(req.path)
  ) {
    return next();
  }

  if (isAnyBot && req.path.startsWith("/post/")) {
    const slug = req.path.split("/")[2];

    if (!slug) return next();

    try {
      const post = await PostModel.findOne({ slug, isPublished: true })
        .populate("author", "name")
        .select(
          "title metaTitle metaDescription excerpt blocks ogImage createdAt updatedAt",
        )
        .lean();

      // ✅ FIX: Return proper 404 instead of next() — prevents Google from seeing empty SPA
      if (!post) {
        return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Article Not Found | Readzio</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <h1>404 - Article Not Found</h1>
    <p>This article does not exist or has been removed.</p>
  </body>
</html>`);
      }

      // ----------------------------
      // TEXT EXTRACTION
      // ----------------------------
      const rawText =
        post.blocks?.find((b) => b?.type === "text" && b?.value)?.value || "";

      const cleanText = rawText
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // ----------------------------
      // DESCRIPTION (NORMALIZE → ESCAPE ONCE)
      // ----------------------------
      const rawDescription =
        post.metaDescription ||
        post.excerpt ||
        cleanText.slice(0, 300) ||
        "Explore high-quality articles on Readzio.";

      const normalizedDescription = decodeHtmlEntities(rawDescription);
      const description = escapeHtml(normalizedDescription.slice(0, 160));

      // ----------------------------
      // ARTICLE BODY (for Soft 404 fix)
      // ----------------------------
      // ✅ FIX: Include real article text so Google doesn't see thin content
      const articleBodyText =
        cleanText.length > 0
          ? escapeHtml(cleanText.slice(0, 2000))
          : escapeHtml(normalizedDescription);

      // ----------------------------
      // SAFE VALUES
      // ----------------------------
      const safeTitle = escapeHtml(
        decodeHtmlEntities(post.metaTitle || post.title || "Readzio"),
      );

      const safeAuthor = escapeHtml(
        decodeHtmlEntities(post.author?.name || "Unknown Author"),
      );

      const ogImage =
        typeof post.ogImage === "string" && post.ogImage
          ? post.ogImage
          : "https://www.readzio.com/logo.png";

      const publishedISO = new Date(post.createdAt).toISOString();
      const modifiedISO =
        post.updatedAt instanceof Date
          ? post.updatedAt.toISOString()
          : publishedISO;

      const publishedHuman = new Date(post.createdAt).toDateString();

      // ----------------------------
      // BOT-FRIENDLY STATIC HTML — FIXED
      // ----------------------------
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${safeTitle} | Readzio</title>

    <!-- ✅ FIX 1: Canonical tag — prevents Google from mapping to homepage -->
    <link rel="canonical" href="https://www.readzio.com/post/${slug}" />

    <!-- ✅ FIX 2: Robots meta — explicitly tell Google to index this page -->
    <meta name="robots" content="index, follow" />

    <meta name="description" content="${description}" />

    <!-- Article meta — helps Google understand publish date -->
    <meta property="article:published_time" content="${publishedISO}" />
    <meta property="article:modified_time" content="${modifiedISO}" />
    <meta property="article:author" content="${safeAuthor}" />

    <meta property="og:title" content="${safeTitle} | Readzio" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://www.readzio.com/post/${slug}" />
    <meta property="og:site_name" content="Readzio" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} | Readzio" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />

    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${escapeJson(safeTitle)}",
  "description": "${escapeJson(normalizedDescription.slice(0, 160))}",
  "image": ["${escapeJson(ogImage)}"],
  "url": "https://www.readzio.com/post/${slug}",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.readzio.com/post/${slug}"
  },
  "author": {
    "@type": "Person",
    "name": "${escapeJson(safeAuthor)}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Readzio",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.readzio.com/logo.png"
    }
  },
  "datePublished": "${publishedISO}",
  "dateModified": "${modifiedISO}"
}
    </script>
  </head>

  <body>
    <article itemscope itemtype="https://schema.org/BlogPosting">
      <h1 itemprop="headline">${safeTitle}</h1>

      <time itemprop="datePublished" datetime="${publishedISO}">
        ${publishedHuman}
      </time>

      <span itemprop="author" itemscope itemtype="https://schema.org/Person">
        <span itemprop="name">${safeAuthor}</span>
      </span>

      <p itemprop="description">${description}</p>

      <!-- ✅ FIX 3: Real article body text — fixes Soft 404 (thin content issue) -->
      <div itemprop="articleBody">
        <p>${articleBodyText}</p>
      </div>
    </article>
  </body>
</html>`);
    } catch (err) {
      console.error("❌ Bot SEO render error:", err.message);
      return next();
    }
  }

  next();
});

// =============================================================================
// HOMEPAGE BOT SAFETY FIX (MUST BE BEFORE PRERENDER)
// =============================================================================
const SEO_HOME_PATH = path.join(__dirname, "servers/seo/home.html");

app.get("/", (req, res) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();

  const isSearchBot = /googlebot|bingbot|yandex|duckduckbot|baiduspider/i.test(
    ua,
  );
  const isAdsBot = /adsbot-google|mediapartners-google/i.test(ua);

  if (isSearchBot || isAdsBot) {
    return res.sendFile(SEO_HOME_PATH);
  }

  return res.sendFile(CLIENT_INDEX_PATH);
});

// =============================================================================
// ROUTE CONFIGURATION
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
    name: "PostRoutes",
    router: PostRoutes,
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

  {
    path: "/api/ads",
    router: AdsRoutes,
    name: "AdsRoutes",
  },
];

function mountRoutes() {
  let successfulRoutes = 0;
  let failedRoutes = 0;

  routeConfigs.forEach(({ path, router, name, middleware }) => {
    try {
      if (!validateRouter(router, name)) {
        failedRoutes++;
        app.use(path, (req, res) => {
          res.status(503).json({
            error: `Service unavailable: ${name} failed to load`,
            path: req.path,
            method: req.method,
          });
        });
        return;
      }
      if (middleware) {
        if (Array.isArray(middleware)) {
          app.use(path, ...middleware, router);
        } else {
          app.use(path, middleware, router);
        }
      } else {
        app.use(path, router);
      }

      successfulRoutes++;
      if (NODE_ENV !== "production") {
        console.log(`✅ Mounted: ${path} (${name})`);
      }
    } catch (err) {
      console.error(`❌ Failed to mount ${path} (${name}):`, err.message);
      failedRoutes++;

      app.use(path, (req, res) => {
        res.status(503).json({
          error: `Service unavailable: ${name} initialization failed`,
          path: req.path,
          method: req.method,
        });
      });
    }
  });

  console.log(
    `\n📊 Routes: ✅ ${successfulRoutes} mounted, ❌ ${failedRoutes} failed`,
  );
  return { successfulRoutes, failedRoutes };
}

const routeStats = mountRoutes();

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
  console.log("✅ Public directory mounted");
} else {
  console.warn("⚠️  Public directory not found:", PUBLIC_PATH);
}

// =============================================================================
// SPECIAL ROUTES (robots.txt, sitemap.xml, ads.txt)
// =============================================================================

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
    `User-agent: *
Allow: /
Sitemap: https://www.readzio.com/sitemap.xml

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/`,
  );
});

// ✅ SITEMAP ROUTE - ALWAYS FRESH, NO CACHING
app.get("/sitemap.xml", async (req, res) => {
  try {
    if (!fsSync.existsSync(SITEMAP_PATH)) {
      console.error("❌ Sitemap not found at:", SITEMAP_PATH);
      return res.status(404).type("text/plain").send("Sitemap not found");
    }

    const stats = await fs.stat(SITEMAP_PATH);
    const lastModified = stats.mtime.toUTCString();
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;

    const ifNoneMatch = req.headers["if-none-match"];
    const ifModifiedSince = req.headers["if-modified-since"];

    if (ifNoneMatch === etag || ifModifiedSince === lastModified) {
      console.log("✅ Sitemap: Client has latest version (304)");
      return res.status(304).end();
    }

    const sitemapContent = await fs.readFile(SITEMAP_PATH, "utf-8");

    if (
      !sitemapContent.includes("<?xml") ||
      !sitemapContent.includes("<urlset")
    ) {
      console.error("❌ Invalid sitemap XML structure");
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

    console.log("✅ Sitemap served successfully (FRESH, NO CACHE)");
    console.log(`   - Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   - Last Modified: ${lastModified}`);
    console.log(`   - ETag: ${etag}`);
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
      age: `${Math.floor(
        (Date.now() - stats.mtime.getTime()) / 60000,
      )} minutes ago`,
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
    routes: {
      successful: routeStats.successfulRoutes,
      failed: routeStats.failedRoutes,
      total: routeStats.successfulRoutes + routeStats.failedRoutes,
    },
    sitemap: {
      exists: sitemapExists,
      path: sitemapExists ? SITEMAP_PATH : null,
      stats: sitemapStats,
    },
  });
});

// Serve Vite public assets (favicons, manifest, etc.)
app.use(express.static(path.join(__dirname, "clients", "public")));

// =============================================================================
// CLIENT SERVING (PRODUCTION)
// =============================================================================

if (NODE_ENV === "production") {
  if (fsSync.existsSync(CLIENT_INDEX_PATH)) {
    app.use(
      express.static(CLIENT_PATH, {
        maxAge: "1d",
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      }),
    );

    app.get("*", (req, res, next) => {
      const skipRoutes = [
        "/api",
        "/public",
        "/health",
        "/robots.txt",
        "/sitemap.xml",
        "/ads.txt",
      ];

      if (skipRoutes.some((route) => req.path.startsWith(route))) {
        return next();
      }

      res.sendFile(CLIENT_INDEX_PATH, (err) => {
        if (err) {
          console.error("❌ Failed to serve index.html:", err.message);
          if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
          }
        }
      });
    });

    console.log("✅ Client app mounted (production mode)");
  } else {
    console.error("❌ Client build not found:", CLIENT_INDEX_PATH);
    app.get("*", (req, res) => {
      res.status(503).send("Service unavailable - client build not found");
    });
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
// 404 HANDLER FOR API ROUTES
// =============================================================================

app.use("/api/{*splat}", (req, res) => {
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
// ERROR HANDLERS
// =============================================================================

io.on("error", (err) => {
  console.error("[Socket.IO] ❌ Error:", err.message);
});

server.on("error", (err) => {
  console.error("[HTTP Server] ❌ Error:", err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  }
});

server.on("clientError", (err, socket) => {
  console.error("[HTTP Server] ❌ Client error:", err.message);
  if (!socket.destroyed) {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  }
});

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] ❌", err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UnhandledRejection] ❌", reason);
  console.error("Promise:", promise);
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
        console.log("[Shutdown] ✅ Database connection closed");
        process.exit(0);
      })
      .catch((err) => {
        console.error("[Shutdown] ❌ Database close error:", err.message);
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
        console.log(`   Last modified: ${stats.mtime.toISOString()}`);
      } else {
        console.warn("⚠️  Sitemap not found - run sitemap generator");
      }
    }

    server.listen(PORT, "0.0.0.0", function () {
      const address = this.address();
      console.log(`\n✅ Server running on port ${address.port}`);
      console.log(`🌐 URL: http://0.0.0.0:${address.port}`);
      console.log(`🔗 Health: http://0.0.0.0:${address.port}/health`);
      console.log(`🗺️  Sitemap: http://0.0.0.0:${address.port}/sitemap.xml`);

      if (NODE_ENV === "production") {
        console.log("🎯 Mode: Production (serving client app)");
      } else {
        console.log("🔧 Mode: Development (API only)");
      }

      if (routeStats.failedRoutes > 0) {
        console.warn(
          `⚠️  Warning: ${routeStats.failedRoutes} routes failed to mount`,
        );
      }

      console.log("\n✨ Server ready!\n");
    });
  } catch (err) {
    console.error("\n❌ Failed to start server:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

startServer();
