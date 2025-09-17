import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "./dotenv.js";

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("SMTP_USER and SMTP_PASS must be defined");
}

const transporter = nodemailer.createTransport({
  service: "gmail", // tells nodemailer to use Gmail settings internally
  auth: {
    user: SMTP_USER, // your full Gmail address
    pass: SMTP_PASS, // your Gmail App Password (NOT your real password)
  },
});

export default transporter;
