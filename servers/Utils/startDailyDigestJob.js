// Utils/startDailyDigestJob.js
import cron from "node-cron";
import { sendDailyPostEmail } from "../../servers/Controllers/dailyPostEmailController.js"; // FIXED path

export function startDailyDigestJob() {
  // ✅ Production cron - Runs every day at 8:00 AM IST
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        // You can call the controller directly without mocking res
        await sendDailyPostEmail({}, { status: () => ({ json: () => {} }) }, (err) => {
          if (err) {
            console.error("[Cron:DailyDigest] Next Error:", err.message);
          }
        });
      } catch (err) {
        console.error("[Cron:DailyDigest] Failed:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // ✅ Optional: startup log
  console.log("[Cron:DailyDigest] Job scheduled for 8:00 AM IST daily.");
}
