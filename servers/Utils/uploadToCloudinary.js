import cloudinary from 'cloudinary';
import streamifier from 'streamifier';
import sharp from 'sharp'; 
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from '../config/dotenv.js';

cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async ({ buffer, base64, folder }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (buffer) {
        // Compress the buffer with sharp
        const compressedBuffer = await sharp(buffer)
          .resize({ width: 1280 }) // Resize if too large (adjust as needed)
          .jpeg({ quality: 70 })   // Reduce quality to 70%
          .toBuffer();

        const uploadStream = cloudinary.v2.uploader.upload_stream({ folder }, (error, result) => {
          if (error) return reject(new Error('Cloudinary buffer upload failed: ' + error.message));
          resolve(result);
        });

        streamifier.createReadStream(compressedBuffer).pipe(uploadStream);
      } else if (base64) {
        // Optionally apply transformation directly in Cloudinary
        cloudinary.v2.uploader
          .upload(base64, {
            folder,
            transformation: [
              { width: 1280, crop: "limit" },
              { quality: "auto" }, // Let Cloudinary choose best quality
            ],
          })
          .then(resolve)
          .catch((err) => reject(new Error('Cloudinary base64 upload failed: ' + err.message)));
      } else {
        reject(new Error('No valid file data provided to Cloudinary'));
      }
    } catch (err) {
      reject(new Error('Error during image processing: ' + err.message));
    }
  });
};
