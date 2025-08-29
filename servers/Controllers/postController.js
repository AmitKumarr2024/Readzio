import PostModel from "../../servers/Models/Post.js";
import GuestModel from "../../servers/Models/GuestModel.js";
import AnalyticsModel from "../../servers/Models/AnalyticsModel.js";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../../servers/Utils/uploadToCloudinary.js";
import sharp from "sharp";
import slugify from "slugify";
import axios from "axios";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import mongoose from "mongoose";
import { io } from "../../servers/sockets/socket.js";
import { calculateReadTime } from "../helpers/postHelper.js";
import pLimit from "p-limit";
import NodeCache from "node-cache";
import PostInteraction from "../../servers/Models/PostInteraction.js";
import { logMemory } from "../../servers/Utils/memoryLogger.js";
import DOMPurify from "isomorphic-dompurify";

const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Validates ObjectId
const validateObjectId = (id, type = "ID") => {
  logMemory(`Before validateObjectId: ${type}`);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid ${type}`,
      400,
      "ValidateObjectId",
      `Invalid ${type} provided`
    );
  }
  logMemory(`After validateObjectId: ${type}`);
};

// Fallback slug generator with safety limit
const fallbackSlugify = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100); // Limit length
};

// Async retry with exponential backoff
const asyncRetry = async (fn, options = {}) => {
  const { retries = 5, minTimeout = 2000, maxTimeout = 10000 } = options;
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === retries - 1) break; // Don't wait on last attempt
      const delay = Math.min(minTimeout * Math.pow(2, i), maxTimeout);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Improved content sanitization
const sanitizeContent = (content) => {
  if (!content || typeof content !== "string") return content;

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
  });
};

// Rate limiting check
const checkRateLimit = (userId, cache) => {
  const rateLimitKey = `createPost:${userId}`;
  const recentAttempts = cache.get(rateLimitKey) || 0;

  if (recentAttempts >= 5) {
    throw new AppError(
      "Too many post creation attempts. Please try again later.",
      429,
      "CreatePost"
    );
  }

  cache.set(rateLimitKey, recentAttempts + 1, 300); // 5 minutes
  return true;
};

// Validate image content
const validateImageContent = async (buffer) => {
  try {
    const image = sharp(buffer, { failOnError: false });
    const { format, width, height, channels, hasAlpha } =
      await image.metadata();

    if (!format || !width || !height) {
      throw new AppError(
        "Invalid image file - corrupted or not an image",
        400,
        "ValidateImage"
      );
    }

    if (channels > 4) {
      throw new AppError(
        "Unsupported image format - too many channels",
        400,
        "ValidateImage"
      );
    }

    // Check for extremely small images (likely broken)
    if (width < 10 || height < 10) {
      throw new AppError(
        "Image too small - minimum 10x10 pixels required",
        400,
        "ValidateImage"
      );
    }

    // Check for extremely large images
    if (width > 10000 || height > 10000) {
      throw new AppError(
        "Image too large - maximum 10000x10000 pixels allowed",
        400,
        "ValidateImage"
      );
    }

    return { format, width, height, channels, hasAlpha };
  } catch (err) {
    throw new AppError(
      `Image validation failed: ${err.message}`,
      400,
      "ValidateImage"
    );
  }
};

// High-quality image processing
const processImage = async (source, id, folder) => {
  let buffer = null;
  let optimizedBuffer = null;

  try {
    let originalFormat;
    const startTime = Date.now();

    // Handle image source
    if (source.startsWith("data:image")) {
      const [, imgFormat, base64Data] =
        source.match(/^data:image\/([a-z]+);base64,(.+)$/) || [];
      if (
        !base64Data ||
        !["jpeg", "jpg", "png", "webp", "tiff"].includes(imgFormat)
      ) {
        throw new AppError(
          `Invalid or unsupported image format: ${imgFormat}`,
          400,
          "ProcessImage"
        );
      }
      buffer = Buffer.from(base64Data, "base64");
      originalFormat = imgFormat === "jpg" ? "jpeg" : imgFormat;
    } else if (source.startsWith("http")) {
      try {
        const response = await axios.get(source, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          maxContentLength: 15 * 1024 * 1024, // 15MB limit
          maxRedirects: 3,
        });
        buffer = Buffer.from(response.data, "binary");

        // Try to determine format from content-type
        const contentType = response.headers["content-type"];
        if (contentType && contentType.startsWith("image/")) {
          originalFormat = contentType.split("/")[1];
        }
      } catch (err) {
        if (err.code === "ETIMEDOUT") {
          throw new AppError(
            `Image download timeout: ${id}`,
            408,
            "ProcessImage"
          );
        }
        if (err.code === "ENOTFOUND") {
          throw new AppError(`Image URL not found: ${id}`, 404, "ProcessImage");
        }
        throw new AppError(
          `Failed to fetch image from URL: ${err.message}`,
          400,
          "ProcessImage"
        );
      }
    } else {
      throw new AppError(
        "Unsupported image source - must be data URL or HTTP(S) URL",
        400,
        "ProcessImage"
      );
    }

    // Validate file size (increased limit)
    if (buffer.length > 15 * 1024 * 1024) {
      throw new AppError(
        `Image size exceeds 15MB limit: ${(buffer.length / 1024 / 1024).toFixed(
          2
        )}MB`,
        413,
        "ProcessImage"
      );
    }

    // Validate image content
    const metadata = await validateImageContent(buffer);
    originalFormat = metadata.format;

    const image = sharp(buffer, {
      failOnError: false,
      density: 300, // High DPI for better quality
      limitInputPixels: false,
      sequentialRead: true, // Better for large images
    });

    console.log(
      `[processImage] Input image ${id}: format=${metadata.format}, size=${(
        buffer.length / 1024
      ).toFixed(1)}KB, dimensions=${metadata.width}x${metadata.height}`
    );

    // Determine processing parameters
    const isThumbnail = folder.includes("thumbnails");
    const isHighRes = metadata.width > 2000 || metadata.height > 2000;

    // Improved dimension limits
    const MAX_DIMENSION = isThumbnail ? 1920 : isHighRes ? 3840 : 2560;
    const shouldResize =
      metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;

    let processedImage = image;

    // Apply resize with high-quality settings
    if (shouldResize) {
      processedImage = processedImage.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3, // Highest quality resampling
      });
      console.log(
        `[processImage] Resized ${id} to max ${MAX_DIMENSION}px using Lanczos3`
      );
    }

    // Smart format selection and quality optimization
    let outputFormat;
    let qualitySettings;

    if (originalFormat === "png" && metadata.hasAlpha) {
      // Preserve PNG with transparency
      qualitySettings = {
        quality: 98,
        compressionLevel: 6,
        adaptiveFiltering: true,
        effort: 10, // Maximum effort for PNG
        force: true,
      };
      optimizedBuffer = await processedImage.png(qualitySettings).toBuffer();
      outputFormat = "png";
    } else if (isThumbnail) {
      // High-quality WebP for thumbnails
      qualitySettings = {
        quality: 88, // Sweet spot for thumbnails
        effort: 6,
        smartSubsample: false, // Better quality
        nearLossless: false,
        alphaQuality: 90,
        force: true,
      };
      optimizedBuffer = await processedImage.webp(qualitySettings).toBuffer();
      outputFormat = "webp";
    } else {
      // High-quality WebP for content images
      qualitySettings = {
        quality: isHighRes ? 85 : 90, // Slightly lower for very large images
        effort: 6, // Maximum effort
        smartSubsample: false, // Better quality
        nearLossless: false,
        alphaQuality: 85,
        force: true,
      };
      optimizedBuffer = await processedImage.webp(qualitySettings).toBuffer();
      outputFormat = "webp";
    }

    const compressionRatio =
      ((buffer.length - optimizedBuffer.length) / buffer.length) * 100;
    const processingTime = Date.now() - startTime;

    console.log(
      `[processImage] Optimized ${id}: originalSize=${(
        buffer.length / 1024
      ).toFixed(1)}KB, optimizedSize=${(optimizedBuffer.length / 1024).toFixed(
        1
      )}KB, format=${outputFormat}, compression=${compressionRatio.toFixed(
        1
      )}%, time=${processingTime}ms`
    );

    // Warn if compression is too aggressive
    if (compressionRatio > 85) {
      console.warn(
        `[processImage] High compression ratio for ${id}: ${compressionRatio.toFixed(
          1
        )}%`
      );
    }

    // Upload with optimized Cloudinary settings
    const result = await asyncRetry(
      () =>
        uploadToCloudinary({
          buffer: optimizedBuffer,
          folder,
          transformation: [
            {
              fetch_format: "auto",
              quality: "auto:best", // Use best quality available
              dpr: "auto",
              flags: [
                "progressive",
                "immutable_cache",
                "preserve_transparency",
              ],
            },
          ],
          resource_type: "image",
          format: outputFormat,
        }),
      { retries: 3, minTimeout: 2000 }
    );

    if (!result?.secure_url) {
      throw new AppError(
        "Image upload failed - no URL returned",
        500,
        "ProcessImage"
      );
    }

    console.log(
      `[processImage] Successfully uploaded ${id}: ${result.secure_url}`
    );

    return result.secure_url;
  } catch (err) {
    console.error(`[processImage] Error processing ${id}:`, err);
    throw new AppError(
      err.message || `Image processing failed: ${id}`,
      err.status || 500,
      "ProcessImage"
    );
  } finally {
    // Clean up memory
    buffer = null;
    optimizedBuffer = null;
  }
};

// Improved block processing
const processBlock = async (block, blockLimit, imageLimit) => {
  logMemory(`🛠️ Start processBlock ${block.id || "unknown"}`);

  try {
    const processedBlock = { ...block };

    // Process image blocks with quality preservation
    if (block.type === "image" && block.src && !block.isEmbed) {
      logMemory(`🖼️ Processing image block ${block.id}`);
      processedBlock.src = await imageLimit(() =>
        processImage(block.src, block.id, "inkshaa/post/images/")
      );
    }

    // Sanitize text content
    if (processedBlock.text) {
      processedBlock.text = sanitizeContent(processedBlock.text);
    }
    if (processedBlock.caption) {
      processedBlock.caption = sanitizeContent(processedBlock.caption);
    }

    // Process poll blocks
    if (block.type === "poll") {
      processedBlock.question = sanitizeContent(
        processedBlock.question?.trim() || "Default Question"
      );

      processedBlock.options = Array.isArray(processedBlock.options)
        ? processedBlock.options
            .map((opt) => {
              const value =
                typeof opt === "string"
                  ? opt
                  : typeof opt === "object" && typeof opt.option === "string"
                  ? opt.option
                  : "";
              const trimmed = sanitizeContent(value.trim());
              return trimmed &&
                trimmed.length >= 2 &&
                trimmed.length <= 200 && // Add max length
                trimmed.toLowerCase() !== "option"
                ? {
                    option: trimmed,
                    votes:
                      typeof opt === "object" &&
                      Number.isInteger(opt.votes) &&
                      opt.votes >= 0
                        ? opt.votes
                        : 0,
                  }
                : null;
            })
            .filter(Boolean)
            .slice(0, 10) // Limit to 10 options
        : [];

      processedBlock.votedUserIds = Array.isArray(processedBlock.votedUserIds)
        ? processedBlock.votedUserIds
            .map((vote) => {
              if (!vote || typeof vote !== "object") return null;
              return mongoose.Types.ObjectId.isValid(vote.userId)
                ? {
                    userId: new mongoose.Types.ObjectId(vote.userId),
                    votedAt:
                      vote.votedAt && new Date(vote.votedAt).getTime() > 0
                        ? new Date(vote.votedAt)
                        : new Date(),
                  }
                : null;
            })
            .filter(Boolean)
        : [];
    }

    // Process table blocks with validation
    if (block.type === "table") {
      if (
        !processedBlock.data ||
        !Array.isArray(processedBlock.data) ||
        processedBlock.data.length === 0
      ) {
        throw new AppError(
          "Table block must have non-empty data",
          400,
          "ProcessBlock"
        );
      }
      if (
        !processedBlock.data.every(
          (row) => Array.isArray(row) && row.length > 0
        )
      ) {
        throw new AppError(
          "Table block has invalid data format - all rows must be non-empty arrays",
          400,
          "ProcessBlock"
        );
      }

      // Limit table size and sanitize content
      processedBlock.data = processedBlock.data
        .slice(0, 1000) // Max 1000 rows
        .map((row) =>
          row
            .slice(0, 50) // Max 50 columns
            .map((cell) => {
              if (cell == null) return "";
              const cellStr = String(cell);
              return cellStr.length > 1000
                ? cellStr.substring(0, 1000) + "..."
                : cellStr;
            })
        );
    }

    // Process code blocks
    if (block.type === "code" && processedBlock.code) {
      // Limit code block size
      if (processedBlock.code.length > 50000) {
        processedBlock.code =
          processedBlock.code.substring(0, 50000) + "\n// ... truncated";
      }
    }

    // Filter allowed fields for security
    const allowedFields = [
      "id",
      "type",
      "value",
      "level",
      "text",
      "code",
      "caption",
      "src",
      "href",
      "url",
      "name",
      "size",
      "ordered",
      "author",
      "question",
      "options",
      "votedUserIds",
      "items",
      "data",
      "blocked",
      "language",
      "alignment",
      "stretched",
    ];

    const filteredBlock = Object.fromEntries(
      Object.entries(processedBlock).filter(([key]) =>
        allowedFields.includes(key)
      )
    );

    logMemory(`🛠️ End processBlock ${block.id || "unknown"}`);
    return filteredBlock;
  } catch (err) {
    console.error(`[processBlock] Error processing block ${block.id}:`, err);
    throw err;
  }
};

// Generate safe slug with collision handling
const generateSafeSlug = async (title) => {
  let slug;
  try {
    slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  } catch (err) {
    console.warn("[CreatePost] slugify failed, using fallback:", err.message);
    slug = fallbackSlugify(title);
  }

  if (!slug || slug.length < 3) {
    slug = `post-${Date.now()}`;
  }

  let finalSlug = slug;
  let counter = 1;
  const maxAttempts = 100; // Prevent infinite loops

  logMemory("🔎 Before slug uniqueness check");
  while (counter <= maxAttempts) {
    const existingPost = await PostModel.exists({ slug: finalSlug }).lean();
    if (!existingPost) break;

    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  if (counter > maxAttempts) {
    finalSlug = `${slug}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 5)}`;
  }

  logMemory("🔎 After slug uniqueness check");
  return finalSlug;
};

// Enhanced input validation
const validateCreatePostInput = (input) => {
  const { title, category, language, tags, blocks } = input;

  if (!title?.trim() || title.trim().length < 3) {
    throw new AppError(
      "Title must be at least 3 characters long",
      400,
      "CreatePost"
    );
  }
  if (title.length > 300) {
    throw new AppError(
      "Title too long (max 300 characters)",
      400,
      "CreatePost"
    );
  }

  if (!category?.trim()) {
    throw new AppError("Category is required", 400, "CreatePost");
  }
  if (category.length > 100) {
    throw new AppError(
      "Category too long (max 100 characters)",
      400,
      "CreatePost"
    );
  }

  if (!language?.trim()) {
    throw new AppError("Language is required", 400, "CreatePost");
  }

  if (!Array.isArray(tags)) {
    throw new AppError("Tags must be an array", 400, "CreatePost");
  }
  if (tags.length > 20) {
    throw new AppError("Too many tags (max 20)", 400, "CreatePost");
  }

  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new AppError("Blocks must be a non-empty array", 400, "CreatePost");
  }
  if (blocks.length > 500) {
    throw new AppError("Too many blocks (max 500)", 400, "CreatePost");
  }

  return true;
};

// Main create post function
export const createPost = async (req, res, next) => {
  let session = null;
  const startTime = Date.now();

  try {
    logMemory("📝 Start createPost");
    console.log("[CreatePost] Request initiated by user:", req.user?._id);

    // Check authentication
    if (!req.user?._id) {
      throw new AppError(
        "You must be signed in to create posts.",
        401,
        "CreatePost"
      );
    }

    // Rate limiting
    checkRateLimit(req.user._id, cache);

    // Validate payload size
    const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
    // For example, allow up to 40MB
    if (payloadSize > 40 * 1024 * 1024) {
      throw new AppError(
        `Payload exceeds 40MB limit: ${(payloadSize / 1024 / 1024).toFixed(
          2
        )}MB`,
        413,
        "CreatePost"
      );
    }

    const {
      title,
      category,
      excerpt,
      tags: rawTags,
      blocks: rawBlocks = [],
      thumbnail: rawThumbnail,
      thumbnailSize,
      isEmbed: isThumbnailEmbed = false,
      isFeatured = false,
      isPinned = false,
      language = "en",
      postType = "Blog",
    } = req.body;

    // Parse and validate input
    let tags;
    try {
      tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
    } catch (err) {
      throw new AppError(
        "Invalid tags format - must be valid JSON array",
        400,
        "CreatePost"
      );
    }

    let blocks;
    try {
      blocks = Array.isArray(rawBlocks)
        ? rawBlocks
        : JSON.parse(rawBlocks || "[]");
    } catch (err) {
      throw new AppError(
        "Invalid blocks format - must be valid JSON array",
        400,
        "CreatePost"
      );
    }

    // Validate all inputs
    validateCreatePostInput({ title, category, language, tags, blocks });

    // Check for recent duplicate posts
    const recentPost = await PostModel.findOne({
      title: title.trim(),
      author: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }, // Last 2 minutes
    }).lean();

    if (recentPost) {
      console.log("[CreatePost] Duplicate post detected:", recentPost.slug);
      throw new AppError(
        "A post with this title was recently created. Please wait before creating another.",
        429,
        "CreatePost"
      );
    }

    logMemory("📦 After input validation");

    // Process blocks with IDs and validation
    const blocksWithIds = blocks.map((block, index) => {
      if (!block || typeof block !== "object" || !block.type) {
        throw new AppError(
          `Invalid block at index ${index} - must be object with type property`,
          400,
          "CreatePost"
        );
      }

      // Validate block type
      const validBlockTypes = [
        "header",
        "paragraph",
        "list",
        "image",
        "quote",
        "code",
        "delimiter",
        "table",
        "embed",
        "poll",
        "checklist",
        "warning",
      ];
      if (!validBlockTypes.includes(block.type)) {
        console.warn(`[CreatePost] Unknown block type: ${block.type}`);
      }

      return {
        id: block.id || uuidv4(),
        type: block.type,
        ...block,
        blocked: false,
      };
    });

    // Validate specific block types
    blocksWithIds.forEach((block, index) => {
      if (block.type === "table") {
        if (
          !block.data ||
          !Array.isArray(block.data) ||
          block.data.length === 0
        ) {
          throw new AppError(
            `Table block at index ${index} must have non-empty data array`,
            400,
            "CreatePost"
          );
        }
        if (!block.data.every((row) => Array.isArray(row) && row.length > 0)) {
          throw new AppError(
            `Table block at index ${index} has invalid data format - all rows must be non-empty arrays`,
            400,
            "CreatePost"
          );
        }
      }
    });

    // Process blocks with controlled concurrency
    const blockLimit = pLimit(3); // Process 3 blocks concurrently
    const imageLimit = pLimit(2); // Process 2 images concurrently

    logMemory("🖼️ Before processing blocks");
    const processedBlocks = await Promise.all(
      blocksWithIds.map((block) =>
        blockLimit(() => processBlock(block, blockLimit, imageLimit))
      )
    );
    logMemory("🖼️ After processing blocks");

    // Calculate reading time
    const { readTime, readingTime } = calculateReadTime(processedBlocks);

    // Process thumbnail
    let processedThumbnail = null;
    if (rawThumbnail && !isThumbnailEmbed) {
      logMemory("🖼️ Before processing thumbnail");
      processedThumbnail = await imageLimit(() =>
        processImage(rawThumbnail, "thumbnail", "inkshaa/post/thumbnails/")
      );
      logMemory("🖼️ After processing thumbnail");
    } else if (rawThumbnail && isThumbnailEmbed) {
      // Validate embed URL
      try {
        new URL(rawThumbnail);
        processedThumbnail = rawThumbnail;
      } catch (err) {
        throw new AppError("Invalid thumbnail embed URL", 400, "CreatePost");
      }
    }

    // Content moderation (placeholder - implement real moderation)
    const moderateContent = async (text) => {
      // Add your content moderation logic here
      // For now, just check for obvious spam patterns
      const spamPatterns = [
        /(.)\1{20,}/i, // Repeated characters
        /http[s]?:\/\/[^\s]{100,}/i, // Very long URLs
      ];

      for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
          return { isFlagged: true, categories: { spam: true } };
        }
      }

      return { isFlagged: false, categories: {} };
    };

    const blockTextContent = processedBlocks
      .flatMap((block) =>
        ["text", "value", "code", "caption", "question"]
          .map((f) => block[f])
          .filter(Boolean)
      )
      .join("\n");
    const fullText = `${title}\n${excerpt || ""}\n${blockTextContent}`;

    logMemory("🔍 Before content moderation");
    const moderation = await moderateContent(fullText);
    logMemory("🔍 After content moderation");

    if (moderation.isFlagged) {
      const reasons = Object.entries(moderation.categories)
        .filter(([_, flagged]) => flagged)
        .map(([key]) => key);
      throw new AppError(
        `Content violates community guidelines: ${reasons.join(", ")}`,
        400,
        "CreatePost"
      );
    }

    // Generate unique slug
    const slug = await generateSafeSlug(title);

    // Prepare post data
    const postData = {
      title: title.trim(),
      slug,
      category: category.trim(),
      tags: tags
        .filter((tag) => tag && typeof tag === "string" && tag.trim())
        .slice(0, 20),
      thumbnail: processedThumbnail,
      thumbnailSize,
      isEmbed: isThumbnailEmbed,
      excerpt: excerpt ? excerpt.trim().substring(0, 500) : undefined, // Limit excerpt
      blocks: processedBlocks,
      author: req.user._id,
      isFeatured: Boolean(isFeatured),
      isPinned: Boolean(isPinned),
      isPublished: true,
      language: language.trim(),
      readTime,
      readingTime,
      postType: postType.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Database transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      logMemory("💾 Before DB operations");
      console.log("[CreatePost] Creating post with slug:", slug);

      const [newPost] = await asyncRetry(
        () => PostModel.create([postData], { session }),
        { retries: 3, minTimeout: 2000 }
      );

      // Record activity
      await recordActivity(
        {
          userId: req.user._id,
          action: "POST_CREATED",
          targetPost: newPost._id,
          message: `Created post: ${title.substring(0, 100)}`,
        },
        { session }
      );

      logMemory("💾 After DB operations");
      await session.commitTransaction();
      console.log("[CreatePost] Transaction committed successfully");

      // Post-transaction operations (non-critical)
      try {
        // Allow some time for database indexing
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Emit socket events with retry
        await asyncRetry(
          async () => {
            io.emit("postCreated", {
              ...newPost.toObject(),
              authorId: req.user._id,
              timestamp: new Date(),
            });
          },
          { retries: 2, minTimeout: 500 }
        );

        // Invalidate relevant caches
        const cacheKeys = [
          `postCounts:${req.user._id}`,
          `post:${slug}`,
          `userPosts:${req.user._id}`,
        ];
        cacheKeys.forEach((key) => {
          try {
            cache.del(key);
          } catch (err) {
            console.warn(
              `[CreatePost] Cache deletion failed for ${key}:`,
              err.message
            );
          }
        });

        // Update post counts asynchronously
        Promise.all([
          PostModel.countDocuments({
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
          PostModel.countDocuments({
            author: req.user._id,
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
          PostModel.countDocuments({
            author: { $in: req.user.following || [] },
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
        ])
          .then(([allPostsCount, myPostsCount, followingPostsCount]) => {
            const counts = { allPostsCount, myPostsCount, followingPostsCount };
            cache.set(`postCounts:${req.user._id}`, counts, 300); // 5 minutes cache

            // Emit updated counts
            return asyncRetry(
              async () => {
                io.to(req.user._id.toString()).emit(
                  "postCountsUpdated",
                  counts
                );
              },
              { retries: 2, minTimeout: 500 }
            );
          })
          .catch((err) => {
            console.warn("[CreatePost] Post count update failed:", err.message);
          });
      } catch (err) {
        console.warn(
          "[CreatePost] Post-transaction operations failed:",
          err.message
        );
        // Don't throw - these are non-critical operations
      }

      const processingTime = Date.now() - startTime;
      logMemory("🎉 End createPost");
      console.log(
        `[CreatePost] Success: slug=${slug}, time=${processingTime}ms`
      );

      // Return success response
      res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: {
          _id: newPost._id,
          title: newPost.title,
          slug: newPost.slug,
          category: newPost.category,
          tags: newPost.tags,
          thumbnail: newPost.thumbnail,
          excerpt: newPost.excerpt,
          author: newPost.author,
          isFeatured: newPost.isFeatured,
          isPinned: newPost.isPinned,
          isPublished: newPost.isPublished,
          language: newPost.language,
          readTime: newPost.readTime,
          readingTime: newPost.readingTime,
          postType: newPost.postType,
          createdAt: newPost.createdAt,
          updatedAt: newPost.updatedAt,
        },
        meta: {
          processingTime: processingTime,
          blocksProcessed: processedBlocks.length,
          imagesProcessed: processedBlocks.filter((b) => b.type === "image")
            .length,
        },
      });
    } catch (dbError) {
      console.error("[CreatePost] Database error:", dbError);
      await session.abortTransaction();

      // Provide specific error messages for common database issues
      if (dbError.code === 11000) {
        throw new AppError(
          "A post with this title already exists. Please choose a different title.",
          409,
          "CreatePost"
        );
      }

      throw new AppError(
        dbError.message || "Failed to save post to database",
        500,
        "CreatePost"
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[CreatePost] Error after ${processingTime}ms:`, error);

    // Abort transaction if it exists and is active
    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("[CreatePost] Failed to abort transaction:", abortError);
      }
    }

    // Enhanced error response
    if (error instanceof AppError) {
      next(error);
    } else {
      // Log unexpected errors for debugging
      console.error("[CreatePost] Unexpected error:", error.stack);
      next(
        new AppError(
          error.message ||
            "An unexpected error occurred while creating the post",
          error.status || 500,
          "CreatePost"
        )
      );
    }
  } finally {
    // Ensure session is always closed
    if (session) {
      try {
        await session.endSession();
      } catch (sessionError) {
        console.error("[CreatePost] Failed to end session:", sessionError);
      }
    }

    // Final memory cleanup
    logMemory("🧹 Final cleanup");
  }
};

