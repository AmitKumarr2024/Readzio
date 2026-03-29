/**
 * puppeteerRenderer.js
 * ─────────────────────────────────────────────────────────────────
 * Safe Puppeteer SSR renderer for 1GB RAM servers.
 *
 * Strategy for post pages:
 *  Instead of waiting for React to hydrate (which requires auth),
 *  we fetch post data from the public API directly and inject
 *  correct meta tags into the HTML shell before serving to bots.
 *  This gives Google the right title, description, and schema
 *  without needing Puppeteer to render the full React app.
 */

import puppeteer from "puppeteer";
import http from "http";

// =============================================================================
// CONFIG
// =============================================================================

const RENDER_TIMEOUT_MS = 25_000;
const TITLE_WAIT_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const MAX_QUEUE_SIZE = 10;
const LOCAL_PORT = process.env.PORT || 10002;

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
    cache.delete(cache.keys().next().value);
  }
  cache.set(url, { html, ts: Date.now() });
}

// =============================================================================
// FETCH POST DATA FROM PUBLIC API (no auth needed)
// =============================================================================

function fetchPostData(slug) {
  return new Promise((resolve) => {
    const options = {
      hostname: "127.0.0.1",
      port: LOCAL_PORT,
      path: `/api/public/post/${encodeURIComponent(slug)}`,
      method: "GET",
      headers: { "User-Agent": "ReadzioSSR/1.0" },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.post) {
            resolve(parsed.post);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

// =============================================================================
// BUILD STATIC HTML FOR POST (injected meta tags into index.html shell)
// =============================================================================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractTextFromBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b.type === "text" && b.value)
    .map((b) => b.value.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 300);
}

function buildPostHtml(post, indexHtml, publicUrl) {
  const title = escapeHtml(post.title || "");
  const description = escapeHtml(
    extractTextFromBlocks(post.blocks) || `Read ${post.title} on Readzio.`,
  ).slice(0, 160);
  const image = post.thumbnail || "https://www.readzio.com/logo.png";
  const author = post.author?.name || "Readzio";
  const publishedAt = post.createdAt
    ? new Date(post.createdAt).toISOString()
    : new Date().toISOString();
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const readTime = post.readTime || "";
  const canonical = publicUrl;

  // Build JSON-LD
  const articleSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: description.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
    image: image,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: "Readzio",
      logo: { "@type": "ImageObject", url: "https://www.readzio.com/logo.png" },
    },
    datePublished: publishedAt,
    dateModified: publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    keywords: tags.join(", "),
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.readzio.com/",
      },
      { "@type": "ListItem", position: 2, name: post.title, item: canonical },
    ],
  });

  // Inject into <head> — replace the static fallback title and add all meta
  const injectedHead = `
    <title>${title} | Readzio</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="${escapeHtml(author)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />

    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Readzio" />
    <meta property="article:published_time" content="${publishedAt}" />
    <meta property="article:author" content="${escapeHtml(author)}" />
    ${tags.map((t) => `<meta property="article:tag" content="${escapeHtml(t)}" />`).join("\n    ")}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:site" content="@readzio" />

    <!-- Extra -->
    ${readTime ? `<meta name="twitter:label1" content="Reading time" /><meta name="twitter:data1" content="${escapeHtml(readTime)}" />` : ""}

    <!-- Structured Data -->
    <script type="application/ld+json">${articleSchema}</script>
    <script type="application/ld+json">${breadcrumbSchema}</script>

    <!-- Prerender hint -->
    <meta name="prerender-status-code" content="200" />
  `;

  // Also inject visible content for Google to index
  // This goes into #root so Google sees the actual article text
  const visibleContent = `
    <article itemscope itemtype="https://schema.org/Article" style="max-width:800px;margin:0 auto;padding:20px;font-family:sans-serif;">
      <h1 itemprop="headline" style="font-size:1.8rem;font-weight:bold;margin-bottom:1rem;">${title}</h1>
      <div style="color:#666;margin-bottom:1rem;">
        <span itemprop="author" itemscope itemtype="https://schema.org/Person">
          By <span itemprop="name">${escapeHtml(author)}</span>
        </span>
        ${readTime ? ` · ${escapeHtml(readTime)}` : ""}
        <meta itemprop="datePublished" content="${publishedAt}" />
      </div>
      ${post.thumbnail ? `<img src="${escapeHtml(post.thumbnail)}" alt="${title}" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:1rem;" itemprop="image" />` : ""}
      <div itemprop="articleBody">
        ${extractTextFromBlocks(post.blocks)
          .split(". ")
          .map((s) => `<p>${escapeHtml(s.trim())}.</p>`)
          .join("")}
      </div>
      ${tags.length > 0 ? `<div style="margin-top:1rem;">${tags.map((t) => `<span style="display:inline-block;margin:4px;padding:4px 8px;background:#f0f0f0;border-radius:4px;font-size:0.8rem;">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    </article>
  `;

  // Replace static title in index.html
  let html = indexHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${title} | Readzio</title>`)
    .replace("</head>", `${injectedHead}\n</head>`)
    .replace('<div id="root">', `<div id="root">${visibleContent}`);

  return html;
}

// =============================================================================
// READ INDEX.HTML ONCE
// =============================================================================

import { readFileSync, existsSync } from "fs";
import { join } from "path";

let _indexHtml = null;

