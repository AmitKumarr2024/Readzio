import cloudinary from "cloudinary";
import streamifier from "streamifier";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import asyncRetry from "async-retry";
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from "../config/dotenv.js";

cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async ({ buffer, base64, folder }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const shortId = uuidv4().slice(0, 8);
      const publicId = `img_${shortId}`;

      // ✅ Step 1: Convert to Buffer
      let originalBuffer;
      if (buffer) {
        originalBuffer = buffer;
      } else if (base64) {
        originalBuffer = Buffer.from(base64.split(",")[1], "base64");
      } else {
        return reject(new Error("No valid file data provided to Cloudinary"));
      }

      // ✅ Step 2: Validate size (15MB max)
      if (originalBuffer.length > 15 * 1024 * 1024) {
        return reject(new Error("Image size exceeds 15MB limit"));
      }

      // ✅ Step 3: Get metadata for smart processing
      const metadata = await sharp(originalBuffer).metadata();

      // ✅ Step 4: Resize only if too large (max 1200px)
      const MAX_SIZE = 1200;
      const shouldResize =
        metadata.width > MAX_SIZE || metadata.height > MAX_SIZE;

      let sharpInstance = sharp(originalBuffer, { failOnError: false });
      if (shouldResize) {
        sharpInstance = sharpInstance.resize({
          width: MAX_SIZE,
          height: MAX_SIZE,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // ✅ Step 5: Smart format & compression
      let compressedBuffer;
      if (metadata.format === "png" && metadata.hasAlpha) {
        // Preserve transparency
        compressedBuffer = await sharpInstance
          .png({ quality: 90, compressionLevel: 6 })
          .toBuffer();
      } else {
        compressedBuffer = await sharpInstance
          .webp({ quality: 80, effort: 4 }) // Higher quality
          .toBuffer();
      }

      // ✅ Step 6: Retry-safe upload to Cloudinary
      const result = await asyncRetry(
        () =>
          new Promise((res, rej) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
              {
                folder,
                public_id: publicId,
                resource_type: "image",
                transformation: [
                  {
                    fetch_format: "auto",
                    quality: "auto:best",
                    flags: ["progressive", "immutable_cache"],
                  },
                ],
              },
              (error, uploadResult) => {
                if (error) return rej(error);
                res(uploadResult);
              }
            );
            streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
          }),
        { retries: 5, minTimeout: 1000, maxTimeout: 5000 }
      );

      resolve(result);
    } catch (err) {
      reject(new Error("Error during image processing: " + err.message));
    }
  });
};
