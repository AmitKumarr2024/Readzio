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

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || "https://www.readzio.com",
  OUTPUT_DIR: path.resolve(process.cwd(), "clients/dist"),
  SITEMAP_FILENAME: "sitemap.xml",
  DB_NAME: process.env.DB_NAME || "readziopp",
  BATCH_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

// Static routes configuration
const STATIC_ROUTES = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/about", changefreq: "monthly", priority: 0.7 },
  { url: "/contact", changefreq: "monthly", priority: 0.7 },
  { url: "/privacy", changefreq: "yearly", priority: 0.5 },
  { url: "/terms-conditions", changefreq: "yearly", priority: 0.5 },
  { url: "/login", changefreq: "monthly", priority: 0.6 },
  { url: "/signup", changefreq: "monthly", priority: 0.6 },
  { url: "/post", changefreq: "daily", priority: 0.8 },
];

// Utility: Sleep function for retries
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility: Validate URL slug
const isValidSlug = (slug) => {
  if (!slug || typeof slug !== "string") return false;
  // Check for valid URL characters
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

// Utility: Connect to database with retry logic
async function connectWithRetry(retries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      if (mongoose.connection.readyState === 1) {
        console.log("✅ Already connected to MongoDB");
        return;
      }

      await mongoose.connect(MONGO_URI, {
        dbName: CONFIG.DB_NAME,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ Connected to MongoDB successfully");
      return;
    } catch (error) {
      console.error(
        `❌ MongoDB connection attempt ${i + 1}/${retries} failed:`,
        error.message
      );
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${CONFIG.RETRY_DELAY / 1000}s...`);
        await sleep(CONFIG.RETRY_DELAY);
      } else {
        throw new Error(
          `Failed to connect to MongoDB after ${retries} attempts`
        );
      }
    }
  }
}

// Fetch posts in batches to handle large datasets
async function fetchPostsInBatches() {
  const posts = [];
  let skip = 0;
  let hasMore = true;

  try {
    const totalCount = await PostModel.countDocuments({ isPublished: true });
    console.log(`📊 Total published posts in database: ${totalCount}`);

    while (hasMore) {
      const batch = await PostModel.find(
        { isPublished: true },
        "slug updatedAt createdAt"
      )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(CONFIG.BATCH_SIZE)
        .lean()
        .exec();

      if (batch.length === 0) {
        hasMore = false;
      } else {
        posts.push(...batch);
        skip += CONFIG.BATCH_SIZE;
        console.log(`📦 Fetched batch: ${posts.length}/${totalCount} posts`);
      }
    }

    return posts;
  } catch (error) {
    console.error("❌ Error fetching posts:", error.message);
    throw error;
  }
}

// Validate and sanitize posts
function validatePosts(posts) {
  const validPosts = [];
  const invalidPosts = [];

  posts.forEach((post, index) => {
    if (!post.slug) {
      invalidPosts.push({ index, reason: "Missing slug", post });
      return;
    }

    if (!isValidSlug(post.slug)) {
      invalidPosts.push({ index, reason: "Invalid slug format", post });
      return;
    }

    validPosts.push(post);
  });

  if (invalidPosts.length > 0) {
    console.warn(`⚠️  Found ${invalidPosts.length} invalid posts:`);
    invalidPosts.slice(0, 5).forEach((item) => {
      console.warn(`   - ${item.reason}: ${JSON.stringify(item.post)}`);
    });
    if (invalidPosts.length > 5) {
      console.warn(`   ... and ${invalidPosts.length - 5} more`);
    }
  }

  return { validPosts, invalidPosts };
}

// Generate sitemap
async function generateSitemap() {
  const startTime = Date.now();
  console.log("\n🚀 Starting sitemap generation...");
  console.log(`📍 Base URL: ${CONFIG.BASE_URL}`);
  console.log(
    `📁 Output: ${path.join(CONFIG.OUTPUT_DIR, CONFIG.SITEMAP_FILENAME)}`
  );

  try {
    // Ensure output directory exists
    if (!existsSync(CONFIG.OUTPUT_DIR)) {
      console.log(`📁 Creating output directory: ${CONFIG.OUTPUT_DIR}`);
      mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    // Connect to database
    await connectWithRetry();

    // Initialize sitemap stream
    const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.SITEMAP_FILENAME);
    const sitemap = new SitemapStream({
      hostname: CONFIG.BASE_URL,
      xmlns: {
        news: false,
        xhtml: false,
        image: false,
        video: false,
      },
    });
    const writeStream = createWriteStream(outputPath);

    sitemap.pipe(writeStream);

    // Add static routes
    console.log("\n📝 Adding static routes...");
    STATIC_ROUTES.forEach((route) => {
      sitemap.write(route);
      console.log(`   ✓ ${route.url}`);
    });

    // Fetch and validate posts
    console.log("\n📚 Fetching posts from database...");
    const posts = await fetchPostsInBatches();
    const { validPosts, invalidPosts } = validatePosts(posts);

    console.log(`\n✅ Valid posts: ${validPosts.length}`);
    console.log(`❌ Invalid posts: ${invalidPosts.length}`);

    // Add post URLs
    if (validPosts.length > 0) {
      console.log("\n📝 Adding post URLs...");
      validPosts.forEach((post, index) => {
        sitemap.write({
          url: `/post/${post.slug}`,
          changefreq: "weekly",
          priority: 0.8,
          lastmod: (post.updatedAt || post.createdAt)?.toISOString(),
        });

        // Log progress every 100 posts
        if ((index + 1) % 100 === 0) {
          console.log(`   ✓ Added ${index + 1}/${validPosts.length} posts`);
        }
      });
      console.log(`   ✓ Added all ${validPosts.length} posts`);
    } else {
      console.warn("⚠️  No valid posts found to add to sitemap");
    }

    // Finalize sitemap
    sitemap.end();
    await streamToPromise(sitemap);

    // Verify output file
    if (!existsSync(outputPath)) {
      throw new Error("Sitemap file was not created");
    }

    const stats = await import("fs/promises").then((fs) => fs.stat(outputPath));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ Sitemap generated successfully!");
    console.log(`📊 Statistics:`);
    console.log(`   - Total URLs: ${STATIC_ROUTES.length + validPosts.length}`);
    console.log(`   - Static routes: ${STATIC_ROUTES.length}`);
    console.log(`   - Post URLs: ${validPosts.length}`);
    console.log(`   - File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   - Generation time: ${duration}s`);
    console.log(`   - Output: ${outputPath}`);

    return {
      success: true,
      path: outputPath,
      stats: {
        totalUrls: STATIC_ROUTES.length + validPosts.length,
        staticRoutes: STATIC_ROUTES.length,
        postUrls: validPosts.length,
        invalidPosts: invalidPosts.length,
        fileSize: stats.size,
        duration: parseFloat(duration),
      },
    };
  } catch (error) {
    console.error("\n❌ Sitemap generation failed:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  } finally {
    // Always close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap()
    .then((result) => {
      console.log("\n🎉 Process completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Process failed:", error.message);
      process.exit(1);
    });
}

export default generateSitemap;