function getIndexHtml() {
  if (_indexHtml) return _indexHtml;
  const paths = [
    join(process.cwd(), "clients/dist/index.html"),
    join(process.cwd(), "../clients/dist/index.html"),
    "/root/readzio/clients/dist/index.html",
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      _indexHtml = readFileSync(p, "utf-8");
      console.log(`[Renderer] 📄 Loaded index.html from ${p}`);
      return _indexHtml;
    }
  }
  console.error("[Renderer] ❌ index.html not found!");
  return null;
}

// =============================================================================
// BROWSER MANAGER (kept for non-post pages)
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
      console.warn("[Renderer] ⚠️  Browser disconnected");
      browser = null;
    });

    console.log("[Renderer] ✅ Browser launched");
  } finally {
    browserRestarting = false;
  }
  return browser;
}

// =============================================================================
// RENDER QUEUE
// =============================================================================

let activeRenders = 0;
const queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    if (queue.length >= MAX_QUEUE_SIZE)
      return reject(new Error("Render queue full"));
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
// PUPPETEER RENDER (for non-post pages like homepage, category pages etc.)
// =============================================================================

async function puppeteerRender(publicUrl, pathAndQuery) {
  return enqueue(async () => {
    const b = await getBrowser();
    const page = await b.newPage();

    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const type = req.resourceType();
        const url = req.url();
        if (["image", "stylesheet", "font", "media"].includes(type))
          return req.abort();
        if (
          url.includes("googlesyndication") ||
          url.includes("googletagmanager") ||
          url.includes("doubleclick") ||
          url.includes("adsterra") ||
          url.includes("hilltopads") ||
          url.includes("hotjar") ||
          url.includes("clarity.ms") ||
          url.includes("facebook.net")
        )
          return req.abort();
        req.continue();
      });

      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      );

      const localUrl = `http://127.0.0.1:${LOCAL_PORT}${pathAndQuery}`;
      console.log(`[Renderer] 🔄 Puppeteer rendering: ${localUrl}`);

      await Promise.race([
        page.goto(localUrl, {
          waitUntil: "networkidle2",
          timeout: RENDER_TIMEOUT_MS,
        }),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Render timeout")), RENDER_TIMEOUT_MS),
        ),
      ]);

      await page
        .waitForFunction(
          (fallbacks) => {
            const title = document.title.toLowerCase().trim();
            if (!title || fallbacks.some((f) => f && title.includes(f)))
              return false;
            const root = document.getElementById("root");
            return root && root.innerText.trim().length > 150;
          },
          { timeout: TITLE_WAIT_TIMEOUT_MS, polling: 500 },
          FALLBACK_TITLES,
        )
        .then(() => true)
        .catch(() => false);

      await new Promise((r) => setTimeout(r, 300));
      const html = await page.content();
      const capturedTitle = await page.title().catch(() => "unknown");
      console.log(`[Renderer] ✅ Puppeteer: "${capturedTitle}"`);
      return html;
    } finally {
      await page.close().catch(() => {});
    }
  });
}

// =============================================================================
// MAIN RENDER DISPATCHER
// =============================================================================

// Extract slug from /post/:slug path
function extractPostSlug(urlPath) {
  const match = urlPath.match(/^\/post\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function renderPage(publicUrl, pathAndQuery) {
  const cached = cacheGet(publicUrl);
  if (cached) {
    console.log(`[Renderer] 📦 Cache hit: ${publicUrl}`);
    return cached;
  }

  const slug = extractPostSlug(pathAndQuery);

  // ── POST PAGE: use public API + HTML injection (fast, no auth needed) ──
  if (slug) {
    console.log(`[Renderer] 📰 Post page detected, fetching: ${slug}`);
    const post = await fetchPostData(slug);

    if (post) {
      const indexHtml = getIndexHtml();
      if (!indexHtml) throw new Error("index.html not found");

      const html = buildPostHtml(post, indexHtml, publicUrl);
      console.log(`[Renderer] ✅ Post injected: "${post.title}"`);
      cacheSet(publicUrl, html);
      return html;
    }

    console.warn(
      `[Renderer] ⚠️  Public API returned no post for slug: ${slug}`,
    );
    // Fall through to Puppeteer as last resort
  }

  // ── OTHER PAGES: use Puppeteer ──
  try {
    const html = await puppeteerRender(publicUrl, pathAndQuery);
    if (html) {
      cacheSet(publicUrl, html);
      return html;
    }
  } catch (err) {
    console.error(`[Renderer] ❌ Puppeteer failed: ${err.message}`);
  }

  return null;
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
// EXPRESS MIDDLEWARE
// =============================================================================

export async function botRenderMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  if (req.headers["x-ssr-internal"] === "1") return next();
  if (!isBot(ua) || shouldSkip(req.path)) return next();

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const publicUrl = `${protocol}://${host}${req.originalUrl}`;
  const pathAndQuery = req.originalUrl;

  console.log(`[Renderer] 🤖 Bot: ${ua.slice(0, 50)} → ${publicUrl}`);

  try {
    const html = await renderPage(publicUrl, pathAndQuery);

    if (!html) {
      console.warn(
        `[Renderer] ⚠️  No HTML produced for ${publicUrl} — falling through`,
      );
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
    // Pre-load index.html so first request is fast
    getIndexHtml();
    await getBrowser();
    console.log("[Renderer] ✅ Warm-up complete");
  } catch (e) {
    console.warn("[Renderer] ⚠️  Warm-up failed:", e.message);
  }
}
