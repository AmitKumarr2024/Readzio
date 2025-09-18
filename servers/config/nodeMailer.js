import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER, NODE_ENV } from "../../servers/config/dotenv.js";

// ✅ Validate env variables
if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

// ✅ Create transporter (corrected function)
const transporter = nodemailer.createTransport({
  service: "gmail", // Gmail with app password
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  pool: true, // Connection pooling for performance
  maxConnections: 5,
  maxMessages: 100,
  secure: true, // Force TLS
  requireTLS: true,
  tls: {
    rejectUnauthorized: NODE_ENV === "production",
  },
  // Timeouts (ms)
  connectionTimeout: 60_000,
  socketTimeout: 60_000,
  greetingTimeout: 30_000,
  // Rate limiting
  rateDelta: 20_000, // per 20 seconds
  rateLimit: 5, // max 5 emails
  // Debug logs only in dev
  debug: NODE_ENV === "development",
  logger: NODE_ENV === "development",
});

// ✅ Verify transporter connection on startup
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP Server is ready to take messages");
    return true;
  } catch (error) {
    console.error("❌ SMTP Connection Error:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    // Don't crash the app in production
    if (NODE_ENV === "production") {
      console.error(
        "⚠️ Email service unavailable - continuing without email functionality"
      );
      return false;
    }
    throw error;
  }
};

verifyConnection();

export default transporter;
