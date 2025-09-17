import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "./dotenv.js";

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("SMTP_USER and SMTP_PASS must be defined");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export default transporter;
