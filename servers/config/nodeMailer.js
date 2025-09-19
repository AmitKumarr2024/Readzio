// servers/config/nodeMailer.js
import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "../config/dotenv.js";



if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS, // Gmail App Password
  },
});

// ✅ Export transporter as default
export default transporter;
