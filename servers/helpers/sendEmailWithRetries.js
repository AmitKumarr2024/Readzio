// servers/helpers/sendEmailWithRetries.js
import transporter from "../../servers/config/nodeMailer.js";
import EmailLog from "../../servers/Models/EmailLog.js";

export async function sendEmailWithRetries(
  mailOptions,
  userId,
  type = "general",
  maxAttempts = 3
) {
  let lastError = null;
  const email = mailOptions.to.toLowerCase().trim();

  // Check if email should be stopped (enhanced check)
  const recentFailures = await EmailLog.countDocuments({
    email: email,
    emailStatus: "failed",
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  if (recentFailures >= 5) {
    console.log(
      `⚠️ [Email] Skipping ${email} due to recent failures (${recentFailures})`
    );
    throw new Error(
      `Email ${email} has too many recent failures (${recentFailures})`
    );
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📨 [Email] Attempt ${attempt}/${maxAttempts} → ${email}`);

      const info = await transporter.sendMail(mailOptions);

      // Log success
      await EmailLog.create({
        userId,
        email: email,
        type,
        emailStatus: "sent",
        emailAttempts: attempt,
        messageId: info.messageId,
        sentAt: new Date(),
      });

      console.log(`✅ [Email] Sent to ${email} (msgId: ${info.messageId})`);
      return info;
    } catch (err) {
      lastError = err;
      console.error(`❌ [Email] Attempt ${attempt} failed:`, err.message);

      // Log failure
      await EmailLog.create({
        userId,
        email: email,
        type,
        emailStatus: "failed",
        emailAttempts: attempt,
        emailLastError: err.message,
        createdAt: new Date(),
      });

      // Check if it's a permanent failure (hard bounce)
      const errorMsg = err.message.toLowerCase();
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

      // Exponential backoff delay
      if (attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw new Error(
    `Failed to send email after ${maxAttempts} attempts to ${email}: ${
      lastError?.message || "Unknown error"
    }`
  );
}
