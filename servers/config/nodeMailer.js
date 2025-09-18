import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER, NODE_ENV } from "../../servers/config/dotenv.js";

// Validate env variables
if (!SMTP_USER || !SMTP_PASS) {
  console.error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
  throw new Error("SMTP credentials missing");
}

// Create transporter with Gmail
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS, // Must be a Gmail App Password
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 180_000, // 3 minutes
  socketTimeout: 180_000,
  greetingTimeout: 90_000,
  rateDelta: 60_000, // 1 minute
  rateLimit: 10,
  debug: NODE_ENV === "development",
  logger: NODE_ENV === "development",
});

// Verify transporter connection
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
    console.warn("⚠️ Email service unavailable");
    return false;
  }
};

verifyConnection();

export default transporter;