// Get all published + unblocked posts with pagination
export const getPublicPosts = async (req, res, next) => {
  try {
    logMemory("Before getPublicPosts start");
    const { page = 1, limit, tag } = req.query;
    const pageNum = parseInt(page);
    const limitNum = limit ? parseInt(limit) : null; // Allow no limit
    const cacheKey = `publicPosts:${pageNum}:${limitNum || "none"}:${
      tag || "all"
    }`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        posts: cachedPosts.posts,
        total: cachedPosts.total,
        page: pageNum,
      });
    }

    const query = {
      isPublished: true,
      blocked: false,
      ...(tag ? { tags: { $in: [tag] } } : {}),
    };

    console.log("Query:", JSON.stringify(query));
    logMemory("Before PostModel.find");
    let postQuery = PostModel.find(query)
      .maxTimeMS(10000)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * (limitNum || 20)) // Default to 20 if no limit
      .select(
        "title slug thumbnail excerpt author viewsCount shareCount createdAt tags blocks"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (limitNum) postQuery = postQuery.limit(limitNum); // Apply limit only if provided

    const posts = await postQuery;

    console.log("Posts fetched:", posts.length);
    logMemory("Before processing posts");
    const processedPosts = posts.map((post) => ({
      ...post,
      blocks: Array.isArray(post.blocks) ? post.blocks : [],
    }));

    logMemory("Before PostModel.countDocuments");
    const total = await PostModel.countDocuments(query).maxTimeMS(5000).lean();
    console.log("Total posts:", total);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, { posts: processedPosts, total });

    if (req.user?._id) {
      logMemory("Before recordActivity");
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_PUBLIC_POSTS",
        message: `Viewed public posts (page: ${pageNum}, tag: ${
          tag || "none"
        })`,
      });
    }

    logMemory("After getPublicPosts complete");
    res.status(200).json({
      success: true,
      posts: processedPosts,
      total,
      page: pageNum,
    });
  } catch (error) {
    console.error("Error in getPublicPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch public posts",
            500,
            "GetPublicPosts"
          )
    );
  }
};

