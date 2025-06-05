import cloudinary from 'cloudinary';
import streamifier from 'streamifier';
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from '../config/dotenv.js';

cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = ({ buffer, base64, folder }) => {
  return new Promise((resolve, reject) => {
    if (buffer) {
      const uploadStream = cloudinary.v2.uploader.upload_stream({ folder }, (error, result) => {
        if (error) return reject(new Error('Cloudinary buffer upload failed: ' + error.message));
        resolve(result);
      });

      streamifier.createReadStream(buffer).pipe(uploadStream);

    } else if (base64) {
      cloudinary.v2.uploader
        .upload(base64, { folder })
        .then(resolve)
        .catch((err) => reject(new Error('Cloudinary base64 upload failed: ' + err.message)));
    } else {
      reject(new Error('No valid file data provided to Cloudinary'));
    }
  });
};
