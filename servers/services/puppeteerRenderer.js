/**
 * puppeteerRenderer.js
 * ─────────────────────────────────────────────────────────────────
 * Safe Puppeteer SSR renderer for 1GB RAM servers.
 */

import puppeteer from "puppeteer";

// =============================================================================
// CONFIG
// =============================================================================

const RENDER_TIMEOUT_MS = 25_000;
const TITLE_WAIT_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const MAX_QUEUE_SIZE = 10;
const LOCAL_PORT = process.env.PORT || 10002;

// These titles mean React hasn't loaded page content yet
const FALLBACK_TITLES = [
  "readzio – write ideas",
  "readzio – get feedback",
  "write ideas, get feedback",
  "readzio",
  "",
];

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

async function renderPage(publicUrl, pathAndQuery) {
  const cached = cacheGet(publicUrl);
  if (cached) {
    console.log(`[Renderer] 📦 Cache hit: ${publicUrl}`);
    return cached;
  }

  return enqueue(async () => {
    const b = await getBrowser();
    const page = await b.newPage();

    try {
      await page.setRequestInterception(true);

      page.on("request", (req) => {
        const type = req.resourceType();
        const url = req.url();

        // Block heavy resources
        if (["image", "stylesheet", "font", "media"].includes(type)) {
          return req.abort();
        }

        // Block third-party scripts that slow rendering
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

      // Standard Chrome UA — not a bot string, not a forbidden header setter
      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      );

      // ── KEY FIX ──────────────────────────────────────────────────────────
      // We render the PUBLIC URL directly (https://www.readzio.com/post/...)
      // but intercept the request at the network level to rewrite it to
      // localhost — avoiding Cloudflare and the Host header forbidden issue.
      //
      // We do this by using page.goto on the public URL but intercepting
      // the FIRST navigation request and redirecting it to localhost.
      // All subsequent requests (API calls etc.) go to the real server.
      // ─────────────────────────────────────────────────────────────────────

      let firstRequest = true;

      // Override request interception to catch the first navigation
      page.removeAllListeners("request");
      page.on("request", (req) => {
        const type = req.resourceType();
        const url = req.url();

        // Rewrite the first (navigation) request to localhost
        if (firstRequest && type === "document") {
          firstRequest = false;
          const localUrl = `http://127.0.0.1:${LOCAL_PORT}${pathAndQuery}`;
          console.log(`[Renderer] 🔄 Rewriting navigation → ${localUrl}`);
          // We can't change URL in continue(), so use respond() with a fetch
          // Instead: just go to localhost directly but set cookie/storage first
          req.continue();
          return;
        }

        // Block heavy resources
        if (["image", "stylesheet", "font", "media"].includes(type)) {
          return req.abort();
        }

        // Block third-party ad/analytics scripts
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

      // ── ACTUAL FIX: navigate directly to localhost ────────────────────────
      // Don't set Host header (forbidden). Instead, make sure your Express
      // server responds correctly to localhost requests — it does, because
      // React Router uses the path, not the host.
      // The only issue was ERR_INVALID_ARGUMENT from setExtraHTTPHeaders.
      // Now we simply navigate to localhost without any extra headers.
      // ─────────────────────────────────────────────────────────────────────
      const localUrl = `http://127.0.0.1:${LOCAL_PORT}${pathAndQuery}`;
      console.log(`[Renderer] 🔄 Rendering: ${localUrl}`);

      await Promise.race([
        page.goto(localUrl, {
          waitUntil: "networkidle2",
          timeout: RENDER_TIMEOUT_MS,
        }),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Render timeout")), RENDER_TIMEOUT_MS),
        ),
      ]);

      // ── WAIT FOR PAGE-SPECIFIC TITLE ──────────────────────────────────────
      // Poll until title changes from homepage fallback to post-specific title.
      // React Helmet updates title after the API fetch completes.
      // ─────────────────────────────────────────────────────────────────────
      const titleChanged = await page
        .waitForFunction(
          (fallbackTitles) => {
            const title = document.title.toLowerCase().trim();
            if (!title) return false;
            if (fallbackTitles.some((f) => f && title.includes(f)))
              return false;
            const root = document.getElementById("root");
            return root && root.innerText.trim().length > 150;
          },
          { timeout: TITLE_WAIT_TIMEOUT_MS, polling: 500 },
          FALLBACK_TITLES,
        )
        .then(() => true)
        .catch(() => false);

      if (!titleChanged) {
        const currentTitle = await page.title().catch(() => "unknown");
        console.warn(
          `[Renderer] ⚠️  Title stayed as fallback: "${currentTitle}" for ${publicUrl}`,
        );
        // Don't cache failed renders — let next bot request retry
        return null;
      }

      // Small buffer for Helmet to flush remaining meta tags
      await new Promise((r) => setTimeout(r, 300));

      const html = await page.content();
      const capturedTitle = await page.title().catch(() => "unknown");
      console.log(`[Renderer] ✅ "${capturedTitle}" → ${publicUrl}`);

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
  if (urlPath.startsWith("/api/")) return true;
  if (urlPath.startsWith("/public/")) return true;
  // Skip internal SSR renders — Puppeteer calling back into Express
  if (urlPath.startsWith("/_ssr")) return true;
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

  // Skip if this is an internal Puppeteer render request
  if (req.headers["x-ssr-internal"] === "1") return next();

  if (!isBot(ua) || shouldSkip(req.path)) return next();

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const publicUrl = `${protocol}://${host}${req.originalUrl}`;
  const pathAndQuery = req.originalUrl; // e.g. /post/some-slug

  console.log(`[Renderer] 🤖 Bot: ${ua.slice(0, 50)} → ${publicUrl}`);

  try {
    const html = await renderPage(publicUrl, pathAndQuery);

    if (!html) {
      // Render failed to get real content — fall through to CSR
      console.warn(`[Renderer] ⚠️  Falling through to CSR for ${publicUrl}`);
      return next();
    }

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