// Improved input validation helper
const validatePaginationParams = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 20;
  return { pageNum, limitNum };
};

// Helper function to hash IP for privacy
const hashIP = (ip) => {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.IP_SALT || "default_salt")
    .digest("hex");
};

// Get post ID by slug
export const getPostIdBySlug = async (req, res, next) => {
  try {
    logMemory("Before getPostIdBySlug start");
    const { slug } = req.params;
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetPostIdBySlug");
    }
    const sanitizedSlug = slug.trim().toLowerCase();
    const cacheKey = `postId:${sanitizedSlug}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedPostId = cache.get(cacheKey);
    if (cachedPostId) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, postId: cachedPostId });
    }

    console.log("Querying slug:", sanitizedSlug);
    logMemory("Before PostModel.findOne");
    const post = await PostModel.findOne({
      slug: { $regex: `^${sanitizedSlug}$`, $options: "i" },
    })
      .maxTimeMS(10000)
      .select("_id")
      .lean();

    if (!post) {
      throw new AppError("Post not found", 404, "GetPostIdBySlug");
    }

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, post._id);

    logMemory("After getPostIdBySlug complete");
    res.status(200).json({ success: true, postId: post._id });
  } catch (error) {
    console.error("Error in getPostIdBySlug:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch post ID",
            500,
            "GetPostIdBySlug"
          )
    );
  }
};

// Count all published, non-blocked posts
export const countAllPosts = async (req, res, next) => {
  try {
    logMemory("Before countAllPosts start");
    const cacheKey = "countAllPosts";

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, count: cachedCount });
    }

    logMemory("Before PostModel.countDocuments");
    const count = await PostModel.countDocuments({
      blocked: { $ne: true },
      isPublished: true,
    })
      .maxTimeMS(5000)
      .lean();
    console.log("Total posts count:", count);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, count);

    logMemory("After countAllPosts complete");
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error in countAllPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch all posts count",
            500,
            "CountAllPosts"
          )
    );
  }
};

// Count authenticated user's posts
export const countMyPosts = async (req, res, next) => {
  try {
    logMemory("Before countMyPosts start");
    if (!req.user?._id) {
      throw new AppError("Invalid user in request", 400, "CountMyPosts");
    }
    const cacheKey = `countMyPosts:${req.user._id}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, count: cachedCount });
    }

    logMemory("Before PostModel.countDocuments");
    const count = await PostModel.countDocuments({
      author: req.user._id,
      blocked: { $ne: true },
      isPublished: true,
    })
      .maxTimeMS(5000)
      .lean();
    console.log("User posts count:", count);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, count);

    logMemory("After countMyPosts complete");
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error in countMyPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to fetch post count", 500, "CountMyPosts")
    );
  }
};

