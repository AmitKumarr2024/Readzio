// utils/uploadToCloudinary.js
import cloudinary from 'cloudinary';
import streamifier from 'streamifier';

export const uploadToCloudinary = ({ buffer, base64, folder }) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    if (buffer) {
      streamifier.createReadStream(buffer).pipe(uploadStream);
    } else if (base64) {
      cloudinary.v2.uploader.upload(base64, { folder })
        .then(resolve)
        .catch(reject);
    } else {
      reject(new Error('No valid file data provided'));
    }
  });
};
