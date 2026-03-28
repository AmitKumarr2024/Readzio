/**
 * puppeteerRenderer.js
 * ─────────────────────────────────────────────────────────────────
 * Safe Puppeteer SSR renderer for 1GB RAM servers.
 *
 * Features:
 *  ✅ Single shared browser instance (no per-request Chrome spawn)
 *  ✅ Request queue — max 1 concurrent render (prevents RAM explosion)
 *  ✅ LRU-style in-memory cache (10 min TTL, max 100 entries)
 *  ✅ Per-render timeout (12s) — never hangs
 *  ✅ Auto browser restart on crash
 *  ✅ Bot detection middleware (drop-in prerender replacement)
 *
 * Usage in server.js:
 *   import { botRenderMiddleware } from "./puppeteerRenderer.js";
 *   if (NODE_ENV === "production") app.use(botRenderMiddleware);
 */

import puppeteer from "puppeteer";

// =============================================================================
// CONFIG
// =============================================================================

const RENDER_TIMEOUT_MS = 12_000; // max time to render one page
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX_ENTRIES = 100;
const MAX_QUEUE_SIZE = 10; // drop requests beyond this

// Bot user-agents that need SSR
const BOT_PATTERNS = [
  "googlebot",
  "google-inspectiontool",
  "adsbot-google",
  "googleother",
  "google-extended",
  "apis-google",
  "storebot-google",
  "bingbot",
  "bingpreview",
  "msnbot",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "anthropic",
  "perplexitybot",
  "perplexity-user",
  "meta-externalagent",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "slackbot",
  "pinterest",
  "yandex",
  "duckduckbot",
  "baiduspider",
  "semrushbot",
  "ahrefsbot",
];

// Static extensions — never render these
const SKIP_EXT = new Set([
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".pdf",
  ".zip",
  ".mp4",
  ".mp3",
  ".xml",
  ".txt",
  ".json",
  ".webp",
]);

// =============================================================================
// CACHE  (simple Map with TTL + max-size eviction)
// =============================================================================

const cache = new Map(); // url → { html, ts }

function cacheGet(url) {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  return entry.html;
}

function cacheSet(url, html) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // evict oldest
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(url, { html, ts: Date.now() });
}

// =============================================================================
// BROWSER MANAGER
// =============================================================================

let browser = null;
let browserRestarting = false;

async function getBrowser() {
  if (browser && browser.connected) return browser;
  if (browserRestarting) {
    // wait up to 5s for restart
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (browser && browser.connected) return browser;
    }
    throw new Error("Browser restart timed out");
  }

  browserRestarting = true;
  try {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process", // critical for 1GB RAM
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-sync",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-first-run",
        "--metrics-recording-only",
        "--safebrowsing-disable-auto-update",
      ],
    });

    browser.on("disconnected", () => {
      console.warn(
        "[Renderer] ⚠️  Browser disconnected — will restart on next request",
      );
      browser = null;
    });

    console.log("[Renderer] ✅ Browser launched");
  } finally {
    browserRestarting = false;
  }

  return browser;
}

// =============================================================================
// RENDER QUEUE  (concurrency = 1)
// =============================================================================

let activeRenders = 0;
const queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    if (queue.length >= MAX_QUEUE_SIZE) {
      return reject(new Error("Render queue full"));
    }
    queue.push({ fn, resolve, reject });
    drainQueue();
  });
}

async function drainQueue() {
  if (activeRenders > 0 || queue.length === 0) return;
  const { fn, resolve, reject } = queue.shift();
  activeRenders++;
  try {
    resolve(await fn());
  } catch (e) {
    reject(e);
  } finally {
    activeRenders--;
    drainQueue();
  }
}

// =============================================================================
// CORE RENDER FUNCTION
// =============================================================================

async function renderPage(fullUrl) {
  const cached = cacheGet(fullUrl);
  if (cached) {
    console.log(`[Renderer] 📦 Cache hit: ${fullUrl}`);
    return cached;
  }

  return enqueue(async () => {
    const b = await getBrowser();
    const page = await b.newPage();

    try {
      // Block ads/trackers/media to speed up render + save RAM
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const type = req.resourceType();
        if (["image", "stylesheet", "font", "media"].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent(
        "Mozilla/5.0 (compatible; ReadzioRenderer/1.0; +https://readzio.com)",
      );

      await Promise.race([
        page.goto(fullUrl, { waitUntil: "networkidle0" }),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Render timeout")), RENDER_TIMEOUT_MS),
        ),
      ]);

      const html = await page.content();
      cacheSet(fullUrl, html);
      console.log(`[Renderer] ✅ Rendered: ${fullUrl}`);
      return html;
    } finally {
      await page.close().catch(() => {});
    }
  });
}

// =============================================================================
// BOT DETECTION HELPERS
// =============================================================================

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((p) => ua.includes(p));
}

function shouldSkip(urlPath) {
  if (urlPath.startsWith("/api/")) return true;
  if (urlPath.startsWith("/public/")) return true;
  const clean = urlPath.split("?")[0];
  const dot = clean.lastIndexOf(".");
  if (dot !== -1 && SKIP_EXT.has(clean.slice(dot))) return true;
  return false;
}

// =============================================================================
// EXPRESS MIDDLEWARE  (drop-in replacement for prerender-node)
// =============================================================================

export async function botRenderMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";

  if (!isBot(ua) || shouldSkip(req.path)) return next();

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  console.log(`[Renderer] 🤖 Bot detected (${ua.split(" ")[0]}) → ${fullUrl}`);

  try {
    const html = await renderPage(fullUrl);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Rendered-By", "puppeteer");
    res.send(html);
  } catch (err) {
    console.error(`[Renderer] ❌ Render failed for ${fullUrl}:`, err.message);
    // Fall through to normal React CSR — better than a 5xx
    next();
  }
}

// =============================================================================
// CACHE MANAGEMENT ENDPOINTS  (mount on /api/render/*)
// =============================================================================

export function rendererAdminRoutes(router) {
  // GET /api/render/status
  router.get("/status", (req, res) => {
    res.json({
      browserConnected: browser?.connected ?? false,
      activeRenders,
      queueLength: queue.length,
      cacheEntries: cache.size,
    });
  });

  // DELETE /api/render/cache  — flush cache
  router.delete("/cache", (req, res) => {
    const count = cache.size;
    cache.clear();
    console.log(`[Renderer] 🗑  Cache cleared (${count} entries)`);
    res.json({ cleared: count });
  });

  return router;
}

// =============================================================================
// WARM UP  (call at server startup so first bot request isn't slow)
// =============================================================================

export async function warmUpRenderer() {
  try {
    await getBrowser();
    console.log("[Renderer] ✅ Warm-up complete");
  } catch (e) {
    console.warn(
      "[Renderer] ⚠️  Warm-up failed (will retry on first request):",
      e.message,
    );
  }
}