// Count posts from followed users
export const countFollowingPosts = async (req, res, next) => {
  try {
    logMemory("Before countFollowingPosts start");
    const cacheKey = `countFollowingPosts:${req.user?._id || "guest"}`;

    logMemory(`Before checking cache: ${cacheKey}`);
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      logMemory(`Cache hit: ${cacheKey}`);
      return res.status(200).json({ success: true, count: cachedCount });
    }

    logMemory("Before PostModel.countDocuments");
    const count = await PostModel.countDocuments({
      author: { $in: req.user.following || [] },
      blocked: { $ne: true },
      isPublished: true,
    })
      .maxTimeMS(5000)
      .lean();
    console.log("Following posts count:", count);

    logMemory(`Before setting cache: ${cacheKey}`);
    cache.set(cacheKey, count);

    logMemory("After countFollowingPosts complete");
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Error in countFollowingPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch following posts count",
            500,
            "CountFollowingPosts"
          )
    );
  }
};

// Get single public post by slug
export const getPublicPost = async (req, res, next) => {
  try {
    logMemory("📄 Start getPublicPost");
    const { slug } = req.params;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetPublicPost");
    }

    const sanitizedSlug = slug.trim().toLowerCase();
    console.log("Querying slug:", sanitizedSlug);

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne({
      slug: { $regex: `^${sanitizedSlug}$`, $options: "i" },
      isPublished: true,
      blocked: false,
    })
      .select(
        "title slug category excerpt thumbnail author createdAt isPublished readTime readingTime tags language viewsCount shareCount postType"
      )
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError(
        "Post not found or has been deleted",
        404,
        "GetPublicPost"
      );
    }

    console.log("Post fetched:", post.title);
    logMemory("📄 End getPublicPost");
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Error in getPublicPost:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch public post",
            500,
            "GetPublicPost"
          )
    );
  }
};

