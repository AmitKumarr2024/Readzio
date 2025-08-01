import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 8001;
export const MONGO_URI = process.env.MONGO_URI  ;
export const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
export const RAZORPAYX_KEY_ID = process.env.RAZORPAYX_KEY_ID;
export const RAZORPAYX_KEY_SECRET = process.env.RAZORPAYX_KEY_SECRET;
export const RAZORPAYX_ACCOUNT_NO = process.env.RAZORPAYX_ACCOUNT_NO;
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
export const RAZORPAY_API_URL = process.env.RAZORPAY_API_URL || 'https://api.razorpay.com/v1';
export const RAZORPAY_MODE = process.env.RAZORPAY_MODE || 'test';
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const SENDER_EMAIL = process.env.SENDER_EMAIL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
export const AUTO_EMAIL_DATE = process.env.AUTO_EMAIL_DATE;

// Validate required environment variables
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[dotenv] Missing required env variable: ${key}`);
    process.exit(1);
  }
});