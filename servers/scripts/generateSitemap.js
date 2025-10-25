import mongoose from "mongoose";
import { SitemapStream, streamToPromise } from "sitemap";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import PostModel from "../../servers/Models/Post.js";
import connectDb from "../../servers/config/mongodb.js"; // Import server's connect function

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || "https://www.readzio.com",
  OUTPUT_DIR: path.resolve(process.cwd(), "clients/dist"),
  SITEMAP_FILENAME: "sitemap.xml",
  BATCH_SIZE: 1000,
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

// Utility: Validate URL slug
const isValidSlug = (slug) => {
  if (!slug || typeof slug !== "string") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

// Fetch posts in batches to handle large datasets
async function fetchPostsInBatches() {
  const posts = [];
  let skip = 0;
  let hasMore = true;

  try {
    console.log("📚 [Fetch Posts] Starting fetch process...");
    console.log("📚 [Fetch Posts] Model loaded:", !!PostModel);
    console.log(
      "📚 [Fetch Posts] Connection readyState:",
      mongoose.connection.readyState
    );

    // Debug: Count all posts without filter
    const allCount = await PostModel.countDocuments({});
    console.log(`📊 [Fetch Posts] Total posts (no filter): ${allCount}`);

    // Debug: Sample unpublished posts
    const sampleUnpublished = await PostModel.find({ isPublished: false })
      .select("title slug isPublished")
      .limit(3)
      .lean();
    console.log(
      `📊 [Fetch Posts] Sample unpublished (first 3):`,
      JSON.stringify(sampleUnpublished, null, 2)
    );

    const totalCount = await PostModel.countDocuments({ isPublished: true });
    console.log(
      `📊 [Fetch Posts] Total published posts (isPublished: true): ${totalCount}`
    );

    if (totalCount === 0) {
      console.warn(
        "⚠️ [Fetch Posts] No published posts! All isPublished=false?"
      );
      const publishedSample = await PostModel.find({ isPublished: true })
        .select("title slug isPublished")
        .limit(3)
        .lean();
      console.log(
        `📊 [Fetch Posts] Sample published (should be 0):`,
        JSON.stringify(publishedSample, null, 2)
      );
    }

    while (hasMore) {
      console.log(
        `📦 [Fetch Posts] Fetching batch #${
          Math.floor(skip / CONFIG.BATCH_SIZE) + 1
        }, skip: ${skip}`
      );
      const batch = await PostModel.find(
        { isPublished: true },
        "slug updatedAt createdAt title _id" // Added title and _id for debug
      )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(CONFIG.BATCH_SIZE)
        .lean()
        .exec();

      console.log(`📦 [Fetch Posts] Batch fetched, length: ${batch.length}`);
      if (batch.length > 0) {
        console.log(
          `📦 [Fetch Posts] Sample batch post:`,
          JSON.stringify(batch[0], null, 2)
        );
      }

      if (batch.length === 0) {
        hasMore = false;
        console.log("📦 [Fetch Posts] No more data, fetch complete");
      } else {
        posts.push(...batch);
        skip += CONFIG.BATCH_SIZE;
        console.log(
          `📦 [Fetch Posts] Cumulative fetched: ${posts.length}/${totalCount}`
        );
      }
    }

    console.log(`📚 [Fetch Posts] Final total fetched: ${posts.length}`);
    return posts;
  } catch (error) {
    console.error(
      "❌ [Fetch Posts] Error in fetchPostsInBatches:",
      error.message
    );
    console.error("❌ [Fetch Posts] Stack:", error.stack);
    throw error;
  }
}

// Validate and sanitize posts
function validatePosts(posts) {
  console.log(
    `🔍 [Validate Posts] Starting validation on ${posts.length} fetched posts...`
  );

  const validPosts = [];
  const invalidPosts = [];

  posts.forEach((post, index) => {
    console.log(
      `🔍 [Validate Posts] Processing post ${index + 1}/${posts.length}: ID=${
        post._id
      }, Title="${post.title?.substring(0, 50)}...", Slug="${
        post.slug
      }", Published=${post.isPublished}`
    );

    if (!post.slug) {
      console.warn(
        `🔍 [Validate Posts] ❌ Missing slug for post ${post._id}:`,
        JSON.stringify(post, null, 2)
      );
      invalidPosts.push({ index, reason: "Missing slug", post });
      return;
    }

    if (!isValidSlug(post.slug)) {
      console.warn(
        `🔍 [Validate Posts] ❌ Invalid slug '${post.slug}' for post ${post._id}:`,
        JSON.stringify(post, null, 2)
      );
      invalidPosts.push({ index, reason: "Invalid slug format", post });
      return;
    }

    console.log(`🔍 [Validate Posts] ✅ Valid: ${post.slug}`);
    validPosts.push(post);
  });

  console.log(
    `🔍 [Validate Posts] Validation done: ${validPosts.length} valid, ${invalidPosts.length} invalid`
  );

  if (invalidPosts.length > 0) {
    console.warn(`⚠️ [Validate Posts] Details on first 3 invalid:`);
    invalidPosts.slice(0, 3).forEach((item) => {
      console.warn(
        `   - ${item.reason}: ID=${
          item.post._id
        }, Title="${item.post.title?.substring(0, 30)}..."`
      );
    });
    if (invalidPosts.length > 3) {
      console.warn(`   ... and ${invalidPosts.length - 3} more`);
    }
  }

  return { validPosts, invalidPosts };
}

// Generate sitemap
async function generateSitemap() {
  const startTime = Date.now();
  console.log("\n🚀 [Sitemap Gen] Starting sitemap generation...");
  console.log(`📍 [Sitemap Gen] Base URL: ${CONFIG.BASE_URL}`);
  console.log(`📁 [Sitemap Gen] Output dir: ${CONFIG.OUTPUT_DIR}`);

  try {
    // Ensure output directory exists
    if (!existsSync(CONFIG.OUTPUT_DIR)) {
      console.log(
        `📁 [Sitemap Gen] Creating output directory: ${CONFIG.OUTPUT_DIR}`
      );
      mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    // Connect to database using server's method
    console.log("🔌 [Sitemap Gen] Connecting to DB via connectDb...");
    await connectDb();
    console.log(
      "🔌 [Sitemap Gen] DB connected, readyState:",
      mongoose.connection.readyState
    );

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
    console.log("\n📝 [Sitemap Gen] Adding static routes...");
    let totalWritten = 0;
    STATIC_ROUTES.forEach((route) => {
      const entry = {
        url: `${CONFIG.BASE_URL}${route.url}`,
        changefreq: route.changefreq,
        priority: route.priority,
      };
      const success = sitemap.write(entry);
      console.log(`   ${success ? "✓" : "✗ (skipped)"} ${entry.url}`);
      if (success) totalWritten++;
    });
    console.log(`📝 [Sitemap Gen] Static routes added: ${totalWritten}`);

    // Fetch and validate posts
    console.log("\n📚 [Sitemap Gen] Fetching and validating posts...");
    const posts = await fetchPostsInBatches();
    const { validPosts, invalidPosts } = validatePosts(posts);

    console.log(`\n✅ [Sitemap Gen] Valid posts ready: ${validPosts.length}`);
    console.log(`❌ [Sitemap Gen] Invalid posts: ${invalidPosts.length}`);

    let postWritten = 0;
    // Add post URLs
    if (validPosts.length > 0) {
      console.log("\n📝 [Sitemap Gen] Adding post URLs to sitemap...");
      validPosts.forEach((post, index) => {
        const entry = {
          url: `${CONFIG.BASE_URL}/post/${post.slug}`,
          changefreq: "weekly",
          priority: 0.8,
          lastmod: (post.updatedAt || post.createdAt)?.toISOString(),
        };
        const success = sitemap.write(entry);
        if (success) {
          postWritten++;
          if (index < 3) console.log(`   ✓ Added first few: ${entry.url}`);
        } else {
          console.log(`   ✗ Skipped post: ${entry.url}`);
        }

        // Log progress every 100 posts
        if ((index + 1) % 100 === 0) {
          console.log(
            `   📈 Progress: ${index + 1}/${validPosts.length} posts added`
          );
        }
      });
      console.log(
        `   ✓ [Sitemap Gen] All ${validPosts.length} post URLs processed, ${postWritten} written`
      );
    } else {
      console.warn("⚠️ [Sitemap Gen] No valid posts found to add to sitemap");
    }
    totalWritten += postWritten;

    if (totalWritten === 0) {
      console.warn(
        "⚠️ [Sitemap Gen] No entries written, adding homepage fallback"
      );
      const success = sitemap.write({ url: `${CONFIG.BASE_URL}/` });
      if (success) totalWritten = 1;
    }

    // Finalize sitemap
    console.log("📄 [Sitemap Gen] Finalizing sitemap stream...");
    sitemap.end();

    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        console.log("📝 [Sitemap Gen] Sitemap stream finished writing");
        resolve();
      });
      writeStream.on("error", (err) => {
        console.error("❌ [Sitemap Gen] Write stream error:", err);
        reject(err);
      });
    });

    // Verify output file
    if (!existsSync(outputPath)) {
      throw new Error("Sitemap file was not created");
    }

    const stats = await import("fs/promises").then((fs) => fs.stat(outputPath));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ [Sitemap Gen] Sitemap generated successfully!");
    console.log(`📊 [Sitemap Gen] Final Statistics:`);
    console.log(`   - Total URLs: ${totalWritten}`);
    console.log(`   - Static routes: ${STATIC_ROUTES.length}`);
    console.log(
      `   - Post URLs added: ${postWritten} (valid: ${validPosts.length}, invalid: ${invalidPosts.length})`
    );
    console.log(`   - File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   - Generation time: ${duration}s`);
    console.log(`   - Output path: ${outputPath}`);

    return {
      success: true,
      path: outputPath,
      stats: {
        totalUrls: totalWritten,
        staticRoutes: STATIC_ROUTES.length,
        postUrls: validPosts.length,
        invalidPosts: invalidPosts.length,
        fileSize: stats.size,
        duration: parseFloat(duration),
      },
    };
  } catch (error) {
    console.error("\n❌ [Sitemap Gen] Generation failed:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  } finally {
    // Always close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 [Sitemap Gen] Database connection closed");
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap()
    .then((result) => {
      console.log("\n🎉 [Sitemap Gen] Process completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 [Sitemap Gen] Process failed:", error.message);
      console.error("Full error:", error);
      process.exit(1);
    });
}

export default generateSitemap;
