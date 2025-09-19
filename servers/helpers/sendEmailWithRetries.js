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

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `📨 [Email] Attempt ${attempt}/${maxAttempts} → ${mailOptions.to}`
      );

      const info = await transporter.sendMail(mailOptions);

      // ✅ Log success
      await EmailLog.create({
        userId,
        email: mailOptions.to,
        type,
        emailStatus: "sent",
        emailAttempts: attempt,
        messageId: info.messageId,
        sentAt: new Date(),
      });

      console.log(
        `✅ [Email] Sent to ${mailOptions.to} (msgId: ${info.messageId})`
      );
      return info;
    } catch (err) {
      lastError = err;

      console.error(
        `❌ [Email] Attempt ${attempt} failed:`,
        err.message || err
      );

      // ✅ Log failure attempt
      await EmailLog.create({
        userId,
        email: mailOptions.to,
        type,
        emailStatus: "failed",
        emailAttempts: attempt,
        emailLastError: err.message || JSON.stringify(err),
        createdAt: new Date(),
      });

      // Small delay before retry (exponential backoff could be added)
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }

  // ❌ If all attempts fail, throw detailed error
  throw new Error(
    `Failed to send email after ${maxAttempts} attempts to ${mailOptions.to}: ${
      lastError?.message || "Unknown error"
    }`
  );
}
