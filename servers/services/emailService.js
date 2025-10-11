// services/emailService.js
import fetch from "node-fetch"; // or global fetch if Node 18+
import { SENDER_EMAIL, RESEND_API_KEY } from "../config/dotenv.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to,
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Error sending email:", data);
      return { success: false, error: data };
    }

    console.log("📨 Email sent successfully:", data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};
