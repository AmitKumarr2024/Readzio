import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "../config/dotenv.js";

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export default transporter;
