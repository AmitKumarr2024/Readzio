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
    pass:"askpzmqpgsvjfvsv",
  },
  logger: true,
  debug: true,
});
export default transporter;
