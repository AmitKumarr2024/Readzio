// import EmailLog from "../../servers/Models/EmailLog.js";
// import { sendEmail } from "../../servers/config/sendEmail.js";
// import { AppError } from "../Utils/AppError.js";

// export async function sendEmailWithRetries(
//   mailOptions,
//   userId,
//   type = "general",
//   maxAttempts = 3
// ) {
//   if (!mailOptions?.to) throw new AppError("Recipient email is required", 400);
//   const email = mailOptions.to.toLowerCase().trim();

//   let lastError = null;

//   const recentFailures = await EmailLog.countDocuments({
//     email,
//     emailStatus: "failed",
//     createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
//   });

//   if (recentFailures >= 5) {
//     console.log(
//       `⚠️ [Email] Skipping ${email} due to recent failures (${recentFailures})`
//     );
//     throw new AppError(
//       `Email ${email} has too many recent failures (${recentFailures})`,
//       429
//     );
//   }

//   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//     try {
//       console.log(`📨 [Email] Attempt ${attempt}/${maxAttempts} → ${email}`);

//       const info = await sendEmail(mailOptions);
//       console.log("Resend response:", info);

//       await EmailLog.create({
//         userId,
//         email,
//         type,
//         emailStatus: "sent",
//         emailAttempts: attempt,
//         messageId: info.id || null,
//         sentAt: new Date(),
//         subject: mailOptions.subject || "N/A",
//         from: mailOptions.from || "N/A",
//         to: email,
//       });

//       console.log(`✅ [Email] Sent to ${email} (msgId: ${info.id})`);
//       return { success: true, attempts: attempt, id: info.id };
//     } catch (err) {
//       lastError = err;
//       console.error(`❌ [Email] Attempt ${attempt} failed:`, err.message);

//       await EmailLog.create({
//         userId,
//         email,
//         type,
//         emailStatus: "failed",
//         emailAttempts: attempt,
//         emailLastError: err.message,
//         createdAt: new Date(),
//         subject: mailOptions.subject || "N/A",
//         from: mailOptions.from || "N/A",
//         to: email,
//       });

//       const errorMsg = (err.message || "").toLowerCase();
//       if (
//         errorMsg.includes("user unknown") ||
//         errorMsg.includes("domain not found") ||
//         errorMsg.includes("invalid address") ||
//         errorMsg.includes("mailbox unavailable") ||
//         errorMsg.includes("domain is not verified")
//       ) {
//         console.log(
//           `🚫 [Email] Hard failure detected for ${email}, stopping retries`
//         );
//         break;
//       }

//       if (attempt < maxAttempts) {
//         const delay = 1000 * Math.pow(2, attempt - 1);
//         await new Promise((res) => setTimeout(res, delay));
//       }
//     }
//   }

//   throw new AppError(
//     `Failed to send email after ${maxAttempts} attempts to ${email}: ${
//       lastError?.message || "Unknown error"
//     }`,
//     500
//   );
// }


export async function sendEmailWithRetries(
  mailOptions,
  userId,
  type = "general",
  maxAttempts = 3
) {
  try {
    console.log("📭 Email sending temporarily disabled. Skipping actual send.");
    console.log(`→ Pretending to send to: ${mailOptions?.to || "unknown"}`);
    
    // Simulate a small async delay (optional)
    await new Promise((res) => setTimeout(res, 100));
    
    // Return a fake success so no controller crashes
    return { success: true, attempts: 1, id: "dummy-message-id" };
  } catch (err) {
    console.error("Error in dummy sendEmailWithRetries:", err.message);
    // Still return a safe fallback
    return { success: false, attempts: 0, id: null };
  }
}