// Track guest view
export const trackGuestView = async (req, res, next) => {
  try {
    logMemory("Before trackGuestView start");
    const { slug } = req.params;
    const sanitizedSlug = slug.trim().toLowerCase();

    logMemory("Before PostModel.findOneAndUpdate");
    const post = await PostModel.findOneAndUpdate(
      { slug: sanitizedSlug, isPublished: true, blocked: false },
      { $inc: { viewsCount: 1 } },
      { select: "_id title" }
    ).lean();

    if (!post) {
      throw new AppError("Post not found", 404, "TrackGuestView");
    }

    logMemory("Before GuestModel.create");
    await GuestModel.create({
      slug: sanitizedSlug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    logMemory("Before socket emit");
    io.to("adminRoom").emit("guestViewUpdate", {
      postId: post._id,
      slug: sanitizedSlug,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      location: req.headers["cf-ipcountry"] || null,
    });

    logMemory("After trackGuestView complete");
    res.status(200).json({ success: true, message: "Guest view recorded" });
  } catch (error) {
    console.error("Error in trackGuestView:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to record guest view",
            500,
            "TrackGuestView"
          )
    );
  }
};

// Track guest visit
export const trackGuestVisit = async (req, res, next) => {
  try {
    logMemory("Before trackGuestVisit start");
    if (req.user && req.user._id) {
      logMemory("Authenticated user detected");
      return res.status(200).json({
        success: false,
        message: "Authenticated user — guest tracking skipped",
      });
    }

    let guestId = req.cookies.guestId;
    const fingerprint = `${req.ip}-${req.headers["user-agent"]}`;

    logMemory("Before checking guestId");
    if (!guestId) {
      guestId = uuidv4();
      res.cookie("guestId", guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    logMemory("Before GuestModel.findOne");
    const existingGuest = await GuestModel.findOne({
      $or: [{ guestId }, { fingerprint }],
    }).lean();

    if (existingGuest && existingGuest.lastVisit > fifteenMinutesAgo) {
      logMemory("Recent visit detected");
      return res.status(200).json({
        success: true,
        message: "Visit already recorded recently",
      });
    }

    logMemory("Before GuestModel.findOneAndUpdate");
    const updatedGuest = await GuestModel.findOneAndUpdate(
      { $or: [{ guestId }, { fingerprint }] },
      {
        $setOnInsert: {
          firstVisit: now,
          guestId,
          fingerprint,
        },
        $set: {
          lastVisit: now,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
        $inc: { visitCount: 1 },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const isNewGuest = !existingGuest;

    if (isNewGuest) {
      logMemory("Before AnalyticsModel.findOneAndUpdate");
      await AnalyticsModel.findOneAndUpdate(
        { _id: "guest-analytics" },
        { $inc: { "traffic.guestUsersCount": 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    }

    logMemory("Before socket emit");
    io.to("adminRoom").emit("guestVisitUpdate", {
      guestId: updatedGuest.guestId,
      visitCount: updatedGuest.visitCount,
      lastVisit: updatedGuest.lastVisit,
      ip: updatedGuest.ip,
      userAgent: updatedGuest.userAgent,
      location: req.headers["cf-ipcountry"] || null,
    });

    logMemory("After trackGuestVisit complete");
    res.status(200).json({
      success: true,
      message: "Guest visit tracked",
      guest: {
        guestId: updatedGuest.guestId,
        visitCount: updatedGuest.visitCount,
        lastVisit: updatedGuest.lastVisit,
        ip: updatedGuest.ip,
        userAgent: updatedGuest.userAgent,
        location: req.headers["cf-ipcountry"] || null,
      },
    });
  } catch (error) {
    console.error("Error in trackGuestVisit:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to track guest visit", 500, "TrackGuestVisit")
    );
  }
};

// Get all posts

export const getAllPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getAllPosts");
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const skip = limit ? (page - 1) * limit : 0;
    const authorId = req.query.authorId;
    const rawAuthorIds = req.query.authorIds || req.query.followingIds;
    const isGuest = req.query.isGuest === "true";

    const query = {
      blocked: { $ne: true },
      ...(isGuest || !req.user?._id ? { isPublished: true } : {}),
    };

    if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
      query.author = authorId;
    } else if (rawAuthorIds) {
      const authorIdArray = rawAuthorIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (authorIdArray.length) {
        query.author = { $in: authorIdArray };
      } else {
        throw new AppError("Invalid author IDs provided", 400, "GetAllPosts");
      }
    }

    console.log("Query:", JSON.stringify(query));
    logMemory("📖 Before fetching posts");
    let postQuery = PostModel.find(query)
      .maxTimeMS(15000) // Increased timeout
      .sort({ createdAt: -1 })
      .skip(skip)
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();

    if (limit) postQuery = postQuery.limit(limit);

    const posts = await asyncRetry(
      () =>
        postQuery.select(
          "title slug category excerpt thumbnail author createdAt isPublished isPinned isPremium isSubscriberOnly blocked message readTime likesCount commentsCount viewsCount bookmarksCount likes tags language isFeatured allowComments timeSpent updatedAt shareCount sharedBy blocks postType"
        ),
      { retries: 3, minTimeout: 2000 }
    );
    logMemory("📖 After fetching posts");

    console.log("Posts fetched:", posts.length);
    const total = await asyncRetry(
      () => PostModel.countDocuments(query).maxTimeMS(10000).lean(),
      { retries: 3, minTimeout: 2000 }
    );
    console.log("Total posts:", total);

    const cacheKey = `postCounts:${req.user?._id || "guest"}`;
    let counts = cache.get(cacheKey);
    if (!counts) {
      logMemory("📊 Before cache update");
      const [allPostsCount, myPostsCount, followingPostsCount] =
        await Promise.all([
          PostModel.countDocuments({
            blocked: { $ne: true },
            isPublished: true,
          }).lean(),
          req.user?._id
            ? PostModel.countDocuments({
                author: req.user._id,
                blocked: { $ne: true },
                isPublished: true,
              }).lean()
            : Promise.resolve(0),
          req.user?._id
            ? PostModel.countDocuments({
                author: { $in: req.user.following || [] },
                blocked: { $ne: true },
                isPublished: true,
              }).lean()
            : Promise.resolve(0),
        ]);
      counts = { allPostsCount, myPostsCount, followingPostsCount };
      cache.set(cacheKey, counts);
      logMemory("📊 After cache update");
    }

    if (req.user?._id && !isGuest) {
      await recordActivity({
        userId: req.user._id,
        action: "VIEWED_POSTS",
        message: "Viewed all posts",
      });
      await asyncRetry(
        async () => {
          io.to(req.user._id).emit("postCountsUpdated", counts);
        },
        { retries: 3, minTimeout: 1000 }
      );
    }

    logMemory("📋 End getAllPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    console.error("Error in getAllPosts:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch posts",
            500,
            "GetAllPosts"
          )
    );
  }
};
// // / Fixed getSinglePost with better slug handling and debugging
export const getSinglePost = async (req, res, next) => {
  try {
    logMemory("📄 Start getSinglePost");

    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    console.log("[GetSinglePost] Request params:", { slug, userId, userRole });
    console.log("[GetSinglePost] Full URL path:", req.originalUrl);

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      throw new AppError("Invalid post slug", 400, "GetSinglePost");
    }

    // DON'T modify the slug case - preserve original case for exact matching
    const cleanSlug = slug.trim();

    // Better slug validation (allow mixed case, numbers, hyphens, underscores)
    if (cleanSlug.length > 200 || !/^[a-zA-Z0-9-_]+$/.test(cleanSlug)) {
      throw new AppError("Invalid slug format", 400, "GetSinglePost");
    }

    console.log("[GetSinglePost] Processing slug:", cleanSlug);

    // Build query with case-insensitive slug matching
    let baseQuery = {
      slug: {
        $regex: `^${cleanSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    };

    let query;
    if (!userId) {
      // Guest users can only see published, non-blocked posts
      query = {
        ...baseQuery,
        isPublished: true,
        blocked: { $ne: true },
      };
    } else if (userRole === "admin") {
      // Admin can see all posts
      query = baseQuery;
    } else {
      // Regular users can see published posts or their own posts
      query = {
        ...baseQuery,
        $or: [
          { isPublished: true, blocked: { $ne: true } },
          { author: new mongoose.Types.ObjectId(userId) },
        ],
      };
    }

    console.log("[GetSinglePost] Database query:", JSON.stringify(query));

    // Create cache key with original slug case
    const cacheKey = `singlePost:${cleanSlug}:${userId || "guest"}:${
      userRole || "none"
    }`;

    // Check cache first
    const cachedPost = cache.get(cacheKey);
    if (cachedPost) {
      console.log("[GetSinglePost] Cache hit for slug:", cleanSlug);
      logMemory("Cache hit for single post");
      return res.status(200).json({
        success: true,
        post: cachedPost,
        source: "cache",
      });
    }

    console.log("[GetSinglePost] Cache miss, querying database");
    logMemory("📖 Before fetching post");

    const post = await asyncRetry(
      async () => {
        const result = await PostModel.findOne(query)
          .maxTimeMS(15000) // Increased timeout
          .select(
            `
            _id title slug category excerpt thumbnail thumbnailSize isEmbed
            author createdAt lastEditedAt updatedAt isPublished isPinned 
            isPremium isSubscriberOnly blocked message readTime readingTime
            likesCount commentsCount viewsCount bookmarksCount shareCount
            tags language isFeatured allowComments timeSpent blocks postType
            likes sharedBy
          `
          )
          .populate({
            path: "author",
            select: "name email avatar username",
            options: { lean: true },
          })
          .populate({
            path: "category",
            select: "name slug",
            options: { lean: true },
          })
          .lean();

        console.log(
          "[GetSinglePost] Database result:",
          result
            ? {
                _id: result._id,
                title: result.title,
                slug: result.slug,
                author: result.author?.name,
              }
            : "No post found"
        );

        return result;
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
    );

    logMemory("📖 After fetching post");

    if (!post) {
      // Try to find if post exists with different case or status
      const debugPost = await PostModel.findOne(baseQuery)
        .select("_id title slug isPublished blocked author")
        .populate("author", "name")
        .lean();

      if (debugPost) {
        console.log("[GetSinglePost] Post exists but not accessible:", {
          id: debugPost._id,
          title: debugPost.title,
          slug: debugPost.slug,
          isPublished: debugPost.isPublished,
          blocked: debugPost.blocked,
          author: debugPost.author?.name,
          requestingUser: userId,
          isOwner: debugPost.author?._id?.toString() === userId?.toString(),
        });

        if (debugPost.blocked) {
          throw new AppError("Post is not available", 403, "GetSinglePost");
        } else if (!debugPost.isPublished) {
          throw new AppError("Post is not published", 404, "GetSinglePost");
        }
      }

      throw new AppError("Post not found", 404, "GetSinglePost");
    }

    // Additional permission check for blocked posts
    if (
      post.blocked &&
      userId &&
      post.author?._id?.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
      throw new AppError("Post is not available", 403, "GetSinglePost");
    }

    // Ensure blocks are properly formatted
    if (post.blocks && Array.isArray(post.blocks)) {
      post.blocks = post.blocks.map((block) => ({
        ...block,
        id: block.id || block._id || uuidv4(),
      }));
    }

    // Add view count increment (async, don't wait)
    if (post._id) {
      PostModel.findByIdAndUpdate(
        post._id,
        { $inc: { viewsCount: 1 } },
        { upsert: false }
      ).catch((err) => {
        console.warn(
          "[GetSinglePost] Failed to increment view count:",
          err.message
        );
      });
    }

    // Cache the result with shorter TTL for dynamic content
    cache.set(cacheKey, post, 300); // 5 minutes

    // Cache post ID mapping for faster lookups
    cache.set(`postId:${cleanSlug}`, post._id, 1800); // 30 minutes
    cache.set(`postSlug:${post._id}`, post.slug, 1800); // Reverse mapping

    console.log("[GetSinglePost] Successfully returning post:", {
      id: post._id,
      title: post.title,
      slug: post.slug,
      blocksCount: post.blocks?.length || 0,
    });

    logMemory("📄 End getSinglePost");

    res.status(200).json({
      success: true,
      post,
      source: "database",
      meta: {
        slug: cleanSlug,
        cacheKey,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[GetSinglePost] Error details:", {
      message: error.message,
      stack: error.stack,
      slug: req.params.slug,
      userId: req.user?._id,
      url: req.originalUrl,
    });

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch post",
            500,
            "GetSinglePost"
          )
    );
  }
};

// Enhanced trackTimeSpent with validation
export const trackTimeSpent = async (req, res, next) => {
  try {
    logMemory("⏱️ Start trackTimeSpent");
    const { postId } = req.params;
    const { duration } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid postId", 400, "trackTimeSpent");
    }

    if (!userId) {
      throw new AppError("Authentication required", 401, "trackTimeSpent");
    }

    // Validate duration
    if (typeof duration !== "number" || isNaN(duration) || duration < 0) {
      throw new AppError("Invalid duration", 400, "trackTimeSpent");
    }

    // Reasonable limits (max 1 hour per request)
    if (duration > 3600) {
      throw new AppError(
        "Duration too large (max 1 hour)",
        400,
        "trackTimeSpent"
      );
    }

    // Rate limiting
    const rateLimitKey = `timeSpent:${userId}:${postId}`;
    const recentUpdates = cache.get(rateLimitKey) || 0;

    if (recentUpdates >= 10) {
      // Max 10 updates per user per post per minute
      return res.status(429).json({
        success: false,
        message: "Too many time tracking attempts",
      });
    }

    cache.set(rateLimitKey, recentUpdates + 1, 60); // 1 minute

    logMemory("💾 Before updating interaction");
    const [interactionUpdate, postUpdate] = await Promise.all([
      PostInteraction.findOneAndUpdate(
        { postId: new mongoose.Types.ObjectId(postId), userId },
        {
          $inc: { timeSpent: duration },
          $set: { updatedAt: new Date() },
        },
        {
          upsert: true,
          new: false,
          maxTimeMS: 5000,
        }
      ),
      PostModel.updateOne(
        { _id: postId },
        {
          $inc: { timeSpent: duration },
          $set: { lastInteractedAt: new Date() },
        },
        { maxTimeMS: 5000 }
      ),
    ]);
    logMemory("💾 After updating interaction");

    if (!postUpdate.matchedCount) {
      throw new AppError("Post not found", 404, "trackTimeSpent");
    }

    logMemory("⏱️ End trackTimeSpent");
    res.status(200).json({
      success: true,
      message: "Time spent recorded",
      duration: duration,
      totalTimeSpent: (interactionUpdate?.timeSpent || 0) + duration,
    });
  } catch (error) {
    console.error("Error in trackTimeSpent:", error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to track time",
            500,
            "trackTimeSpent"
          )
    );
  }
};

// Fixed updatePostBySlug controller with proper error handling and validation

export const updatePostBySlug = async (req, res, next) => {
  let session = null;
  const startTime = Date.now();

  try {
    logMemory("✏️ Start updatePostBySlug");
    console.log(
      "[UpdatePostBySlug] Received request for slug:",
      req.params.slug
    );
    console.log(
      "[UpdatePostBySlug] Request body:",
      JSON.stringify(req.body, null, 2)
    );

    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    // Input validation
    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      throw new AppError("Valid slug is required", 400, "UpdatePostBySlug");
    }
    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "UpdatePostBySlug"
      );
    }
    if (req.user.blocked) {
      throw new AppError("Account is blocked", 403, "UpdatePostBySlug");
    }

    // Payload size check
    const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
    // console.log(
    //   "[UpdatePostBySlug] Payload size:",
    //   `${(payloadSize / 1024 / 1024).toFixed(2)}MB`
    // );
    if (payloadSize > 40 * 1024 * 1024) {
      throw new AppError(
        `Payload exceeds 40MB limit: ${(payloadSize / 1024 / 1024).toFixed(
          2
        )}MB`,
        413,
        "UpdatePostBySlug"
      );
    }

    // Extract request data
    const {
      title,
      category,
      excerpt,
      tags: rawTags,
      blocks: rawBlocks,
      thumbnail: rawThumbnail,
      thumbnailSize,
      isEmbed: isThumbnailEmbed = false,
      isFeatured,
      isPinned,
      language,
      postType,
    } = req.body;

    // console.log("[UpdatePostBySlug] Processing update for fields:", {
    //   hasTitle: !!title,
    //   hasCategory: !!category,
    //   hasExcerpt: !!excerpt,
    //   hasBlocks: !!rawBlocks,
    //   hasThumbnail: !!rawThumbnail,
    // });

    // Parse and validate tags
    let tags;
    if (rawTags !== undefined) {
      try {
        tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags);
        if (!Array.isArray(tags)) throw new Error("Tags must be an array");
        tags = tags
          .filter((tag) => tag && typeof tag === "string" && tag.trim())
          .map((tag) => tag.trim())
          .slice(0, 20);
        // console.log("[UpdatePostBySlug] Processed tags:", tags);
      } catch (err) {
        console.error("[UpdatePostBySlug] Tags parsing error:", err);
        throw new AppError("Invalid tags format", 400, "UpdatePostBySlug");
      }
    }

    // Parse and validate blocks
    let blocks;
    if (rawBlocks !== undefined) {
      try {
        blocks = Array.isArray(rawBlocks) ? rawBlocks : JSON.parse(rawBlocks);
        if (!Array.isArray(blocks) || blocks.length === 0) {
          throw new AppError(
            "Blocks must be a non-empty array",
            400,
            "UpdatePostBySlug"
          );
        }
        if (blocks.length > 500) {
          throw new AppError(
            "Too many blocks (max 500)",
            400,
            "UpdatePostBySlug"
          );
        }
        // console.log(
        //   "[UpdatePostBySlug] Raw blocks:",
        //   JSON.stringify(blocks, null, 2)
        // );
      } catch (err) {
        console.error("[UpdatePostBySlug] Blocks parsing error:", err);
        throw new AppError("Invalid blocks format", 400, "UpdatePostBySlug");
      }
    }

    // Additional validations
    if (
      title !== undefined &&
      (!title ||
        typeof title !== "string" ||
        title.trim().length < 3 ||
        title.length > 300)
    ) {
      throw new AppError(
        "Title must be 3-300 characters",
        400,
        "UpdatePostBySlug"
      );
    }
    if (
      category !== undefined &&
      (!category ||
        typeof category !== "string" ||
        category.trim().length === 0 ||
        category.length > 100)
    ) {
      throw new AppError(
        "Category must be 1-100 characters",
        400,
        "UpdatePostBySlug"
      );
    }
    if (
      excerpt !== undefined &&
      typeof excerpt === "string" &&
      excerpt.length > 1000
    ) {
      throw new AppError(
        "Excerpt too long (max 1000 characters)",
        400,
        "UpdatePostBySlug"
      );
    }

    // Process blocks
    let processedBlocks;
    if (blocks) {
      const blockLimit = pLimit(3);
      const blocksWithIds = blocks.map((block, index) => {
        if (!block || typeof block !== "object" || !block.type) {
          throw new AppError(
            `Invalid block at index ${index} - must be object with type property`,
            400,
            "UpdatePostBySlug"
          );
        }
        return {
          id: block.id || uuidv4(),
          type: block.type,
          ...block,
          blocked: false,
        };
      });

      // console.log(
      //   "[UpdatePostBySlug] Blocks with IDs:",
      //   JSON.stringify(blocksWithIds, null, 2)
      // );

      try {
        processedBlocks = await Promise.all(
          blocksWithIds.map((block) =>
            blockLimit(async () => {
              try {
                return await processBlock(block, blockLimit, pLimit(2));
              } catch (error) {
                console.error(
                  `[UpdatePostBySlug] Error processing block ${block.id}:`,
                  error
                );
                throw new AppError(
                  `Failed to process block: ${error.message}`,
                  400,
                  "UpdatePostBySlug"
                );
              }
            })
          )
        );
        // console.log(
        //   "[UpdatePostBySlug] Processed blocks:",
        //   JSON.stringify(processedBlocks, null, 2)
        // );
      } catch (error) {
        console.error("[UpdatePostBySlug] Block processing failed:", error);
        throw new AppError(
          `Block processing failed: ${error.message}`,
          400,
          "UpdatePostBySlug"
        );
      }
    }

    // Process thumbnail
    let processedThumbnail;
    if (rawThumbnail && !isThumbnailEmbed) {
      try {
        processedThumbnail = await pLimit(2)(() =>
          processImage(rawThumbnail, "thumbnail", "inkshaa/post/thumbnails/")
        );
        // console.log(
        //   "[UpdatePostBySlug] Thumbnail processed:",
        //   processedThumbnail
        // );
      } catch (error) {
        console.error("[UpdatePostBySlug] Thumbnail processing error:", error);
        throw new AppError(
          `Thumbnail processing failed: ${error.message}`,
          400,
          "UpdatePostBySlug"
        );
      }
    } else if (rawThumbnail && isThumbnailEmbed) {
      try {
        new URL(rawThumbnail);
        processedThumbnail = rawThumbnail;
      } catch (err) {
        throw new AppError(
          "Invalid thumbnail embed URL",
          400,
          "UpdatePostBySlug"
        );
      }
    }

    // Calculate read time
    let readTime, readingTime;
    if (processedBlocks) {
      const readTimeResult = calculateReadTime(processedBlocks);
      readTime = readTimeResult.readTime;
      readingTime = readTimeResult.readingTime;
      // console.log("[UpdatePostBySlug] Calculated read time:", readTime);
    }

    // Build query
    const query =
      userRole === "admin"
        ? {
            slug: {
              $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
          }
        : {
            slug: {
              $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
            author: new mongoose.Types.ObjectId(userId),
          };

    // console.log("[UpdatePostBySlug] Query:", JSON.stringify(query));

    // Fetch existing post
    const post = await PostModel.findOne(query).lean();
    // console.log(
    //   "[UpdatePostBySlug] Found post:",
    //   post
    //     ? { _id: post._id, title: post.title, slug: post.slug }
    //     : "No post found"
    // );

    if (!post) {
      const postExists = await PostModel.findOne({
        slug: {
          $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      })
        .select("author")
        .lean();
      throw new AppError(
        postExists ? "Unauthorized to update this post" : "Post not found",
        postExists ? 403 : 404,
        "UpdatePostBySlug"
      );
    }

    if (post.blocked) {
      throw new AppError(
        "Post is blocked and cannot be updated",
        403,
        "UpdatePostBySlug"
      );
    }

    // Content moderation
    if (title || excerpt || processedBlocks) {
      const moderateContent = async (text) => {
        try {
          const spamPatterns = [/(.)\1{50,}/i, /http[s]?:\/\/[^\s]{100,}/i];
          // console.log("[UpdatePostBySlug] Moderating content:", text);
          for (const pattern of spamPatterns) {
            if (pattern.test(text)) {
              // console.log(
              //   "[UpdatePostBySlug] Content flagged by pattern:",
              //   pattern
              // );
              return { isFlagged: true, categories: { spam: true } };
            }
          }
          return { isFlagged: false, categories: {} };
        } catch (error) {
          console.error("[UpdatePostBySlug] Moderation error:", error);
          return { isFlagged: false, categories: {} };
        }
      };

      const blockTextContent = processedBlocks
        ? processedBlocks
            .flatMap((block) =>
              ["text", "value", "code", "caption", "question"]
                .map((field) => block[field])
                .filter(Boolean)
            )
            .join("\n")
        : "";
      const fullText = `${title || post.title}\n${
        excerpt || post.excerpt || ""
      }\n${blockTextContent}`;
      const moderation = await moderateContent(fullText);
      // console.log("[UpdatePostBySlug] Moderation result:", moderation);

      if (moderation.isFlagged) {
        const reasons = Object.entries(moderation.categories)
          .filter(([_, flagged]) => flagged)
          .map(([key]) => key);
        throw new AppError(
          `Content flagged for: ${reasons.join(", ")}`,
          400,
          "UpdatePostBySlug"
        );
      }
    }

    // Prepare updates
    const updates = {};
    if (title !== undefined && title.trim() !== post.title)
      updates.title = title.trim();
    if (category !== undefined && category.trim() !== post.category)
      updates.category = category.trim();
    if (excerpt !== undefined) updates.excerpt = excerpt ? excerpt.trim() : "";
    if (tags !== undefined) updates.tags = tags;
    if (processedThumbnail !== undefined)
      updates.thumbnail = processedThumbnail;
    if (thumbnailSize !== undefined) updates.thumbnailSize = thumbnailSize;
    if (isThumbnailEmbed !== undefined) updates.isEmbed = isThumbnailEmbed;
    if (processedBlocks !== undefined) updates.blocks = processedBlocks;
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);
    if (language !== undefined) updates.language = language.trim();
    if (postType !== undefined) updates.postType = postType.trim();
    if (readTime !== undefined) updates.readTime = readTime;
    if (readingTime !== undefined) updates.readingTime = readingTime;
    updates.isPublished = true;
    updates.lastEditedAt = new Date();
    updates.updatedAt = new Date();

    // console.log(
    //   "[UpdatePostBySlug] Updates to apply:",
    //   JSON.stringify(updates, null, 2)
    // );

    // Check for substantial changes
    if (Object.keys(updates).length <= 3) {
      // console.log("[UpdatePostBySlug] No substantial changes detected");
      return res
        .status(200)
        .json({ success: true, message: "No changes detected", post });
    }

    // Database transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedPost = await PostModel.findOneAndUpdate(
        { _id: post._id },
        { $set: updates },
        { new: true, runValidators: true, session, lean: false }
      );
      // console.log(
      //   "[UpdatePostBySlug] Database update result:",
      //   updatedPost
      //     ? {
      //         _id: updatedPost._id,
      //         title: updatedPost.title,
      //         slug: updatedPost.slug,
      //       }
      //     : "Failed"
      // );

      if (!updatedPost) {
        throw new AppError(
          "Failed to update post - document not found",
          500,
          "UpdatePostBySlug"
        );
      }

      await recordActivity(
        {
          userId: new mongoose.Types.ObjectId(userId),
          action: "POST_EDITED",
          targetPost: updatedPost._id,
          message: `Edited post: ${updatedPost.title}`,
        },
        { session }
      );
      await session.commitTransaction();
      // console.log("[UpdatePostBySlug] Transaction committed successfully");

      // Cache invalidation
      const cacheKeys = [
        `postCounts:${userId}`,
        `publicPosts:*`,
        `countAllPosts`,
        `countMyPosts:${userId}`,
        `countFollowingPosts:${userId}`,
        `postId:${slug}`,
        `post:${slug}`,
        `singlePost:${slug}:${userId || "guest"}:${userRole || "none"}`,
        `userPosts:${userId}`,
      ];
      cacheKeys.forEach((key) => {
        try {
          cache.del(key);
          // console.log("[UpdatePostBySlug] Cache deleted for key:", key);
        } catch (cacheDelError) {
          console.warn(
            "[UpdatePostBySlug] Failed to delete cache key:",
            key,
            cacheDelError.message
          );
        }
      });

      // Emit real-time update
      try {
        await asyncRetry(
          async () =>
            io.emit("postUpdated", {
              ...updatedPost.toObject(),
              authorId: userId,
            }),
          { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
        );
        // console.log("[UpdatePostBySlug] Socket event emitted");
      } catch (emitError) {
        console.error(
          "[UpdatePostBySlug] Failed to emit postUpdated event:",
          emitError
        );
      }

      const processingTime = Date.now() - startTime;
      // console.log("[UpdatePostBySlug] Success:", {
      //   slug,
      //   time: `${processingTime}ms`,
      // });

      res.status(200).json({
        success: true,
        message: "Post updated successfully",
        post: {
          _id: updatedPost._id,
          title: updatedPost.title,
          slug: updatedPost.slug,
          category: updatedPost.category,
          excerpt: updatedPost.excerpt,
          thumbnail: updatedPost.thumbnail,

          author: updatedPost.author,
          isPublished: updatedPost.isPublished,
          isPinned: updatedPost.isPinned,
          isFeatured: updatedPost.isFeatured,
          createdAt: updatedPost.createdAt,
          lastEditedAt: updatedPost.lastEditedAt,
          updatedAt: updatedPost.updatedAt,
          postType: updatedPost.postType,
          readTime: updatedPost.readTime,
          readingTime: updatedPost.readingTime,
          language: updatedPost.language,
          tags: updatedPost.tags,
        },
        meta: {
          processingTime,
          fieldsUpdated: Object.keys(updates).length,
          blocksProcessed: processedBlocks ? processedBlocks.length : 0,
        },
      });
    } catch (dbError) {
      console.error("[UpdatePostBySlug] DB Error:", dbError);
      await session.abortOyTransaction();
      throw new AppError(
        dbError.message || "Database update failed",
        500,
        "UpdatePostBySlug"
      );
    } finally {
      if (session) await session.endSession();
    }
  } catch (error) {
    console.error("[UpdatePostBySlug] Error:", error);
    if (session && session.inTransaction()) await session.abortTransaction();
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to update post",
            500,
            "UpdatePostBySlug"
          )
    );
  } finally {
    if (session) await session.endSession();
    logMemory("🧹 Final cleanup");
  }
};

export const deletePost = async (req, res, next) => {
  let session = null;

  try {
    logMemory("🗑️ Start deletePost");
    const { postId } = req.params;
    const userId = req.user?._id;

    // Input validation
    if (!postId) {
      throw new AppError("Missing post ID", 400, "DeletePost");
    }

    if (!userId) {
      throw new AppError(
        "You must be signed in to delete a post",
        401,
        "DeletePost"
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID format", 400, "DeletePost");
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");

    if (!post) {
      throw new AppError("Post not found", 404, "DeletePost");
    }

    // Authorization check
    if (
      post.author.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      throw new AppError("Unauthorized to delete this post", 403, "DeletePost");
    }

    if (post.blocked) {
      throw new AppError("Cannot delete blocked post", 403, "DeletePost");
    }

    // Start transaction for consistency
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      logMemory("💾 Before deleting post");
      const deleteResult = await PostModel.deleteOne(
        { _id: postId },
        { session }
      );
      logMemory("💾 After deleting post");

      if (deleteResult.deletedCount === 0) {
        throw new AppError("Failed to delete post", 500, "DeletePost");
      }

      // Record activity
      await recordActivity(
        {
          userId,
          action: "POST_DELETED",
          targetPost: postId,
          message: `Deleted post: ${post.title}`,
        },
        { session }
      );

      // Emit real-time update with retry
      try {
        await asyncRetry(
          async () => {
            io.emit("postDeleted", { postId, authorId: userId });
          },
          { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
        );
      } catch (emitError) {
        console.error("Failed to emit postDeleted event:", emitError);
        // Don't fail the request for emit failures
      }

      // Cache invalidation
      const cacheKeys = [
        `postCounts:${userId}`,
        `publicPosts:*`,
        `countAllPosts`,
        `countMyPosts:${userId}`,
        `countFollowingPosts:${userId}`,
        `postId:${post.slug}`,
      ];

      try {
        cacheKeys.forEach((key) => {
          cache.del(key);
        });
        console.log("[DeletePost] Cache invalidated:", cacheKeys);
      } catch (cacheError) {
        console.error("Cache invalidation error:", cacheError);
        // Don't fail the request for cache errors
      }

      // Update post counts
      try {
        const [allPostsCount, myPostsCount, followingPostsCount] =
          await Promise.all([
            PostModel.countDocuments({
              blocked: { $ne: true },
              isPublished: true,
            }).lean(),
            PostModel.countDocuments({
              author: userId,
              blocked: { $ne: true },
              isPublished: true,
            }).lean(),
            PostModel.countDocuments({
              author: { $in: req.user.following || [] },
              blocked: { $ne: true },
              isPublished: true,
            }).lean(),
          ]);

        const counts = { allPostsCount, myPostsCount, followingPostsCount };
        cache.set(`postCounts:${userId}`, counts);

        // Emit count updates
        await asyncRetry(
          async () => {
            io.to(userId.toString()).emit("postCountsUpdated", counts);
          },
          { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
        );
      } catch (countError) {
        console.error("Failed to update post counts:", countError);
        // Don't fail the request for count update failures
      }

      await session.commitTransaction();
      logMemory("🗑️ End deletePost");

      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
        postId,
      });
    } catch (dbError) {
      console.error("[DeletePost] DB Error:", dbError);
      await session.abortTransaction();
      throw dbError;
    }
  } catch (error) {
    console.error("[DeletePost] Error:", error);

    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Failed to abort transaction:", abortError);
      }
    }

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to delete post",
            500,
            "DeletePost"
          )
    );
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (endError) {
        console.error("Failed to end session:", endError);
      }
    }
  }
};

// Toggle block post
export const toggleBlockPost = async (req, res, next) => {
  try {
    logMemory("🚫 Start toggleBlockPost");
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "ToggleBlockPost");
    }

    if (!req.user?._id || req.user.role !== "admin") {
      throw new AppError("Admin access required", 401, "ToggleBlockPost");
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError("Post not found", 404, "ToggleBlockPost");
    }

    logMemory("💾 Before updating post");
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { blocked: !post.blocked } },
      { new: true, runValidators: true }
    ).select("title slug blocked");
    logMemory("💾 After updating post");

    io.emit("postBlockToggled", {
      postId: post._id,
      blocked: updatedPost.blocked,
    });
    await recordActivity({
      userId: req.user._id,
      action: updatedPost.blocked ? "POST_BLOCKED" : "POST_UNBLOCKED",
      targetPost: postId,
      message: `${updatedPost.blocked ? "Blocked" : "Unblocked"} post: ${
        updatedPost.title
      }`,
    });

    logMemory("🚫 End toggleBlockPost");
    res.status(200).json({
      success: true,
      message: `Post ${
        updatedPost.blocked ? "blocked" : "unblocked"
      } successfully`,
      post: updatedPost,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleBlockPost")
    );
  }
};

// Send daily post email
export const sendDailyPostEmail = async () => {
  try {
    logMemory("📧 Start sendDailyPostEmail");
    logMemory("📖 Before fetching users");
    const users = await UserModel.find({
      emailStatus: "sent",
      stopEmailAttempts: false,
    })
      .select("name email")
      .lean();
    logMemory("📖 After fetching users");

    logMemory("📖 Before fetching posts");
    const cursor = PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .select("title slug excerpt postType")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .cursor();

    const posts = [];
    for await (const post of cursor) {
      posts.push(post);
    }
    logMemory("📖 After fetching posts");

    if (!posts.length) {
      logMemory("📧 End sendDailyPostEmail - No posts");
      return;
    }

    const postListHtml = posts
      .map(
        (post) => `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px;">
            <a href="https://yourwebsite.com/post/${post.slug}" style="color: #4F46E5; text-decoration: none;">${post.title}</a>
          </h3>
          <p style="font-size: 14px; color: #333333;">${post.excerpt}</p>
        </div>`
      )
      .join("");

    for (const user of users) {
      const mailOption = createMailOption({
        to: user.email,
        subject: "Your Daily Digest from Mount Amit",
        name: user.name || "User",
        email: user.email,
        message: `
          <p style="font-size: 14px; line-height: 150%;">
            Here are the latest posts from Mount Amit:
          </p>
          ${postListHtml}
          <p style="font-size: 14px; line-height: 150%;">
            Enjoy reading, and stay tuned for more updates!
          </p>`,
        supportEmail: process.env.SENDER_EMAIL,
        hasButton: true,
        buttonText: "Read More",
        buttonUrl: "https://yourwebsite.com",
      });

      emailQueue.push({ mailOption, userId: user._id });
    }

    logMemory("📧 Before processing email queue");
    await processEmailQueue();
    logMemory("📧 After processing email queue");

    logMemory("📧 End sendDailyPostEmail");
  } catch (error) {
    throw new AppError(
      "Failed to send daily post emails",
      500,
      "SendDailyPostEmail"
    );
  }
};

// Submit appeal
export const submitAppeal = async (req, res, next) => {
  try {
    logMemory("📜 Start submitAppeal");
    const { postId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "SubmitAppeal");
    }

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "SubmitAppeal"
      );
    }

    if (!message || !message.trim()) {
      throw new AppError("Appeal message is required", 400, "SubmitAppeal");
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).lean();
    logMemory("📖 After fetching post");
    if (!post) {
      throw new AppError("Post not found", 404, "SubmitAppeal");
    }

    if (post.author.toString() !== userId.toString()) {
      throw new AppError(
        "Only the post author can appeal",
        403,
        "SubmitAppeal"
      );
    }

    if (!post.blocked) {
      throw new AppError("Post is not blocked", 400, "SubmitAppeal");
    }

    await recordActivity({
      userId,
      action: "POST_APPEAL_SUBMITTED",
      targetPost: postId,
      message: `Appeal submitted for post: ${post.title} - ${message}`,
    });

    io.emit("newAppeal", { postId, userId, message, postTitle: post.title });

    logMemory("📜 End submitAppeal");
    res
      .status(200)
      .json({ success: true, message: "Appeal submitted successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to submit appeal",
            500,
            "SubmitAppeal"
          )
    );
  }
};

// Increment share count
export const incrementShareCount = async (req, res, next) => {
  try {
    logMemory("📈 Start incrementShareCount");
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400, "IncrementShareCount");
    }

    logMemory("💾 Before updating share count");
    const result = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true, select: "shareCount" }
    ).lean();
    logMemory("💾 After updating share count");

    if (!result) {
      throw new AppError("Post not found", 404, "IncrementShareCount");
    }

    logMemory("📈 End incrementShareCount");
    res.status(200).json({
      success: true,
      message: "Share count incremented",
      shareCount: result.shareCount,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to increment share count",
            500,
            "IncrementShareCount"
          )
    );
  }
};

// Get draft and pending posts
export const getDraftAndPendingPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getDraftAndPendingPosts");
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "GetDraftAndPendingPosts"
      );
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const query = { author: userId, blocked: { $ne: true } };

    logMemory("📖 Before fetching posts");
    const [posts, total] = await Promise.all([
      PostModel.find(query)
        .select(
          "title slug category excerpt thumbnail author createdAt isPublished postType"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar")
        .lean(),
      PostModel.countDocuments(query).lean(),
    ]);
    logMemory("📖 After fetching posts");

    if (!posts.length) {
      logMemory("📋 End getDraftAndPendingPosts - No posts");
      return res.status(200).json({
        success: true,
        message: "No posts found",
        total: 0,
        page,
        posts: [],
      });
    }

    logMemory("📋 End getDraftAndPendingPosts");
    res.status(200).json({ success: true, total, page, posts });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch posts",
            500,
            "GetDraftAndPendingPosts"
          )
    );
  }
};

// Fixed Get following posts
export const getFollowingPosts = async (req, res, next) => {
  try {
    logMemory("📋 Start getFollowingPosts");
    const userId = req.user?._id;

    // Enhanced input validation
    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature.",
        401,
        "GetFollowingPosts"
      );
    }

    // Validate and sanitize pagination parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const skip = (page - 1) * limit;

    // Optional filters
    const {
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Validate sort parameters
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "likesCount",
      "viewsCount",
      "title",
    ];
    const allowedSortOrders = ["asc", "desc"];
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const validSortOrder = allowedSortOrders.includes(sortOrder)
      ? sortOrder
      : "desc";

    // Check cache first
    const cacheKey = `followingPosts:${userId}:${page}:${limit}:${
      category || "all"
    }:${search || "none"}:${validSortBy}:${validSortOrder}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logMemory("📋 Cache hit - returning cached following posts");
      return res.status(200).json(cachedResult);
    }

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).select("following").lean();
    logMemory("📖 After fetching user");

    if (!user) {
      throw new AppError("User not found", 404, "GetFollowingPosts");
    }

    // Validate and filter following IDs
    const followingIds = (user.following || [])
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id.toString()))
      .map((id) => new mongoose.Types.ObjectId(id.toString()));

    if (!followingIds.length) {
      const emptyResult = {
        success: true,
        total: 0,
        page,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        posts: [],
        message: "You are not following any users",
      };

      // Cache empty result briefly
      cache.set(cacheKey, emptyResult, 300); // 5 minutes

      logMemory("📋 End getFollowingPosts - No following");
      return res.status(200).json(emptyResult);
    }

    // Build query with filters
    const query = {
      author: { $in: followingIds },
      isPublished: true,
      blocked: { $ne: true },
    };

    // Add category filter if provided
    if (category && category.trim()) {
      query.category = { $regex: new RegExp(category.trim(), "i") };
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];
    }

    // Build sort object
    const sortObj = {};
    sortObj[validSortBy] = validSortOrder === "desc" ? -1 : 1;
    // Add secondary sort by createdAt for consistency
    if (validSortBy !== "createdAt") {
      sortObj.createdAt = -1;
    }

    logMemory("📖 Before fetching posts");

    // Use aggregation for better performance with populated fields
    const aggregationPipeline = [
      { $match: query },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                avatar: 1,
                isVerified: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          title: 1,
          slug: 1,
          category: 1,
          excerpt: 1,
          thumbnail: 1,
          author: 1,
          createdAt: 1,
          updatedAt: 1,
          isPublished: 1,
          isPinned: 1,
          isPremium: 1,
          isSubscriberOnly: 1,
          blocked: 1,
          message: 1,
          readTime: 1,
          readingTime: 1,
          likesCount: 1,
          commentsCount: 1,
          viewsCount: 1,
          bookmarksCount: 1,
          shareCount: 1,
          tags: 1,
          language: 1,
          isFeatured: 1,
          allowComments: 1,
          postType: 1,
          // Include user-specific data
          isLiked: {
            $cond: {
              if: { $isArray: "$likes" },
              then: { $in: [userId, "$likes"] },
              else: false,
            },
          },
          isBookmarked: {
            $cond: {
              if: { $isArray: "$bookmarks" },
              then: { $in: [userId, "$bookmarks"] },
              else: false,
            },
          },
        },
      },
    ];

    const [posts, totalCountResult] = await Promise.all([
      PostModel.aggregate(aggregationPipeline),
      PostModel.aggregate([{ $match: query }, { $count: "total" }]),
    ]);

    logMemory("📖 After fetching posts");

    const total = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Process posts for any additional data needed
    const processedPosts = posts.map((post) => ({
      ...post,
      // Ensure author exists
      author: post.author || {
        _id: null,
        name: "Unknown User",
        username: "unknown",
        avatar: null,
        isVerified: false,
      },
      // Clean up any sensitive data
      likes: undefined,
      bookmarks: undefined,
    }));

    // Record activity (non-blocking)
    recordActivity({
      userId,
      action: "VIEWED_FOLLOWING_POSTS",
      message: `Viewed following posts page ${page}`,
      metadata: {
        page,
        postsCount: posts.length,
        filters: {
          category,
          search,
          sortBy: validSortBy,
          sortOrder: validSortOrder,
        },
      },
    }).catch((error) => {
      console.error("Failed to record activity:", error);
    });

    const result = {
      success: true,
      total,
      page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      posts: processedPosts,
      filters: {
        category: category || null,
        search: search || null,
        sortBy: validSortBy,
        sortOrder: validSortOrder,
      },
    };

    // Cache successful results for a short time
    cache.set(cacheKey, result, 600); // 10 minutes

    logMemory("📋 End getFollowingPosts");
    res.status(200).json(result);
  } catch (error) {
    console.error("[GetFollowingPosts] Error:", error);

    // Handle specific error cases
    if (error.name === "CastError") {
      return next(
        new AppError("Invalid user ID format", 400, "GetFollowingPosts")
      );
    }

    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongoTimeoutError"
    ) {
      return next(
        new AppError("Database connection issue", 503, "GetFollowingPosts")
      );
    }

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch following posts",
            500,
            "GetFollowingPosts"
          )
    );
  }
};

