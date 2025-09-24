// servers/helpers/sendEmailWithRetries.js
import EmailLog from "../../servers/Models/EmailLog.js";
import { sendEmail } from "../../servers/config/sendEmail.js"; // Resend-based sender
import { AppError } from "../Utils/AppError.js";

export async function sendEmailWithRetries(
  mailOptions,
  userId,
  type = "general",
  maxAttempts = 3
) {
  if (!mailOptions?.to) throw new AppError("Recipient email is required", 400);
  const email = mailOptions.to.toLowerCase().trim();

  let lastError = null;

  // Stop sending if too many recent failures
  const recentFailures = await EmailLog.countDocuments({
    email,
    emailStatus: "failed",
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  if (recentFailures >= 5) {
    console.log(
      `⚠️ [Email] Skipping ${email} due to recent failures (${recentFailures})`
    );
    throw new AppError(
      `Email ${email} has too many recent failures (${recentFailures})`,
      429
    );
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📨 [Email] Attempt ${attempt}/${maxAttempts} → ${email}`);

      // Use Resend-based sendEmail function
      const info = await sendEmail(mailOptions);

      // Log success
      await EmailLog.create({
        userId,
        email,
        type,
        emailStatus: "sent",
        emailAttempts: attempt,
        messageId: info.id || null,
        sentAt: new Date(),
      });

      console.log(`✅ [Email] Sent to ${email} (msgId: ${info.id})`);
      return { success: true, attempts: attempt, id: info.id };
    } catch (err) {
      lastError = err;
      console.error(`❌ [Email] Attempt ${attempt} failed:`, err.message);

      // Log failure
      await EmailLog.create({
        userId,
        email,
        type,
        emailStatus: "failed",
        emailAttempts: attempt,
        emailLastError: err.message,
        createdAt: new Date(),
      });

      // Hard bounce detection
      const errorMsg = (err.message || "").toLowerCase();
      if (
        errorMsg.includes("user unknown") ||
        errorMsg.includes("domain not found") ||
        errorMsg.includes("invalid address") ||
        errorMsg.includes("mailbox unavailable")
      ) {
        console.log(
          `🚫 [Email] Hard bounce detected for ${email}, stopping retries`
        );
        break;
      }

      // Exponential backoff
      if (attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw new AppError(
    `Failed to send email after ${maxAttempts} attempts to ${email}: ${
      lastError?.message || "Unknown error"
    }`,
    500
  );
}
