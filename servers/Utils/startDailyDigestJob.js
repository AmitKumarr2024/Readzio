// cron/dailyDigest.js
import cron from "node-cron";
import { sendDailyPostEmail } from "../../servers/Controllers/postEmailController.js";

// Wrap the cron logic in a function
export function startDailyDigestJob() {
  cron.schedule(
    "0 8 * * *", // Every day at 8:00 AM IST
    async () => {
      try {
        console.log("[Cron:DailyDigest] Starting...");
        await sendDailyPostEmail(
          {},
          { status: () => ({ json: () => {} }) }, // dummy res
          (err) => {
            if (err) console.error("[Cron:DailyDigest] Error:", err.message);
          }
        );
        console.log("[Cron:DailyDigest] Finished.");
      } catch (err) {
        console.error("[Cron:DailyDigest] Failed:", err.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[Cron:Startup] Daily digest job scheduled.");
}
