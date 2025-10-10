// // config/emailConfig.js
// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// // Create transporter using Gmail SMTP with App Password
// export const createEmailTransporter = () => {
//   return nodemailer.createTransporter({
//     service: "gmail",
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS, // App Password
//     },
//     secure: true,
//     port: 465,
//   });
// };

// // Email configuration constants
// export const EMAIL_CONFIG = {
//   FROM_EMAIL: process.env.SENDER_EMAIL,
//   SMTP_USER: process.env.SMTP_USER,
//   MAX_RETRIES: 3,
//   RETRY_DELAY: 1000, // 1 second
// };

// // Verify email configuration
// export const verifyEmailConfig = async () => {
//   try {
//     const transporter = createEmailTransporter();
//     await transporter.verify();
//     console.log("✅ Email configuration verified successfully");
//     return true;
//   } catch (error) {
//     console.error("❌ Email configuration verification failed:", error);
//     return false;
//   }
// };
