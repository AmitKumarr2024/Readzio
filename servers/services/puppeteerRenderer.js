/**
 * puppeteerRenderer.js
 * ─────────────────────────────────────────────────────────────────
 * Safe Puppeteer SSR renderer for 1GB RAM servers.
 *
 * Features:
 *  ✅ Single shared browser instance (no per-request Chrome spawn)
 *  ✅ Request queue — max 1 concurrent render (prevents RAM explosion)
 *  ✅ LRU-style in-memory cache (10 min TTL, max 100 entries)
 *  ✅ Per-render timeout (20s) — never hangs
 *  ✅ Auto browser restart on crash
 *  ✅ Bot detection middleware (drop-in prerender replacement)
 *  ✅ Renders against localhost — bypasses Cloudflare + avoids loops
 *  ✅ Waits for page-specific title (not homepage fallback)
 *  ✅ Proper prerender headers for Cloudflare caching
 */

import puppeteer from "puppeteer";

// =============================================================================
// CONFIG
// =============================================================================

const RENDER_TIMEOUT_MS = 20_000; // increased — React data fetch needs time
const TITLE_WAIT_TIMEOUT_MS = 15_000; // wait for correct title
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const MAX_QUEUE_SIZE = 10;

// Port your Express server runs on — must match server.js PORT
const LOCAL_PORT = process.env.PORT || 10002;

// Fallback titles that mean React hasn't loaded page-specific content yet
const FALLBACK_TITLES = [
  "readzio – write ideas",
  "readzio – get feedback",
  "write ideas, get feedback",
  "readzio",
  "",
];

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
  "claude-user",
  "claude-searchbot",
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
// CACHE
// =============================================================================

const cache = new Map();

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
        "--single-process",
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
// RENDER QUEUE (concurrency = 1)
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

