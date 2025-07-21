// utils/imageProcessor.js

import axios from "axios";
import sharp from "sharp";
import { AppError } from "../../servers/Utils/AppError.js";
import { uploadToCloudinary } from "./uploadToCloudinary.js";

/**
 * Processes an image input (base64 string, URL, or Buffer), compresses it to WebP,
 * resizes if needed, and uploads to Cloudinary.
 *
 * @param {string|Buffer} input - base64, URL, or file buffer
 * @param {string} folder - Cloudinary upload folder
 * @param {number} maxSize - Maximum dimension (default: 800)
 * @param {string} context - Context string for error messages
 * @returns {Promise<string>} - Uploaded image URL
 */
export const processImageInput = async (input, folder, maxSize = 800, context = "ImageUpload") => {
  let buffer;

  try {
    if (typeof input === "string" && input.startsWith("data:image")) {
      const match = input.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
      if (!match) throw new AppError("Invalid base64 image", 400, context, "Invalid base64 format");
      buffer = Buffer.from(match[1], "base64");
    } else if (typeof input === "string" && input.startsWith("http")) {
      const response = await axios.get(input, { responseType: "arraybuffer", timeout: 5000 });
      buffer = Buffer.from(response.data, "binary");
    } else if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      throw new AppError("Unsupported image input", 400, context, "Must be base64, URL, or file buffer");
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new AppError("Unsupported image format", 400, context, "Only JPEG, PNG, WebP allowed");
    }

    if ((metadata.width || 0) > maxSize || (metadata.height || 0) > maxSize) {
      image.resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true });
    }

    const compressedBuffer = await image
      .webp({ quality: 75, effort: 4 })
      .toBuffer();

    const uploaded = await uploadToCloudinary({ buffer: compressedBuffer, folder });

    if (!uploaded?.secure_url) {
      throw new AppError("Image upload failed", 500, context, "Cloudinary upload failure");
    }

    return uploaded.secure_url;
  } catch (err) {
    throw err instanceof AppError
      ? err
      : new AppError(err.message || "Image processing failed", 500, context, "Unhandled error");
  }
};
