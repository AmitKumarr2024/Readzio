// Utils/startDailyDigestJob.js
import cron from "node-cron";
import { sendDailyPostEmail } from "../../servers/Controllers/postEmailController.js";

export function startDailyDigestJob() {
  // ✅ Production cron - Runs every day at 8:00 AM IST
  cron.schedule(
    "0 10 * * *",
    async () => {
      try {
        const now = new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
        console.log(`[Cron:DailyDigest] Triggered at: ${now}`);

        await sendDailyPostEmail(
          {},
          {
            status: () => ({
              json: (data) =>
                console.log("[Cron:DailyDigest] Email result:", data),
            }),
          },
          (err) => {
            if (err) console.error("[Cron:DailyDigest] Next Error:", err.message);
          }
        );

        console.log("[Cron:DailyDigest] Finished.");
      } catch (err) {
        console.error("[Cron:DailyDigest] Failed:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // ✅ Optional dev/test cron - Runs every 1 minute to test
  cron.schedule("* * * * *", () => {
    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    console.log(`[Cron:Test] Running every minute at: ${now}`);
  });

  console.log("[Cron:Startup] Daily digest job scheduled.");
}