async function renderPage(publicUrl, localUrl) {
  // Cache key = public URL (so same page isn't rendered twice for different bots)
  const cached = cacheGet(publicUrl);
  if (cached) {
    console.log(`[Renderer] 📦 Cache hit: ${publicUrl}`);
    return cached;
  }

  return enqueue(async () => {
    const b = await getBrowser();
    const page = await b.newPage();

    try {
      // Block heavy/third-party resources — speeds up render, saves RAM
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const type = req.resourceType();
        const url = req.url();

        if (["image", "stylesheet", "font", "media"].includes(type)) {
          return req.abort();
        }

        if (
          url.includes("googlesyndication") ||
          url.includes("googletagmanager") ||
          url.includes("doubleclick") ||
          url.includes("adsterra") ||
          url.includes("hilltopads") ||
          url.includes("hotjar") ||
          url.includes("clarity.ms") ||
          url.includes("facebook.net") ||
          url.includes("twitter.com/i/jot")
        ) {
          return req.abort();
        }

        req.continue();
      });

      // Use a real Chrome UA so your own API doesn't rate-limit or block it
      // NOT a bot string — avoids triggering botRenderMiddleware on API calls
      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      );

      // ── KEY FIX ──────────────────────────────────────────────────────────
      // Render against localhost directly — bypasses Cloudflare entirely
      // and avoids the bot-detection loop on the public URL.
      // We set the Host header so React Router and API calls work correctly.
      // ─────────────────────────────────────────────────────────────────────
      await page.setExtraHTTPHeaders({
        Host: "www.readzio.com",
        "X-Forwarded-Proto": "https",
        "X-Forwarded-Host": "www.readzio.com",
        "X-SSR-Internal": "1", // sentinel — lets you identify internal renders in logs
      });

      console.log(`[Renderer] 🔄 Rendering: ${localUrl}`);

      await Promise.race([
        page.goto(localUrl, { waitUntil: "networkidle2" }),
        new Promise((_, rej) =>
          setTimeout(
            () => rej(new Error("Navigation timeout")),
            RENDER_TIMEOUT_MS,
          ),
        ),
      ]);

      // ── WAIT FOR PAGE-SPECIFIC TITLE ─────────────────────────────────────
      // This is the critical wait — we keep polling until the title changes
      // from the generic homepage fallback to the actual post/page title.
      // React Helmet updates the title after the API response arrives.
      // ─────────────────────────────────────────────────────────────────────
      await page
        .waitForFunction(
          (fallbackTitles) => {
            const title = document.title.toLowerCase().trim();
            if (!title) return false;

            // Still showing homepage fallback — keep waiting
            if (fallbackTitles.some((f) => title.includes(f))) return false;

            // Must have real content in root too
            const root = document.getElementById("root");
            return root && root.innerText.trim().length > 150;
          },
          { timeout: TITLE_WAIT_TIMEOUT_MS, polling: 300 },
          FALLBACK_TITLES,
        )
        .catch(() => {
          console.warn(
            `[Renderer] ⚠️  Title wait timed out for ${publicUrl} — title: "${
              // log current title for debugging
              ""
            }" — returning best-effort HTML`,
          );
        });

      // Extra 500ms buffer for Helmet to finish flushing all meta tags
      await new Promise((r) => setTimeout(r, 500));

      const html = await page.content();

      // Sanity check — log the title we actually captured
      const capturedTitle = await page.title().catch(() => "unknown");
      console.log(
        `[Renderer] ✅ Captured title: "${capturedTitle}" for ${publicUrl}`,
      );

      cacheSet(publicUrl, html);
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
  // Never prerender API, public assets, or internal SSR sentinel requests
  if (urlPath.startsWith("/api/")) return true;
  if (urlPath.startsWith("/public/")) return true;
  const clean = urlPath.split("?")[0];
  const dot = clean.lastIndexOf(".");
  if (dot !== -1 && SKIP_EXT.has(clean.slice(dot))) return true;
  return false;
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

export async function botRenderMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";

  // Skip internal SSR renders (Puppeteer calling back into Express)
  if (req.headers["x-ssr-internal"] === "1") return next();

  if (!isBot(ua) || shouldSkip(req.path)) return next();

  // Build both URLs:
  // publicUrl  — canonical URL for cache key + correct Host header
  // localUrl   — localhost URL Puppeteer actually fetches (bypasses CF)
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const publicUrl = `${protocol}://${host}${req.originalUrl}`;
  const localUrl = `http://127.0.0.1:${LOCAL_PORT}${req.originalUrl}`;

  console.log(`[Renderer] 🤖 Bot: ${ua.slice(0, 40)} → ${publicUrl}`);

  try {
    const html = await renderPage(publicUrl, localUrl);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Prerender-Status", "200");
    res.setHeader("X-Prerender-By", "puppeteer-self-hosted");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Robots-Tag", "index, follow");
    res.send(html);
  } catch (err) {
    console.error(`[Renderer] ❌ Failed: ${publicUrl} — ${err.message}`);
    next();
  }
}

// =============================================================================
// CACHE MANAGEMENT ENDPOINTS
// =============================================================================

export function rendererAdminRoutes(router) {
  router.get("/status", (req, res) => {
    res.json({
      browserConnected: browser?.connected ?? false,
      activeRenders,
      queueLength: queue.length,
      cacheEntries: cache.size,
      cacheMaxEntries: CACHE_MAX_ENTRIES,
      cacheTTLMinutes: CACHE_TTL_MS / 60000,
    });
  });

  router.delete("/cache", (req, res) => {
    const count = cache.size;
    cache.clear();
    console.log(`[Renderer] 🗑  Cache cleared (${count} entries)`);
    res.json({ cleared: count });
  });

  router.delete("/cache/url", (req, res) => {
    const { url } = req.query;
    if (!url)
      return res.status(400).json({ error: "url query param required" });
    const existed = cache.has(url);
    cache.delete(url);
    res.json({ deleted: existed, url });
  });

  return router;
}

// =============================================================================
// WARM UP
// =============================================================================

export async function warmUpRenderer() {
  try {
    await getBrowser();
    console.log("[Renderer] ✅ Warm-up complete");
  } catch (e) {
    console.warn("[Renderer] ⚠️  Warm-up failed:", e.message);
  }
}
