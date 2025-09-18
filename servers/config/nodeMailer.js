// testEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // load .env

const { SMTP_USER, SMTP_PASS, SENDER_EMAIL } = process.env;

if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// ✅ Verify connection first
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    console.log("✅ SMTP Server is ready to take messages");
  }
});

// ✅ Send a test mail
async function sendTestMail() {
  try {
    let info = await transporter.sendMail({
      from: `"Inkshaa Test" <${SENDER_EMAIL || SMTP_USER}>`,
      to: "crazyone.amit@gmail.com", // 👈 change to your test email
      subject: "Test Email from Inkshaa",
      text: "This is a test email using Gmail App Password + Nodemailer",
      html: "<p>This is a <b>test email</b> using Gmail App Password + Nodemailer</p>",
    });

    console.log("✅ Message sent:", info.messageId);
  } catch (err) {
    console.error("❌ Send failed:", err);
  }
}

sendTestMail();
