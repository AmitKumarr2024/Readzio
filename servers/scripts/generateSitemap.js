// servers/scripts/generateSitemap.js

import mongoose from "mongoose";
import { SitemapStream, streamToPromise } from "sitemap";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import PostModel from "../../servers/Models/Post.js";
import { MONGO_URI } from "../../servers/config/dotenv.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIG ===
const BASE_URL = "https://readzio.com";
const OUTPUT_PATH = path.resolve(process.cwd(), "clients/dist/sitemap.xml");
console.log("OUTPUT_PATH:", OUTPUT_PATH);

// === Ensure directory exists ===
const distDir = path.dirname(OUTPUT_PATH);
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

async function generateSitemap() {
  try {
    // === Connect to DB ===
    await mongoose.connect(MONGO_URI, { dbName: "InkshaApp" });
    console.log("✅ Connected to MongoDB");

    // === Setup sitemap stream ===
    const sitemap = new SitemapStream({ hostname: BASE_URL });
    const writeStream = createWriteStream(OUTPUT_PATH);
    sitemap.pipe(writeStream);

    // === Static Routes ===
    const staticRoutes = [
      "/",
      "/about",
      "/contact",
      "/privacy",
      "/terms-conditions",
      "/login",
      "/signup",
      "/post", // 👈 added main /post page
    ];
    staticRoutes.forEach((url) =>
      sitemap.write({
        url,
        changefreq: "monthly",
        priority: url === "/" ? 1.0 : 0.7,
      })
    );

    // === Dynamic Routes (all published posts) ===
    const posts = await PostModel.find(
      { isPublished: true },
      "slug updatedAt"
    ).lean();

    console.log(`ℹ️ Found ${posts?.length || 0} published posts`);

    posts.forEach((post) =>
      sitemap.write({
        url: `/post/${post.slug}`,
        changefreq: "weekly",
        priority: 0.8,
        lastmod: post.updatedAt ? post.updatedAt.toISOString() : undefined,
      })
    );

    // === Finalize ===
    const sitemapPromise = streamToPromise(sitemap);
    sitemap.end();
    await sitemapPromise;

    console.log(`✅ Sitemap successfully written to: ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("❌ Sitemap generation failed:", err.message);
  } finally {
    await mongoose.connection.close();
  }
}

generateSitemap();
