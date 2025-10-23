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
          timeout: 60000,
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

// Supported languages list
const supportedLanguages = [
  "javascript",
  "python",
  "java",
  "c",
  "cpp",
  "go",
  "typescript",
  "bash",
  "html",
  "css",
  "json",
  "markdown",
  "text",
];

// Function to normalize code block language
// Function to normalize code block language
const normalizeLanguage = (lang, code) => {
  // Trim and lower-case
  const normalized = lang?.trim().toLowerCase();

  console.log("🔍 Language detection:", {
    original: lang,
    normalized,
    codePreview: code?.substring(0, 100),
  });

  // If we have a valid normalized language that's supported, return it
  if (normalized && supportedLanguages.includes(normalized)) {
    console.log("✅ Using provided language:", normalized);
    return normalized;
  }

  // Auto-detect based on code content
  if (code?.trim()) {
    const codeContent = code.trim();

    console.log(
      "🔍 Auto-detecting language for code:",
      codeContent.substring(0, 100)
    );

    // Java detection patterns (FIXED - more comprehensive)
    const javaPatterns = [
      /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*\w*\s*\)/i, // main method
      /\bpublic\s+class\s+\w+/i, // class declaration
      /\bimport\s+java\./i, // java imports
      /\bSystem\.(out|err)\.print/i, // System.out.print
      /\bnew\s+\w+\s*\(/i, // object instantiation (common in Java)
      /\b(public|private|protected)\s+(static\s+)?(void|int|String|boolean)/i, // method declarations
    ];

    if (javaPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected Java language");
      return "java";
    }

    // HTML detection
    if (codeContent.startsWith("<") && codeContent.includes(">")) {
      console.log("✅ Detected HTML language");
      return "html";
    }

    // Python detection patterns
    const pythonPatterns = [
      /\bdef\s+\w+\s*\(/i,
      /\bimport\s+\w+/i,
      /\bfrom\s+\w+\s+import/i,
      /\bprint\s*\(/i,
      /^\s*#.*python/i,
    ];

    if (pythonPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected Python language");
      return "python";
    }

    // JavaScript detection patterns
    const jsPatterns = [
      /\bfunction\s+\w+\s*\(/i,
      /\b(const|let|var)\s+\w+/i,
      /\bconsole\.log\s*\(/i,
      /\=\>\s*\{/,
      /\brequire\s*\(/i,
      /\bexport\s+(default\s+)?/i,
    ];

    if (jsPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected JavaScript language");
      return "javascript";
    }

    // TypeScript detection patterns
    const tsPatterns = [
      /:\s*(string|number|boolean|object|any)\s*[=;,\)]/i,
      /\binterface\s+\w+/i,
      /\btype\s+\w+\s*=/i,
      /\bas\s+\w+/i,
    ];

    if (tsPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected TypeScript language");
      return "typescript";
    }

    // C/C++ detection patterns
    const cPatterns = [
      /#include\s*<\w+>/i,
      /\bint\s+main\s*\(/i,
      /\bprintf\s*\(/i,
    ];

    const cppPatterns = [
      /\bstd::/i,
      /\bcout\s*<</i,
      /\bcin\s*>>/i,
      /#include\s*<iostream>/i,
    ];

    if (cppPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected C++ language");
      return "cpp";
    }

    if (cPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected C language");
      return "c";
    }

    // Go detection patterns
    const goPatterns = [
      /\bpackage\s+main/i,
      /\bfunc\s+main\s*\(\s*\)/i,
      /\bimport\s+\(/i,
      /\bfmt\.Print/i,
    ];

    if (goPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected Go language");
      return "go";
    }

    // CSS detection
    if (
      /[\w-]+\s*:\s*[^;]+;/.test(codeContent) &&
      /\{[\s\S]*\}/.test(codeContent)
    ) {
      console.log("✅ Detected CSS language");
      return "css";
    }

    // JSON detection
    try {
      JSON.parse(codeContent);
      console.log("✅ Detected JSON language");
      return "json";
    } catch (e) {
      // Not JSON, continue
    }

    // Bash/Shell detection
    const bashPatterns = [/^#!/i, /\becho\s+/i, /\$\{?\w+\}?/, /\|\s*\w+/];

    if (bashPatterns.some((pattern) => pattern.test(codeContent))) {
      console.log("✅ Detected Bash language");
      return "bash";
    }
  }

  // Fallback to plaintext instead of "null"
  console.log("⚠️ No language detected, using plaintext");
  return "code";
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
        processImage(block.src, block.id, "readzio/post/images/")
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
                trimmed.length <= 200 &&
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

    // Process code blocks - ENHANCED DEBUGGING
    if (block.type === "code") {
      console.log("🔍 [ProcessBlock] BEFORE language normalization:", {
        blockId: block.id,
        originalLanguage: processedBlock.language,
        codeLength: processedBlock.code?.length,
        codePreview: processedBlock.code?.substring(0, 150),
        hasJavaKeywords: {
          hasImportJava: processedBlock.code?.includes("import java"),
          hasMainMethod: processedBlock.code?.includes(
            "public static void main"
          ),
          hasSystemOut: processedBlock.code?.includes("System.out"),
        },
      });

      // Apply language normalization
      const beforeNormalization = processedBlock.language;
      processedBlock.language = normalizeLanguage(
        processedBlock.language,
        processedBlock.code
      );

      console.log("🔎 [ProcessBlock] AFTER language normalization:", {
        blockId: block.id,
        beforeNormalization: beforeNormalization,
        afterNormalization: processedBlock.language,
        wasChanged: beforeNormalization !== processedBlock.language,
        finalLanguage: processedBlock.language,
      });

      // Code length validation
      if (processedBlock.code?.length > 50000) {
        processedBlock.code =
          processedBlock.code.substring(0, 50000) + "\n// ... truncated";
      }

      // Final verification
      if (
        processedBlock.language === "plaintext" &&
        processedBlock.code?.includes("import java")
      ) {
        console.error(
          "🚨 [ProcessBlock] ERROR: Java code still detected as plaintext!",
          {
            blockId: block.id,
            code: processedBlock.code,
            finalLanguage: processedBlock.language,
          }
        );
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
// export const createPost = async (req, res, next) => {
//   let session = null;
//   const startTime = Date.now();

//   try {
//     logMemory("📝 Start createPost");
//     console.log("[CreatePost] Request initiated by user:", req.user?._id);

//     if (!req.user?._id) {
//       throw new AppError(
//         "You must be signed in to create posts.",
//         401,
//         "CreatePost"
//       );
//     }

//     // Rate limiting
//     checkRateLimit(req.user._id, cache);

//     // Payload size validation
//     const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
//     if (payloadSize > 40 * 1024 * 1024) {
//       throw new AppError(
//         `Payload exceeds 40MB limit: ${(payloadSize / 1024 / 1024).toFixed(
//           2
//         )}MB`,
//         413,
//         "CreatePost"
//       );
//     }

//     const {
//       title,
//       category,
//       excerpt,
//       tags: rawTags,
//       blocks: rawBlocks = [],
//       thumbnail: rawThumbnail,
//       thumbnailSize,
//       isEmbed: isThumbnailEmbed = false,
//       isFeatured = false,
//       isPinned = false,
//       language = "en",
//       postType = "Blog",
//     } = req.body;

//     // Parse tags & blocks
//     let tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
//     let blocks = Array.isArray(rawBlocks)
//       ? rawBlocks
//       : JSON.parse(rawBlocks || "[]");

//     validateCreatePostInput({ title, category, language, tags, blocks });

//     // Duplicate post check (last 2 minutes)
//     const recentPost = await PostModel.findOne({
//       title: title.trim(),
//       author: req.user._id,
//       createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
//     }).lean();
//     if (recentPost) {
//       throw new AppError(
//         "A post with this title was recently created. Please wait before creating another.",
//         429,
//         "CreatePost"
//       );
//     }

//     logMemory("📦 After input validation");

//     // Process blocks with IDs
//     const validBlockTypes = [
//       "header",
//       "paragraph",
//       "list",
//       "image",
//       "quote",
//       "code",
//       "delimiter",
//       "table",
//       "embed",
//       "poll",
//       "checklist",
//       "warning",
//     ];
//     const blocksWithIds = blocks.map((block, i) => {
//       if (!block || typeof block !== "object" || !block.type)
//         throw new AppError(`Invalid block at index ${i}`, 400, "CreatePost");
//       if (!validBlockTypes.includes(block.type))
//         console.warn(`[CreatePost] Unknown block type: ${block.type}`);
//       return { id: block.id || uuidv4(), blocked: false, ...block };
//     });

//     blocksWithIds.forEach((block, i) => {
//       if (block.type === "table") {
//         if (
//           !block.data ||
//           !Array.isArray(block.data) ||
//           !block.data.every((r) => Array.isArray(r) && r.length)
//         ) {
//           throw new AppError(
//             `Table block at index ${i} has invalid data`,
//             400,
//             "CreatePost"
//           );
//         }
//       }
//     });

//     // Concurrency limits
//     const blockLimit = pLimit(3);
//     const imageLimit = pLimit(2);

//     logMemory("🖼️ Before processing blocks");
//     const processedBlocks = await Promise.all(
//       blocksWithIds.map((block) =>
//         blockLimit(() => processBlock(block, blockLimit, imageLimit))
//       )
//     );
//     logMemory("🖼️ After processing blocks");

//     // Reading time
//     const { readTime, readingTime } = calculateReadTime(processedBlocks);

//     // Thumbnail processing
//     let processedThumbnail = null;
//     if (rawThumbnail) {
//       if (isThumbnailEmbed) {
//         try {
//           new URL(rawThumbnail);
//           processedThumbnail = rawThumbnail;
//         } catch {
//           throw new AppError("Invalid thumbnail embed URL", 400, "CreatePost");
//         }
//       } else {
//         logMemory("🖼️ Before processing thumbnail");
//         processedThumbnail = await imageLimit(() =>
//           processImage(rawThumbnail, "thumbnail", "readzio/post/thumbnails/")
//         );
//         logMemory("🖼️ After processing thumbnail");
//       }
//     }

//     // Content moderation
//     const moderateContent = async (text) => {
//       const spamPatterns = [/(.)\1{20,}/i, /http[s]?:\/\/[^\s]{100,}/i];
//       for (const p of spamPatterns)
//         if (p.test(text))
//           return { isFlagged: true, categories: { spam: true } };
//       return { isFlagged: false, categories: {} };
//     };
//     const blockTextContent = processedBlocks
//       .flatMap((b) =>
//         ["text", "value", "code", "caption", "question"]
//           .map((f) => b[f])
//           .filter(Boolean)
//       )
//       .join("\n");
//     const fullText = `${title}\n${excerpt || ""}\n${blockTextContent}`;
//     const moderation = await moderateContent(fullText);
//     if (moderation.isFlagged)
//       throw new AppError(`Content violates guidelines`, 400, "CreatePost");

//     // DB transaction
//     session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // Generate unique slug inside transaction
//       const slug = await generateSafeSlug(title);

//       const postData = {
//         title: title.trim(),
//         slug,
//         category: category.trim(),
//         tags: tags.filter((t) => t && typeof t === "string").slice(0, 20),
//         thumbnail: processedThumbnail,
//         thumbnailSize,
//         isEmbed: isThumbnailEmbed,
//         excerpt: excerpt ? excerpt.trim().substring(0, 500) : undefined,
//         blocks: processedBlocks,
//         author: req.user._id,
//         isFeatured: Boolean(isFeatured),
//         isPinned: Boolean(isPinned),
//         isPublished: true,
//         language: language.trim(),
//         readTime,
//         readingTime,
//         postType: postType.trim(),
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       };

//       const [newPost] = await asyncRetry(
//         () => PostModel.create([postData], { session }),
//         { retries: 3, minTimeout: 2000 }
//       );

//       await recordActivity(
//         {
//           userId: req.user._id,
//           action: "POST_CREATED",
//           targetPost: newPost._id,
//           message: `Created post: ${title.substring(0, 100)}`,
//         },
//         { session }
//       );

//       await session.commitTransaction();
//       logMemory("💾 Transaction committed");

//       // Non-blocking post-transaction tasks
//       (async () => {
//         try {
//           await new Promise((r) => setTimeout(r, 1000));
//           await asyncRetry(
//             () =>
//               io.emit("postCreated", {
//                 ...newPost.toObject(),
//                 authorId: req.user._id,
//                 timestamp: new Date(),
//               }),
//             { retries: 2, minTimeout: 500 }
//           );
//           const cacheKeys = [
//             `postCounts:${req.user._id}`,
//             `post:${slug}`,
//             `userPosts:${req.user._id}`,
//           ];
//           cacheKeys.forEach((k) => cache.del(k));
//         } catch (err) {
//           console.warn(
//             "[CreatePost] Post-transaction tasks failed:",
//             err.message
//           );
//         }
//       })();

//       const processingTime = Date.now() - startTime;
//       logMemory("🎉 End createPost");
//       res.status(201).json({
//         success: true,
//         message: "Post created successfully",
//         post: newPost,
//         meta: {
//           processingTime,
//           blocksProcessed: processedBlocks.length,
//           imagesProcessed: processedBlocks.filter((b) => b.type === "image")
//             .length,
//         },
//       });
//     } catch (dbError) {
//       await session.abortTransaction();
//       if (dbError.code === 11000)
//         throw new AppError("Duplicate title exists", 409, "CreatePost");
//       throw new AppError(
//         dbError.message || "Failed to save post",
//         500,
//         "CreatePost"
//       );
//     }
//   } catch (error) {
//     if (session && session.inTransaction()) await session.abortTransaction();
//     next(
//       error instanceof AppError
//         ? error
//         : new AppError(
//             error.message || "Unexpected error",
//             error.status || 500,
//             "CreatePost"
//           )
//     );
//   } finally {
//     if (session) await session.endSession();
//     logMemory("🧹 Final cleanup");
//   }
// };

// Main create post function
export const createPost = async (req, res, next) => {
  let session = null;
  const startTime = Date.now();

  try {
    logMemory("📝 Start createPost");
    console.log("[CreatePost] Request initiated by user:", req.user?._id);

    if (!req.user?._id) {
      throw new AppError(
        "You must be signed in to create posts.",
        401,
        "CreatePost"
      );
    }

    // Rate limiting
    checkRateLimit(req.user._id, cache);

    // ✅ FIXED: Unified payload size validation (15MB)
    const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
    const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024; // 15MB

    if (payloadSize > MAX_PAYLOAD_SIZE) {
      throw new AppError(
        `Payload exceeds 15MB limit: ${(payloadSize / 1024 / 1024).toFixed(
          2
        )}MB. ` +
          `Please reduce image quality, remove unnecessary images, or split into multiple posts.`,
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

    // Parse tags & blocks
    let tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags || "[]");
    let blocks = Array.isArray(rawBlocks)
      ? rawBlocks
      : JSON.parse(rawBlocks || "[]");

    // ✅ ADDED: Validate blocks and images count
    if (blocks.length > 100) {
      throw new AppError(
        `Too many blocks (${blocks.length}). Maximum allowed: 100`,
        413,
        "CreatePost"
      );
    }

    const imageBlocks = blocks.filter((b) => b.type === "image");
    if (imageBlocks.length > 50) {
      throw new AppError(
        `Too many images (${imageBlocks.length}). Maximum allowed: 50. ` +
          `Consider using external image hosting or splitting into multiple posts.`,
        413,
        "CreatePost"
      );
    }

    // ✅ ADDED: Validate individual image sizes
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
    imageBlocks.forEach((block, idx) => {
      if (block.data?.file && typeof block.data.file === "string") {
        const imgSize = Buffer.byteLength(block.data.file, "utf8") * 0.75; // Account for base64
        if (imgSize > MAX_IMAGE_SIZE) {
          throw new AppError(
            `Image at block ${idx} exceeds 5MB limit (${(
              imgSize /
              1024 /
              1024
            ).toFixed(2)}MB). ` + `Please compress or resize the image.`,
            413,
            "CreatePost"
          );
        }
      }
    });

    validateCreatePostInput({ title, category, language, tags, blocks });

    // Duplicate post check (last 2 minutes)
    const recentPost = await PostModel.findOne({
      title: title.trim(),
      author: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
    }).lean();
    if (recentPost) {
      throw new AppError(
        "A post with this title was recently created. Please wait before creating another.",
        429,
        "CreatePost"
      );
    }

    logMemory("📦 After input validation");

    // Process blocks with IDs
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
    const blocksWithIds = blocks.map((block, i) => {
      if (!block || typeof block !== "object" || !block.type)
        throw new AppError(`Invalid block at index ${i}`, 400, "CreatePost");
      if (!validBlockTypes.includes(block.type))
        console.warn(`[CreatePost] Unknown block type: ${block.type}`);
      return { id: block.id || uuidv4(), blocked: false, ...block };
    });

    blocksWithIds.forEach((block, i) => {
      if (block.type === "table") {
        if (
          !block.data ||
          !Array.isArray(block.data) ||
          !block.data.every((r) => Array.isArray(r) && r.length)
        ) {
          throw new AppError(
            `Table block at index ${i} has invalid data`,
            400,
            "CreatePost"
          );
        }
      }
    });

    // Concurrency limits
    const blockLimit = pLimit(3);
    const imageLimit = pLimit(2);

    logMemory("🖼️ Before processing blocks");
    const processedBlocks = await Promise.all(
      blocksWithIds.map((block) =>
        blockLimit(() => processBlock(block, blockLimit, imageLimit))
      )
    );
    logMemory("🖼️ After processing blocks");

    // Reading time
    const { readTime, readingTime } = calculateReadTime(processedBlocks);

    // Thumbnail processing
    let processedThumbnail = null;
    if (rawThumbnail) {
      if (isThumbnailEmbed) {
        try {
          new URL(rawThumbnail);
          processedThumbnail = rawThumbnail;
        } catch {
          throw new AppError("Invalid thumbnail embed URL", 400, "CreatePost");
        }
      } else {
        logMemory("🖼️ Before processing thumbnail");
        processedThumbnail = await imageLimit(() =>
          processImage(rawThumbnail, "thumbnail", "readzio/post/thumbnails/")
        );
        logMemory("🖼️ After processing thumbnail");
      }
    }

    // Content moderation
    const moderateContent = async (text) => {
      const spamPatterns = [/(.)\1{20,}/i, /http[s]?:\/\/[^\s]{100,}/i];
      for (const p of spamPatterns)
        if (p.test(text))
          return { isFlagged: true, categories: { spam: true } };
      return { isFlagged: false, categories: {} };
    };
    const blockTextContent = processedBlocks
      .flatMap((b) =>
        ["text", "value", "code", "caption", "question"]
          .map((f) => b[f])
          .filter(Boolean)
      )
      .join("\n");
    const fullText = `${title}\n${excerpt || ""}\n${blockTextContent}`;
    const moderation = await moderateContent(fullText);
    if (moderation.isFlagged)
      throw new AppError(`Content violates guidelines`, 400, "CreatePost");

    // DB transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate unique slug inside transaction
      const slug = await generateSafeSlug(title);

      const postData = {
        title: title.trim(),
        slug,
        category: category.trim(),
        tags: tags.filter((t) => t && typeof t === "string").slice(0, 20),
        thumbnail: processedThumbnail,
        thumbnailSize,
        isEmbed: isThumbnailEmbed,
        excerpt: excerpt ? excerpt.trim().substring(0, 500) : undefined,
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

      const [newPost] = await asyncRetry(
        () => PostModel.create([postData], { session }),
        { retries: 3, minTimeout: 2000 }
      );

      await recordActivity(
        {
          userId: req.user._id,
          action: "POST_CREATED",
          targetPost: newPost._id,
          message: `Created post: ${title.substring(0, 100)}`,
        },
        { session }
      );

      await session.commitTransaction();
      logMemory("💾 Transaction committed");

      // Non-blocking post-transaction tasks
      (async () => {
        try {
          await new Promise((r) => setTimeout(r, 1000));
          await asyncRetry(
            () =>
              io.emit("postCreated", {
                ...newPost.toObject(),
                authorId: req.user._id,
                timestamp: new Date(),
              }),
            { retries: 2, minTimeout: 500 }
          );
          const cacheKeys = [
            `postCounts:${req.user._id}`,
            `post:${slug}`,
            `userPosts:${req.user._id}`,
          ];
          cacheKeys.forEach((k) => cache.del(k));
        } catch (err) {
          console.warn(
            "[CreatePost] Post-transaction tasks failed:",
            err.message
          );
        }
      })();

      const processingTime = Date.now() - startTime;
      logMemory("🎉 End createPost");

      // ✅ ADDED: Enhanced response with size info
      const response = {
        success: true,
        message: "Post created successfully",
        post: newPost,
        meta: {
          processingTime,
          payloadSize: `${(payloadSize / 1024 / 1024).toFixed(2)}MB`,
          blocksProcessed: processedBlocks.length,
          imagesProcessed: processedBlocks.filter((b) => b.type === "image")
            .length,
        },
      };

      // ✅ ADDED: Optimization suggestions for large posts
      if (payloadSize > 10 * 1024 * 1024) {
        response.meta.suggestions = [
          "Consider compressing images to reduce post size",
          "For better performance, keep posts under 10MB when possible",
        ];
      }
      if (imageBlocks.length > 30) {
        response.meta.suggestions = response.meta.suggestions || [];
        response.meta.suggestions.push(
          "Consider using image galleries for large collections"
        );
      }

      res.status(201).json(response);
    } catch (dbError) {
      await session.abortTransaction();
      if (dbError.code === 11000)
        throw new AppError("Duplicate title exists", 409, "CreatePost");
      throw new AppError(
        dbError.message || "Failed to save post",
        500,
        "CreatePost"
      );
    }
  } catch (error) {
    if (session && session.inTransaction()) await session.abortTransaction();
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Unexpected error",
            error.status || 500,
            "CreatePost"
          )
    );
  } finally {
    if (session) await session.endSession();
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

// Content moderation function
const moderateContent = async (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { isFlagged: true, categories: { invalid: true } };
  }

  const spamPatterns = [
    /(.)\1{20,}/i, // Repeated characters
    /http[s]?:\/\/[^\s]{100,}/i, // Very long URLs
    /<script.*?>.*?<\/script>/i, // Basic XSS check
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return { isFlagged: true, categories: { spam: true } };
    }
  }

  return { isFlagged: false, categories: {} };
};

export const updatePostBySlug = async (req, res, next) => {
  let session = null;
  const startTime = Date.now();

  try {
    logMemory("✏️ Start updatePostBySlug");
    const { slug } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!slug?.trim() || !userId) {
      throw new AppError(
        !slug?.trim() ? "Valid slug is required" : "Authentication required",
        !slug?.trim() ? 400 : 401,
        "UpdatePostBySlug"
      );
    }

    if (req.user.blocked) {
      throw new AppError("Account is blocked", 403, "UpdatePostBySlug");
    }

    // ✅ FIXED: Unified payload size validation (15MB, same as create)
    const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
    const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024; // 15MB

    if (payloadSize > MAX_PAYLOAD_SIZE) {
      throw new AppError(
        `Payload exceeds 15MB limit: ${(payloadSize / 1024 / 1024).toFixed(
          2
        )}MB. ` +
          `Please reduce image quality, remove unnecessary images, or split into multiple posts.`,
        413,
        "UpdatePostBySlug"
      );
    }

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

    // Parse and validate tags
    let tags;
    if (rawTags !== undefined) {
      try {
        tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags);
        if (!Array.isArray(tags)) throw new Error("Tags must be an array");
        tags = tags
          .filter((t) => t && typeof t === "string")
          .map((t) => t.trim())
          .slice(0, 20);
      } catch {
        throw new AppError(
          "Invalid tags format - must be valid JSON array",
          400,
          "UpdatePostBySlug"
        );
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

        // ✅ FIXED: Increased block limit to match create (was missing before)
        if (blocks.length > 100) {
          throw new AppError(
            `Too many blocks (${blocks.length}). Maximum allowed: 100`,
            413,
            "UpdatePostBySlug"
          );
        }

        // ✅ ADDED: Validate image count
        const imageBlocks = blocks.filter((b) => b.type === "image");
        if (imageBlocks.length > 50) {
          throw new AppError(
            `Too many images (${imageBlocks.length}). Maximum allowed: 50. ` +
              `Consider using external image hosting or splitting into multiple posts.`,
            413,
            "UpdatePostBySlug"
          );
        }

        // ✅ ADDED: Validate individual image sizes
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
        imageBlocks.forEach((block, idx) => {
          if (block.data?.file && typeof block.data.file === "string") {
            const imgSize = Buffer.byteLength(block.data.file, "utf8") * 0.75; // Account for base64
            if (imgSize > MAX_IMAGE_SIZE) {
              throw new AppError(
                `Image at block ${idx} exceeds 5MB limit (${(
                  imgSize /
                  1024 /
                  1024
                ).toFixed(2)}MB). ` + `Please compress or resize the image.`,
                413,
                "UpdatePostBySlug"
              );
            }
          }
        });
      } catch (error) {
        // Re-throw AppError as-is, wrap other errors
        if (error instanceof AppError) throw error;
        throw new AppError(
          "Invalid blocks format - must be valid JSON array",
          400,
          "UpdatePostBySlug"
        );
      }
    }

    // Basic input validation
    if (
      title !== undefined &&
      (!title || title.trim().length < 3 || title.length > 300)
    ) {
      throw new AppError(
        "Title must be 3-300 characters",
        400,
        "UpdatePostBySlug"
      );
    }
    if (
      category !== undefined &&
      (!category || category.trim().length === 0 || category.length > 100)
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

    // Fetch post with authorization
    const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query =
      userRole === "admin"
        ? { slug: { $regex: `^${escapedSlug}$`, $options: "i" } }
        : {
            slug: { $regex: `^${escapedSlug}$`, $options: "i" },
            author: userId,
          };

    const post = await PostModel.findOne(query).lean();
    if (!post) {
      const exists = await PostModel.findOne({
        slug: { $regex: `^${escapedSlug}$`, $options: "i" },
      }).lean();
      throw new AppError(
        exists ? "Unauthorized to update this post" : "Post not found",
        exists ? 403 : 404,
        "UpdatePostBySlug"
      );
    }

    if (post.blocked)
      throw new AppError(
        "Post is blocked and cannot be updated",
        403,
        "UpdatePostBySlug"
      );

    // Process blocks if provided
    let processedBlocks;
    if (blocks) {
      const blockLimit = pLimit(3);
      const imageLimit = pLimit(2);
      const blocksWithIds = blocks.map((b) => ({
        id: b.id || uuidv4(),
        blocked: false,
        ...b,
      }));
      processedBlocks = await Promise.all(
        blocksWithIds.map((b) =>
          blockLimit(() => processBlock(b, blockLimit, imageLimit))
        )
      );
    }

    // Process thumbnail
    let processedThumbnail;
    if (rawThumbnail && !isThumbnailEmbed) {
      processedThumbnail = await processImage(
        rawThumbnail,
        "thumbnail",
        "readzio/post/thumbnails/"
      );
    } else if (rawThumbnail && isThumbnailEmbed) {
      try {
        new URL(rawThumbnail);
        processedThumbnail = rawThumbnail;
      } catch {
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
      ({ readTime, readingTime } = calculateReadTime(processedBlocks));
    }

    // Content moderation
    if (title || excerpt || processedBlocks) {
      const blockTextContent =
        processedBlocks
          ?.flatMap((b) => [b.text, b.value, b.caption].filter(Boolean))
          .join(" ")
          .substring(0, 5000) || "";
      const fullText = `${title || post.title} ${
        excerpt || ""
      } ${blockTextContent}`.substring(0, 10000);
      const moderation = await moderateContent(fullText);
      if (moderation.isFlagged) {
        const reasons = Object.keys(moderation.categories).filter(
          (k) => moderation.categories[k]
        );
        throw new AppError(
          `Content violates community guidelines: ${reasons.join(", ")}`,
          400,
          "UpdatePostBySlug"
        );
      }
    }

    // Prepare update object
    const updates = {};
    if (title && title.trim() !== post.title) updates.title = title.trim();
    if (category && category.trim() !== post.category)
      updates.category = category.trim();
    if (excerpt !== undefined)
      updates.excerpt = excerpt ? excerpt.trim().substring(0, 500) : "";
    if (tags) updates.tags = tags;
    if (processedThumbnail !== undefined)
      updates.thumbnail = processedThumbnail;
    if (thumbnailSize !== undefined) updates.thumbnailSize = thumbnailSize;
    if (isThumbnailEmbed !== undefined) updates.isEmbed = isThumbnailEmbed;
    if (processedBlocks) updates.blocks = processedBlocks;
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);
    if (language) updates.language = language.trim();
    if (postType) updates.postType = postType.trim();
    if (readTime !== undefined) updates.readTime = readTime;
    if (readingTime !== undefined) updates.readingTime = readingTime;
    updates.isPublished = true;
    updates.lastEditedAt = new Date();
    updates.updatedAt = new Date();

    if (Object.keys(updates).length <= 3) {
      return res
        .status(200)
        .json({ success: true, message: "No changes detected", post });
    }

    // Update post within transaction
    session = await mongoose.startSession();
    let updatedPost;
    await session.withTransaction(async () => {
      updatedPost = await PostModel.findOneAndUpdate(
        { _id: post._id },
        { $set: updates },
        { new: true, runValidators: true, session }
      );
      if (!updatedPost)
        throw new AppError("Failed to update post", 500, "UpdatePostBySlug");

      await recordActivity(
        {
          userId: userId,
          action: "POST_EDITED",
          targetPost: updatedPost._id,
          message: `Edited post: ${updatedPost.title}`,
        },
        { session }
      );
    });

    const processingTime = Date.now() - startTime;

    // ✅ ADDED: Enhanced response with size info
    const response = {
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
      meta: {
        processingTime,
        payloadSize: `${(payloadSize / 1024 / 1024).toFixed(2)}MB`,
        fieldsUpdated: Object.keys(updates).length,
        blocksProcessed: processedBlocks?.length || 0,
      },
    };

    // ✅ ADDED: Optimization suggestions for large posts
    if (payloadSize > 10 * 1024 * 1024) {
      response.meta.suggestions = [
        "Consider compressing images to reduce post size",
        "For better performance, keep posts under 10MB when possible",
      ];
    }
    if (blocks && blocks.filter((b) => b.type === "image").length > 30) {
      response.meta.suggestions = response.meta.suggestions || [];
      response.meta.suggestions.push(
        "Consider using image galleries for large collections"
      );
    }

    res.status(200).json(response);

    // Async post-response tasks (cache & socket)
    process.nextTick(async () => {
      try {
        const cacheKeys = [
          `postCounts:${userId}`,
          `countAllPosts`,
          `countMyPosts:${userId}`,
          `postId:${slug}`,
          `singlePost:${slug}:${userId}:${userRole || "none"}`,
        ];
        await Promise.all(cacheKeys.map((k) => cache.del(k)));
        await asyncRetry(
          () =>
            io.emit("postUpdated", {
              ...updatedPost.toObject(),
              authorId: userId,
            }),
          { retries: 5, minTimeout: 1000, maxTimeout: 10000 }
        );
      } catch (err) {
        console.warn(
          "[UpdatePostBySlug] Post-response operations failed:",
          err.message
        );
      }
    });
  } catch (error) {
    console.error("[UpdatePostBySlug] Error:", error);
    if (!res.headersSent) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to update post",
              500,
              "UpdatePostBySlug"
            )
      );
    }
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (sessionError) {
        console.error(
          "[UpdatePostBySlug] Session cleanup failed:",
          sessionError
        );
      }
    }
    logMemory("🧹 Final cleanup");
  }
};

// export const updatePostBySlug = async (req, res, next) => {
//   let session = null;
//   const startTime = Date.now();

//   try {
//     logMemory("✏️ Start updatePostBySlug");
//     const { slug } = req.params;
//     const userId = req.user?._id;
//     const userRole = req.user?.role;

//     if (!slug?.trim() || !userId) {
//       throw new AppError(
//         !slug?.trim() ? "Valid slug is required" : "Authentication required",
//         !slug?.trim() ? 400 : 401,
//         "UpdatePostBySlug"
//       );
//     }

//     if (req.user.blocked) {
//       throw new AppError("Account is blocked", 403, "UpdatePostBySlug");
//     }

//     const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
//     if (payloadSize > 10 * 1024 * 1024) {
//       throw new AppError(
//         `Payload exceeds 10MB limit: ${(payloadSize / 1024 / 1024).toFixed(
//           2
//         )}MB`,
//         413,
//         "UpdatePostBySlug"
//       );
//     }

//     const {
//       title,
//       category,
//       excerpt,
//       tags: rawTags,
//       blocks: rawBlocks,
//       thumbnail: rawThumbnail,
//       thumbnailSize,
//       isEmbed: isThumbnailEmbed = false,
//       isFeatured,
//       isPinned,
//       language,
//       postType,
//     } = req.body;

//     // Parse and validate tags
//     let tags;
//     if (rawTags !== undefined) {
//       try {
//         tags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags);
//         if (!Array.isArray(tags)) throw new Error("Tags must be an array");
//         tags = tags
//           .filter((t) => t && typeof t === "string")
//           .map((t) => t.trim())
//           .slice(0, 20);
//       } catch {
//         throw new AppError(
//           "Invalid tags format - must be valid JSON array",
//           400,
//           "UpdatePostBySlug"
//         );
//       }
//     }

//     // Parse and validate blocks
//     let blocks;
//     if (rawBlocks !== undefined) {
//       try {
//         blocks = Array.isArray(rawBlocks) ? rawBlocks : JSON.parse(rawBlocks);
//         if (!Array.isArray(blocks) || blocks.length === 0) {
//           throw new AppError(
//             "Blocks must be a non-empty array",
//             400,
//             "UpdatePostBySlug"
//           );
//         }
//         if (blocks.length > 100) {
//           throw new AppError(
//             "Too many blocks (max 100)",
//             400,
//             "UpdatePostBySlug"
//           );
//         }
//       } catch {
//         throw new AppError(
//           "Invalid blocks format - must be valid JSON array",
//           400,
//           "UpdatePostBySlug"
//         );
//       }
//     }

//     // Basic input validation
//     if (
//       title !== undefined &&
//       (!title || title.trim().length < 3 || title.length > 300)
//     ) {
//       throw new AppError(
//         "Title must be 3-300 characters",
//         400,
//         "UpdatePostBySlug"
//       );
//     }
//     if (
//       category !== undefined &&
//       (!category || category.trim().length === 0 || category.length > 100)
//     ) {
//       throw new AppError(
//         "Category must be 1-100 characters",
//         400,
//         "UpdatePostBySlug"
//       );
//     }
//     if (
//       excerpt !== undefined &&
//       typeof excerpt === "string" &&
//       excerpt.length > 1000
//     ) {
//       throw new AppError(
//         "Excerpt too long (max 1000 characters)",
//         400,
//         "UpdatePostBySlug"
//       );
//     }

//     // Fetch post with authorization
//     const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//     const query =
//       userRole === "admin"
//         ? { slug: { $regex: `^${escapedSlug}$`, $options: "i" } }
//         : {
//             slug: { $regex: `^${escapedSlug}$`, $options: "i" },
//             author: userId,
//           };

//     const post = await PostModel.findOne(query).lean();
//     if (!post) {
//       const exists = await PostModel.findOne({
//         slug: { $regex: `^${escapedSlug}$`, $options: "i" },
//       }).lean();
//       throw new AppError(
//         exists ? "Unauthorized to update this post" : "Post not found",
//         exists ? 403 : 404,
//         "UpdatePostBySlug"
//       );
//     }

//     if (post.blocked)
//       throw new AppError(
//         "Post is blocked and cannot be updated",
//         403,
//         "UpdatePostBySlug"
//       );

//     // Process blocks if provided
//     let processedBlocks;
//     if (blocks) {
//       const blockLimit = pLimit(3);
//       const imageLimit = pLimit(2);
//       const blocksWithIds = blocks.map((b) => ({
//         id: b.id || uuidv4(),
//         blocked: false,
//         ...b,
//       }));
//       processedBlocks = await Promise.all(
//         blocksWithIds.map((b) =>
//           blockLimit(() => processBlock(b, blockLimit, imageLimit))
//         )
//       );
//     }

//     // Process thumbnail
//     let processedThumbnail;
//     if (rawThumbnail && !isThumbnailEmbed) {
//       processedThumbnail = await processImage(
//         rawThumbnail,
//         "thumbnail",
//         "readzio/post/thumbnails/"
//       );
//     } else if (rawThumbnail && isThumbnailEmbed) {
//       try {
//         new URL(rawThumbnail);
//         processedThumbnail = rawThumbnail;
//       } catch {
//         throw new AppError(
//           "Invalid thumbnail embed URL",
//           400,
//           "UpdatePostBySlug"
//         );
//       }
//     }

//     // Calculate read time
//     let readTime, readingTime;
//     if (processedBlocks) {
//       ({ readTime, readingTime } = calculateReadTime(processedBlocks));
//     }

//     // Content moderation
//     if (title || excerpt || processedBlocks) {
//       const blockTextContent =
//         processedBlocks
//           ?.flatMap((b) => [b.text, b.value, b.caption].filter(Boolean))
//           .join(" ")
//           .substring(0, 5000) || "";
//       const fullText = `${title || post.title} ${
//         excerpt || ""
//       } ${blockTextContent}`.substring(0, 10000);
//       const moderation = await moderateContent(fullText);
//       if (moderation.isFlagged) {
//         const reasons = Object.keys(moderation.categories).filter(
//           (k) => moderation.categories[k]
//         );
//         throw new AppError(
//           `Content violates community guidelines: ${reasons.join(", ")}`,
//           400,
//           "UpdatePostBySlug"
//         );
//       }
//     }

//     // Prepare update object
//     const updates = {};
//     if (title && title.trim() !== post.title) updates.title = title.trim();
//     if (category && category.trim() !== post.category)
//       updates.category = category.trim();
//     if (excerpt !== undefined)
//       updates.excerpt = excerpt ? excerpt.trim().substring(0, 500) : "";
//     if (tags) updates.tags = tags;
//     if (processedThumbnail !== undefined)
//       updates.thumbnail = processedThumbnail;
//     if (thumbnailSize !== undefined) updates.thumbnailSize = thumbnailSize;
//     if (isThumbnailEmbed !== undefined) updates.isEmbed = isThumbnailEmbed;
//     if (processedBlocks) updates.blocks = processedBlocks;
//     if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
//     if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);
//     if (language) updates.language = language.trim();
//     if (postType) updates.postType = postType.trim();
//     if (readTime !== undefined) updates.readTime = readTime;
//     if (readingTime !== undefined) updates.readingTime = readingTime;
//     updates.isPublished = true;
//     updates.lastEditedAt = new Date();
//     updates.updatedAt = new Date();

//     if (Object.keys(updates).length <= 3) {
//       return res
//         .status(200)
//         .json({ success: true, message: "No changes detected", post });
//     }

//     // Update post within transaction
//     session = await mongoose.startSession();
//     let updatedPost;
//     await session.withTransaction(async () => {
//       updatedPost = await PostModel.findOneAndUpdate(
//         { _id: post._id },
//         { $set: updates },
//         { new: true, runValidators: true, session }
//       );
//       if (!updatedPost)
//         throw new AppError("Failed to update post", 500, "UpdatePostBySlug");

//       await recordActivity(
//         {
//           userId: userId,
//           action: "POST_EDITED",
//           targetPost: updatedPost._id,
//           message: `Edited post: ${updatedPost.title}`,
//         },
//         { session }
//       );
//     });

//     const processingTime = Date.now() - startTime;
//     res.status(200).json({
//       success: true,
//       message: "Post updated successfully",
//       post: updatedPost,
//       meta: {
//         processingTime,
//         fieldsUpdated: Object.keys(updates).length,
//         blocksProcessed: processedBlocks?.length || 0,
//       },
//     });

//     // Async post-response tasks (cache & socket)
//     process.nextTick(async () => {
//       try {
//         const cacheKeys = [
//           `postCounts:${userId}`,
//           `countAllPosts`,
//           `countMyPosts:${userId}`,
//           `postId:${slug}`,
//           `singlePost:${slug}:${userId}:${userRole || "none"}`,
//         ];
//         await Promise.all(cacheKeys.map((k) => cache.del(k)));
//         await asyncRetry(
//           () =>
//             io.emit("postUpdated", {
//               ...updatedPost.toObject(),
//               authorId: userId,
//             }),
//           { retries: 5, minTimeout: 1000, maxTimeout: 10000 }
//         );
//       } catch (err) {
//         console.warn(
//           "[UpdatePostBySlug] Post-response operations failed:",
//           err.message
//         );
//       }
//     });
//   } catch (error) {
//     console.error("[UpdatePostBySlug] Error:", error);
//     if (!res.headersSent) {
//       next(
//         error instanceof AppError
//           ? error
//           : new AppError(
//               error.message || "Failed to update post",
//               500,
//               "UpdatePostBySlug"
//             )
//       );
//     }
//   } finally {
//     if (session) {
//       try {
//         await session.endSession();
//       } catch (sessionError) {
//         console.error(
//           "[UpdatePostBySlug] Session cleanup failed:",
//           sessionError
//         );
//       }
//     }
//     logMemory("🧹 Final cleanup");
//   }
// };

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
