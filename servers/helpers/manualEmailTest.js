// servers/helpers/manualEmailTest.js
import dotenv from "dotenv";
import transporter from "../config/nodeMailer.js";
import { SMTP_USER } from "../config/dotenv.js";



export async function sendManualTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"Inkshaa Test" <${SMTP_USER}>`,
      to: "codes.amitkumar@gmail.com", // change to your email
      subject: "🚀 Manual Test Email from Inkshaa",
      text: "Hello! This is a manual test email sent via Nodemailer.",
      html: "<p><b>Hello!</b> This is a <i>manual test email</i> sent via Nodemailer 🚀</p>",
    });

    console.log("✅ Manual test email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Manual test email failed:", err);
  }
}

sendManualTestEmail();
