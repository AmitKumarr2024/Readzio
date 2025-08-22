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

// old code
// export const uploadToCloudinary = async ({ buffer, base64, folder }) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const shortId = uuidv4().slice(0, 8); // Short 8-char UUID, e.g., "a1b2c3d4"
//       const publicId = `img_${shortId}`; // e.g., "img_a1b2c3d4"

//       if (buffer) {
//         // Compress and convert to WebP with sharp
//         const compressedBuffer = await sharp(buffer)
//           .resize({
//             width: 800,
//             height: 800,
//             fit: "inside",
//             withoutEnlargement: true,
//           }) // Smaller dimensions
//           .webp({ quality: 50, effort: 4 }) // WebP with lower quality
//           .toBuffer();

//         const uploadStream = cloudinary.v2.uploader.upload_stream(
//           { folder, public_id: publicId, resource_type: "image" },
//           (error, result) => {
//             if (error)
//               return reject(
//                 new Error("Cloudinary buffer upload failed: " + error.message)
//               );
//             resolve(result);
//           }
//         );

//         streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
//       } else if (base64) {
//         // Compress base64 input with sharp before uploading
//         const bufferFromBase64 = Buffer.from(base64.split(",")[1], "base64");
//         const compressedBuffer = await sharp(bufferFromBase64)
//           .resize({
//             width: 800,
//             height: 800,
//             fit: "inside",
//             withoutEnlargement: true,
//           })
//           .webp({ quality: 50, effort: 4 })
//           .toBuffer();

//         // Upload compressed buffer as WebP
//         const uploadStream = cloudinary.v2.uploader.upload_stream(
//           { folder, public_id: publicId, resource_type: "image" },
//           (error, result) => {
//             if (error)
//               return reject(
//                 new Error("Cloudinary base64 upload failed: " + error.message)
//               );
//             resolve(result);
//           }
//         );

//         streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
//       } else {
//         reject(new Error("No valid file data provided to Cloudinary"));
//       }
//     } catch (err) {
//       reject(new Error("Error during image processing: " + err.message));
//     }
//   });
// };

// new code
export const uploadToCloudinary = async ({ buffer, base64, folder }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const shortId = uuidv4().slice(0, 8); // Short 8-char UUID, e.g., "a1b2c3d4"
      const publicId = `img_${shortId}`; // e.g., "img_a1b2c3d4"

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
              { folder, public_id: publicId, resource_type: "image" },
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
        { retries: 3, minTimeout: 1000 }
      )
        .then(resolve)
        .catch(reject);
    } catch (err) {
      reject(new Error("Error during image processing: " + err.message));
    }
  });
};
