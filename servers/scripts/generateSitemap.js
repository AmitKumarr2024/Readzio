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
const BASE_URL = "https://inkshaa-uedq.onrender.com";
const OUTPUT_PATH = path.resolve(__dirname, "../../clients/dist/sitemap.xml");

// === Ensure directory exists ===
const distDir = path.dirname(OUTPUT_PATH);
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// === Connect to DB ===
try {
  await mongoose.connect(MONGO_URI, { dbName: "inkshaapp" });
  console.log("✅ Connected to MongoDB");
} catch (err) {
  console.error("❌ Failed to connect to MongoDB:", err.message);
  process.exit(1);
}

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
  "/Term&Condition",
  "/login",
  "/signup",
  
];
staticRoutes.forEach((url) => sitemap.write({ url }));

// === Dynamic Routes ===
try {
  const posts = await PostModel.find({ isPublished: true }, "slug").lean();
  console.log(`ℹ️  Found ${posts.length} published posts`);

  posts.forEach((post) => {
    sitemap.write({
      url: `/post/${post.slug}`,
      changefreq: "weekly",
      priority: 0.8,
    });
  });

  const sitemapPromise = streamToPromise(sitemap); // ✅ Do this BEFORE .end()
  sitemap.end();
  await sitemapPromise;

  console.log(`✅ Sitemap successfully written to: ${OUTPUT_PATH}`);
} catch (err) {
  console.error("❌ Sitemap generation failed:", err.message);
} finally {
  mongoose.connection.close();
}
