// // Utils/startDailyDigestJob.js
// import cron from "node-cron";
// import { sendDailyPostEmail } from "../../servers/Controllers/postEmailController.js";

// export function startDailyDigestJob() {
//   // ✅ Production cron - Runs every day at 8:00 AM IST
//   cron.schedule(
//     "0 8 * * *",
//     async () => {
//       try {
//         await sendDailyPostEmail(
//           {},
//           {
//             status: () => ({
//               json: () => {
//                 // No success logs
//               },
//             }),
//           },
//           (err) => {
//             if (err) {
//               console.error("[Cron:DailyDigest] Next Error:", err.message);
//             }
//           }
//         );
//       } catch (err) {
//         console.error("[Cron:DailyDigest] Failed:", err.message);
//       }
//     },
//     { timezone: "Asia/Kolkata" }
//   );

//   // ❌ Remove dev/test cron completely to avoid noise
//   // cron.schedule("* * * * *", () => {
//   //   const now = new Date().toLocaleString("en-IN", {
//   //     timeZone: "Asia/Kolkata",
//   //   });
//   //   console.log(`[Cron:Test] Running every minute at: ${now}`);
//   // });

//   // ❌ Remove startup log
//   // console.log("[Cron:Startup] Daily digest job scheduled.");
// }
