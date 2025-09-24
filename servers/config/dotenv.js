import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible .env locations
const possibleEnvPaths = [
  path.resolve(process.cwd(), ".env"), // Current working directory
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📄 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error(
    "❌ No .env file found in any of these locations:",
    possibleEnvPaths
  );
}

export const PORT = process.env.PORT || 10000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
export const CLIENT_URL =
  process.env.CLIENT_URL || "https://inkshaa.onrender.com";
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
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const SENDER_EMAIL = process.env.SENDER_EMAIL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
export const AUTO_EMAIL_DATE = process.env.AUTO_EMAIL_DATE;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
export const SESSION_SECRET = process.env.SESSION_SECRET;
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const USE_DUMMY_EMAIL = process.env.USE_DUMMY_EMAIL;

// Debug log to check if RESEND_API_KEY is loaded
console.log("RESEND_API_KEY loaded:", RESEND_API_KEY ? "✅ Yes" : "❌ No");

// Validate required environment variables (comment out for debugging)
const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLIENT_URL",
  "SMTP_USER",
  "SMTP_PASS",
  "SENDER_EMAIL",
];

// Debug: Log all environment variables
console.log("Environment variables check:");
requiredEnv.forEach((key) => {
  const value = process.env[key];
  console.log(`  ${key}: ${value ? "✅ Set" : "❌ Missing"}`);
  if (!value) {
    console.error(`[dotenv] Missing required env variable: ${key}`);
    // Comment out the next line to continue without exiting
    // process.exit(1);
  }
});
