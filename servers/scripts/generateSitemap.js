// scripts/generateSitemap.js
import mongoose from "mongoose";
import { SitemapStream, streamToPromise } from "sitemap";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import PostModel from "../../servers/Models/Post.js"; // Adjust path if needed

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIG ===
const BASE_URL = "https://inksha-uedq.onrender.com"; // ✅ Your live site URL
const MONGO_URI = process.env.MONGO_URI || "your-mongo-uri"; // Use .env or hardcode
const OUTPUT_PATH = path.resolve(__dirname, "../clients/dist/sitemap.xml");

// === Connect to DB ===
await mongoose.connect(MONGO_URI, {
  dbName: "InkshaApp", // or process.env.DB_NAME
});

// === Create sitemap stream ===
const sitemap = new SitemapStream({ hostname: BASE_URL });
const writeStream = createWriteStream(OUTPUT_PATH);
sitemap.pipe(writeStream);

// === Add static pages ===
const staticRoutes = [
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/Term&Condition",
  "/login",
  "/signup",
  "/reset-password",
];
staticRoutes.forEach((url) => sitemap.write({ url }));

// === Add dynamic post URLs ===
const posts = await PostModel.find({ isPublished: true }, "slug").lean();
posts.forEach((post) => {
  sitemap.write({
    url: `/post/${post.slug}`,
    changefreq: "weekly",
    priority: 0.8,
  });
});

sitemap.end();
await streamToPromise(sitemap);

console.log(
  `✅ Sitemap generated with ${posts.length} posts at ${OUTPUT_PATH}`
);
process.exit(0);
