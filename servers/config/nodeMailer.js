import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "./dotenv";

// Validate environment variables
if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: SMTP_USER, // e.g., inksha.official@gmail.com
    pass: SMTP_PASS, // App Password
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ [SMTP] Transporter verification failed:", error.message);
  } else {
    console.log("✅ [SMTP] Transporter is ready");
  }
});

export default transporter;
