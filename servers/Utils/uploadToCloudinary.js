import cloudinary from "cloudinary";
import streamifier from "streamifier";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
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
      const shortId = uuidv4().slice(0, 8); // Short 8-char UUID, e.g., "a1b2c3d4"
      const publicId = `img_${shortId}`; // e.g., "img_a1b2c3d4"

      if (buffer) {
        // Compress and convert to WebP with sharp
        const compressedBuffer = await sharp(buffer)
          .resize({
            width: 800,
            height: 800,
            fit: "inside",
            withoutEnlargement: true,
          }) // Smaller dimensions
          .webp({ quality: 50, effort: 4 }) // WebP with lower quality
          .toBuffer();

        const uploadStream = cloudinary.v2.uploader.upload_stream(
          { folder, public_id: publicId, resource_type: "image" },
          (error, result) => {
            if (error)
              return reject(
                new Error("Cloudinary buffer upload failed: " + error.message)
              );
            resolve(result);
          }
        );

        streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
      } else if (base64) {
        // Compress base64 input with sharp before uploading
        const bufferFromBase64 = Buffer.from(base64.split(",")[1], "base64");
        const compressedBuffer = await sharp(bufferFromBase64)
          .resize({
            width: 800,
            height: 800,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 50, effort: 4 })
          .toBuffer();

        // Upload compressed buffer as WebP
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          { folder, public_id: publicId, resource_type: "image" },
          (error, result) => {
            if (error)
              return reject(
                new Error("Cloudinary base64 upload failed: " + error.message)
              );
            resolve(result);
          }
        );

        streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
      } else {
        reject(new Error("No valid file data provided to Cloudinary"));
      }
    } catch (err) {
      reject(new Error("Error during image processing: " + err.message));
    }
  });
};
