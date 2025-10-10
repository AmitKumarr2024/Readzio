import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for local .env (for dev)
const envPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(envPath)) {
  console.log(`📄 Loading local .env from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(
    "🌐 No local .env found, relying on host-provided environment variables"
  );
}

// --- Export all env vars (with fallbacks where needed) ---
export const PORT = process.env.PORT || 10000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
export const CLIENT_URL =
  process.env.CLIENT_URL || "https://readzio.com";
export const NODE_ENV = process.env.NODE_ENV || "development";

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
export const RAZORPAY_API_URL =
  process.env.RAZORPAY_API_URL || "https://api.razorpay.com/v1";
export const RAZORPAY_MODE = process.env.RAZORPAY_MODE || "test";

export const SENDER_EMAIL = process.env.SENDER_EMAIL;
export const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

export const AUTO_EMAIL_DATE = process.env.AUTO_EMAIL_DATE;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
export const SESSION_SECRET = process.env.SESSION_SECRET;
export const USE_DUMMY_EMAIL = process.env.USE_DUMMY_EMAIL;

// --- Debug logs ---
console.log("Environment variables status:");
const envVars = {
  // RESEND_API_KEY: RESEND_API_KEY ? "✅ Loaded" : "❌ Missing",
  SENDER_EMAIL: SENDER_EMAIL ? "✅ Loaded" : "❌ Missing",
  MONGO_URI: MONGO_URI ? "✅ Loaded" : "❌ Missing",
  JWT_SECRET: JWT_SECRET ? "✅ Loaded" : "❌ Missing",
  CLIENT_URL: CLIENT_URL ? "✅ Loaded" : "❌ Missing",
};

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// Required env vars (removed SMTP_USER and SMTP_PASS)
const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLIENT_URL",
  "RESEND_API_KEY",
  "SENDER_EMAIL",
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[dotenv] Missing required env variable: ${key}`);
  }
});
