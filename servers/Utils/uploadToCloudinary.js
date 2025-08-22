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

      let compressedBuffer;
      if (buffer) {
        if (buffer.length > 5 * 1024 * 1024) {
          return reject(new Error("Image size exceeds 5MB limit"));
        }
        compressedBuffer = await sharp(buffer)
          .resize({
            width: 600,
            height: 600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 30, effort: 4 })
          .toBuffer();
      } else if (base64) {
        const bufferFromBase64 = Buffer.from(base64.split(",")[1], "base64");
        if (bufferFromBase64.length > 5 * 1024 * 1024) {
          return reject(new Error("Image size exceeds 5MB limit"));
        }
        compressedBuffer = await sharp(bufferFromBase64)
          .resize({
            width: 600,
            height: 600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 30, effort: 4 })
          .toBuffer();
      } else {
        return reject(new Error("No valid file data provided to Cloudinary"));
      }

      await asyncRetry(
        async () => {
          return new Promise((res, rej) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
              {
                folder,
                public_id: publicId,
                resource_type: "image",
                timeout: 60000,
              },
              (error, result) => {
                if (error)
                  return rej(
                    new Error("Cloudinary upload failed: " + error.message)
                  );
                res(result);
              }
            );
            streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
          });
        },
        { retries: 5, minTimeout: 1000, maxTimeout: 5000 }
      )
        .then(resolve)
        .catch(reject);
    } catch (err) {
      reject(new Error("Error during image processing: " + err.message));
    }
  });
};
