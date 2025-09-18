import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER, NODE_ENV } from "../../servers/config/dotenv.js";

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

const transporter = nodemailer.createTransporter({
  service: "gmail", // Use service instead of host/port for better reliability
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // Production-ready options
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  secure: true,
  requireTLS: true,
  tls: {
    rejectUnauthorized: NODE_ENV === "production",
  },
  // Timeout settings
  connectionTimeout: 60000,
  socketTimeout: 60000,
  greetingTimeout: 30000,
  // Rate limiting
  rateDelta: 20000, // 20 seconds
  rateLimit: 5, // Max 5 emails per 20 seconds
  // Debug only in development
  debug: NODE_ENV === "development",
  logger: NODE_ENV === "development",
});

// ✅ Enhanced verification with error handling
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

// Verify connection on startup
verifyConnection();

export default transporter;
