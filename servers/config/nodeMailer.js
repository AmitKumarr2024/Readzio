import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER, NODE_ENV } from "../../servers/config/dotenv.js";

// Validate env variables
if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

// Create transporter with Gmail as primary
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS, // Ensure this is a Gmail App Password
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 120_000, // Increased to 2 minutes
  socketTimeout: 120_000,
  greetingTimeout: 60_000,
  rateDelta: 30_000, // Increased to 30 seconds
  rateLimit: 10, // Allow more emails per window
  debug: NODE_ENV === "development",
  logger: NODE_ENV === "development",
});

// Verify transporter connection on startup
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
    console.error(
      "⚠️ Email service unavailable - continuing without email functionality"
    );
    return false;
  }
};

verifyConnection();

export default transporter;
