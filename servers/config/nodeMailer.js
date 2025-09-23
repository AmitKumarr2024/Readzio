import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "../config/dotenv.js";

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS for 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS, // Use environment variable
  },
  connectionTimeout: 15000, // 15 seconds
  greetingTimeout: 15000,
  socketTimeout: 15000,
  logger: true, // Enable debug logs
  debug: true,
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error(`[${new Date().toISOString()}] [SMTP] Verification failed:`, {
      error: error.message,
      stack: error.stack,
    });
  } else {
    console.log(
      `[${new Date().toISOString()}] [SMTP] Transporter verified successfully`
    );
  }
});

export default transporter;
