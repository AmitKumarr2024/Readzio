import nodemailer from "nodemailer";
import { SMTP_USER, SMTP_PASS } from "./dotenv.js";

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("SMTP_USER and SMTP_PASS must be defined");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // Use 587 for TLS
  secure: false, // false for STARTTLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // prevents some certificate issues
  },
});

export default transporter;
