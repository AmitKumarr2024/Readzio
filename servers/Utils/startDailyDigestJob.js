// Utils/startDailyDigestJob.js
import cron from "node-cron";
import { sendDailyPostEmail } from "../../servers/Controllers/dailyPostEmailController.js";

export function startDailyDigestJob() {
  cron.schedule(
    "0 8,20 * * *",
    async () => {
      try {
        const fakeRes = {
          status: () => fakeRes,
          json: (data) => console.log("[Cron:DailyDigest]", data),
        };
        const fakeReq = {};
        const fakeNext = (err) =>
          console.error("[Cron:DailyDigest] Error:", err);

        await sendDailyPostEmail(fakeReq, fakeRes, fakeNext);
      } catch (err) {
        console.error("[Cron:DailyDigest] Failed:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log(
    "[Cron:DailyDigest] Job scheduled for 8:00 AM and 8:00 PM IST daily."
  );
}
