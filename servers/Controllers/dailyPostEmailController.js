// Controllers/dailyPostEmailController.js
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import { sendEmail } from "../../servers/services/emailService.js";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { DAILY_POST_EMAIL_TEMPLATE } from "../../servers/config/dailyPostEmailTemplate.js";

export const sendDailyPostEmail = async (req, res, next) => {
  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
    });

    if (!users.length) {
      console.log("No users eligible for daily digest.");
      return res
        .status(200)
        .json({ success: true, message: "No users to send." });
    }

    const since = dayjs().subtract(1, "day").toDate();
    const posts = await PostModel.find({
      isPublished: true,
      createdAt: { $gte: since },
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name"); // populate author name for template

    if (!posts.length) {
      console.log("No new posts in the last 24 hours.");
      return res
        .status(200)
        .json({ success: true, message: "No posts to send." });
    }

    // Compile Handlebars template
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    for (const user of users) {
      try {
        const html = template({
          subject: "Your Daily Readzio Digest",
          name: user.name,
          posts,
          hasButton: true,
          buttonText: "Visit Readzio",
          buttonUrl: "https://readzio.com",
          supportEmail: "support@readzio.com",
        });

        const result = await sendEmail({
          to: user.email,
          subject: "Your Daily Readzio Digest",
          html,
          text: `Hi ${user.name}, check out the latest posts on Readzio.`,
        });

        if (result.success) {
          user.emailStatus = "sent";
          user.emailLastError = null;
        } else {
          user.emailStatus = "failed";
          user.emailLastError = result.error || "Unknown error";
        }
        user.emailAttempts = (user.emailAttempts || 0) + 1;
        await user.save();
      } catch (err) {
        console.error(
          `[DailyDigest] Failed for user ${user.email}:`,
          err.message
        );
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Daily digest emails sent." });
  } catch (err) {
    console.error("[DailyDigest] Controller error:", err.message);
    next(err);
  }
};
