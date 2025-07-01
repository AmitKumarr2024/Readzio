import nodemailer from 'nodemailer'
import { SMTP_PASS, SMTP_USER } from "./dotenv.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true, // Use STARTTLS
  auth: {
    user: SMTP_USER, 
    pass: SMTP_PASS, 
  },
});


export default transporter;