// Fixed voteOnPoll with better validation
export const voteOnPoll = async (req, res, next) => {
  let session = null;
  try {
    logMemory("🗳️ Start voteOnPoll");
    const { postId, blockId, optionIndex } = req.body;
    const userId = req.user?._id;

    // Input validation
    validateObjectId(postId, "Post ID");
    if (!userId) {
      throw new AppError("You must be signed in to vote", 401, "VoteOnPoll");
    }
    if (!blockId || typeof blockId !== "string") {
      throw new AppError("Valid block ID required", 400, "VoteOnPoll");
    }
    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      throw new AppError("Valid option index required", 400, "VoteOnPoll");
    }

    // Rate limiting
    const rateLimitKey = `pollVote:${userId}:${postId}`;
    const recentVotes = cache.get(rateLimitKey) || 0;
    if (recentVotes >= 5) {
      throw new AppError("Too many vote attempts", 429, "VoteOnPoll");
    }
    cache.set(rateLimitKey, recentVotes + 1, 300); // 5 minutes

    session = await mongoose.startSession();
    session.startTransaction();

    try {
      logMemory("📖 Before fetching post");
      const post = await PostModel.findOne({
        _id: postId,
        isPublished: true,
        blocked: false,
      })
        .select("title blocks")
        .session(session);
      logMemory("📖 After fetching post");

      if (!post) {
        throw new AppError("Post not found or unavailable", 404, "VoteOnPoll");
      }

      const pollBlockIndex = post.blocks.findIndex(
        (block) => block.id === blockId && block.type === "poll"
      );

      if (pollBlockIndex === -1) {
        throw new AppError("Poll block not found", 404, "VoteOnPoll");
      }

      const pollBlock = post.blocks[pollBlockIndex];

      // Validate option index
      if (optionIndex >= pollBlock.options.length) {
        throw new AppError("Invalid option index", 400, "VoteOnPoll");
      }

      // Check if user already voted
      if (
        pollBlock.votedUserIds.some(
          (vote) => vote.userId.toString() === userId.toString()
        )
      ) {
        throw new AppError("User already voted", 400, "VoteOnPoll");
      }

      // Update poll data
      pollBlock.options[optionIndex].votes =
        (pollBlock.options[optionIndex].votes || 0) + 1;
      pollBlock.votedUserIds.push({
        userId: new mongoose.Types.ObjectId(userId),
        votedAt: new Date(),
      });
      post.blocks[pollBlockIndex] = pollBlock;

      logMemory("💾 Before updating post");
      const updatedPost = await PostModel.findByIdAndUpdate(
        postId,
        { $set: { blocks: post.blocks, updatedAt: new Date() } },
        { new: true, select: "title slug blocks", session }
      );
      logMemory("💾 After updating post");

      await recordActivity(
        {
          userId,
          action: "POLL_VOTED",
          targetPost: postId,
          message: `Voted on poll in post: ${post.title}`,
        },
        { session }
      );

      await session.commitTransaction();

      // Emit socket event
      io.emit("pollUpdated", {
        postId,
        blockId,
        poll: updatedPost.blocks[pollBlockIndex],
      });

      logMemory("🗳️ End voteOnPoll");
      res.status(200).json({
        success: true,
        message: "Vote recorded successfully",
        poll: updatedPost.blocks[pollBlockIndex],
      });
    } catch (dbError) {
      await session.abortTransaction();
      throw dbError;
    }
  } catch (error) {
    console.error("Error in voteOnPoll:", error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to record vote",
            500,
            "VoteOnPoll"
          )
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// Fixed incrementView with better validation
export const incrementView = async (req, res, next) => {
  try {
    logMemory("👀 Start incrementView");
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      throw new AppError("Invalid slug", 400, "IncrementView");
    }

    const sanitizedSlug = slug.trim().toLowerCase();
    if (sanitizedSlug.length > 200 || !/^[a-z0-9-_]+$/.test(sanitizedSlug)) {
      throw new AppError("Invalid slug format", 400, "IncrementView");
    }

    // Rate limiting by IP
    const clientIP = req.ip;
    const rateLimitKey = `incrementView:${clientIP}:${sanitizedSlug}`;
    const recentViews = cache.get(rateLimitKey) || 0;

    if (recentViews >= 5) {
      // Max 5 increments per IP per post per minute
      return res.status(429).json({
        success: false,
        message: "Too many view attempts",
      });
    }

    cache.set(rateLimitKey, recentViews + 1, 60); // 1 minute

    logMemory("Before PostModel.findOneAndUpdate");
    const post = await PostModel.findOneAndUpdate(
      { slug: sanitizedSlug, isPublished: true, blocked: false },
      {
        $inc: { viewsCount: 1 },
        $set: { lastViewedAt: new Date() },
      },
      {
        new: true,
        select: "viewsCount title",
        maxTimeMS: 5000,
      }
    ).lean();

    if (!post) {
      throw new AppError("Post not found", 404, "IncrementView");
    }

    // Invalidate relevant caches
    cache.del(`publicPost:${sanitizedSlug}`);
    cache.del(`singlePost:${sanitizedSlug}:*`);

    logMemory("👀 End incrementView");
    res.status(200).json({
      success: true,
      message: "View count incremented",
      viewsCount: post.viewsCount,
    });
  } catch (error) {
    console.error("Error in incrementView:", error.message, error.stack);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to increment view count",
            500,
            "IncrementView"
          )
    );
  }
};
