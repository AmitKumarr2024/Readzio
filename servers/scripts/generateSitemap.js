import mongoose from "mongoose";
import { SitemapStream } from "sitemap";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import PostModel from "../../servers/Models/Post.js";
import connectDb from "../../servers/config/mongodb.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===================== CONFIG ===================== */
const CONFIG = {
  BASE_URL: process.env.BASE_URL || "https://www.readzio.com",
  OUTPUT_DIR: path.resolve(process.cwd(), "clients/dist"),
  SITEMAP_FILENAME: "sitemap.xml",
  BATCH_SIZE: 1000,
};

/* ================= STATIC ROUTES ================== */
/* ❌ login/signup removed (SEO best practice) */
const STATIC_ROUTES = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/about", changefreq: "monthly", priority: 0.5 },
  { url: "/contact", changefreq: "monthly", priority: 0.5 },
  { url: "/privacy", changefreq: "yearly", priority: 0.3 },
  { url: "/terms-conditions", changefreq: "yearly", priority: 0.3 },
];

/* ================== UTILITIES ===================== */
const isValidSlug = (slug) => {
  if (!slug || typeof slug !== "string") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

/* ================= FETCH POSTS ==================== */
async function fetchPostsInBatches() {
  const posts = [];
  let skip = 0;
  let hasMore = true;

  const totalCount = await PostModel.countDocuments({ isPublished: true });
  if (!totalCount) return posts;

  while (hasMore) {
    const batch = await PostModel.find(
      { isPublished: true },
      "slug updatedAt createdAt"
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(CONFIG.BATCH_SIZE)
      .lean();

    if (!batch.length) {
      hasMore = false;
    } else {
      posts.push(...batch);
      skip += CONFIG.BATCH_SIZE;
    }
  }

  return posts;
}

/* ================= VALIDATION ===================== */
function validatePosts(posts) {
  const validPosts = [];
  const invalidPosts = [];

  posts.forEach((post, index) => {
    if (!post.slug || !isValidSlug(post.slug)) {
      invalidPosts.push({ index, post });
    } else {
      validPosts.push(post);
    }
  });

  return { validPosts, invalidPosts };
}

/* ================= GENERATE SITEMAP ================ */
async function generateSitemap() {
  const startTime = Date.now();

  try {
    /* Ensure output directory */
    if (!existsSync(CONFIG.OUTPUT_DIR)) {
      mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    /* Connect DB */
    await connectDb();

    const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.SITEMAP_FILENAME);

    const sitemap = new SitemapStream({
      hostname: CONFIG.BASE_URL,
      xmlns: { news: false, image: false, video: false, xhtml: false },
    });

    const writeStream = createWriteStream(outputPath);
    sitemap.pipe(writeStream);

    let totalWritten = 0;

    /* -------- STATIC ROUTES -------- */
    STATIC_ROUTES.forEach((route) => {
      sitemap.write({
        url: `${CONFIG.BASE_URL}${route.url}`,
        changefreq: route.changefreq,
        priority: route.priority,
        lastmod: new Date().toISOString(),
      });
      totalWritten++;
    });

    /* -------- POSTS -------- */
    const posts = await fetchPostsInBatches();
    const { validPosts } = validatePosts(posts);

    validPosts.forEach((post) => {
      sitemap.write({
        url: `${CONFIG.BASE_URL}/post/${post.slug}`,
        changefreq: "weekly",
        priority: 0.8,
        lastmod: (post.updatedAt || post.createdAt)?.toISOString(),
      });
      totalWritten++;
    });

    /* -------- FALLBACK -------- */
    if (!totalWritten) {
      sitemap.write({ url: `${CONFIG.BASE_URL}/` });
      totalWritten = 1;
    }

    sitemap.end();

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    return {
      success: true,
      totalUrls: totalWritten,
      duration: ((Date.now() - startTime) / 1000).toFixed(2),
      outputPath,
    };
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

/* ================= RUN DIRECTLY =================== */
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap()
    .then((res) => {
      console.log("✅ Sitemap generated:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Sitemap failed:", err);
      process.exit(1);
    });
}

export default generateSitemap;
