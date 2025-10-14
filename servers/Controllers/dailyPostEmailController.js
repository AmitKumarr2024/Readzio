// Controllers/dailyPostEmailController.js
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import { sendEmail } from "../../servers/services/emailService.js";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { DAILY_POST_EMAIL_TEMPLATE } from "../../servers/config/dailyPostEmailTemplate.js";

// 1️⃣ Send Daily Digest Emails
export const sendDailyPostEmail = async (req, res, next) => {
  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
    });

    if (!users.length) {
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
      .populate("author", "name");

    if (!posts.length) {
      return res
        .status(200)
        .json({ success: true, message: "No posts to send." });
    }

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

        user.emailAttempts = (user.emailAttempts || 0) + 1;
        if (result.success) {
          user.emailStatus = "sent";
          user.emailLastError = null;
        } else {
          user.emailStatus = "failed";
          user.emailLastError = result.error || "Unknown error";
        }
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

// 2️⃣ Get All Email Statuses (with pagination + optional status filter)
export const getAllEmailStatuses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) query.emailStatus = status;

    const total = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
      .select("email name emailStatus emailAttempts emailLastError")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    return res.json({
      statuses: users,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[getAllEmailStatuses] Error:", err.message);
    next(err);
  }
};

// 3️⃣ Check Single Email Status
export const checkEmailStatus = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await UserModel.findOne({ email }).select(
      "email emailStatus emailAttempts emailLastError"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("[checkEmailStatus] Error:", err.message);
    next(err);
  }
};

// 4️⃣ Retry Failed Emails
export const retryFailedEmails = async (req, res, next) => {
  try {
    const { emails } = req.body;
    if (!emails?.length)
      return res.status(400).json({ message: "Emails required" });

    const results = [];
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    const posts = await PostModel.find({ isPublished: true, blocked: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name");

    for (const email of emails) {
      const user = await UserModel.findOne({ email });
      if (!user) continue;

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

        user.emailAttempts = (user.emailAttempts || 0) + 1;
        if (result.success) {
          user.emailStatus = "sent";
          user.emailLastError = null;
        } else {
          user.emailStatus = "failed";
          user.emailLastError = result.error || "Unknown error";
        }
        await user.save();
        results.push({ email: user.email, success: result.success });
      } catch (err) {
        console.error(`[retryFailedEmails] Failed for ${email}:`, err.message);
        results.push({ email, success: false, error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error("[retryFailedEmails] Error:", err.message);
    next(err);
  }
};

// 5️⃣ Send Direct Email (manual)
export const sendDirectEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);
    const posts = await PostModel.find({ isPublished: true, blocked: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name");

    const html = template({
      subject: "Your Readzio Digest",
      name: user.name,
      posts,
      hasButton: true,
      buttonText: "Visit Readzio",
      buttonUrl: "https://readzio.com",
      supportEmail: "support@readzio.com",
    });

    const result = await sendEmail({
      to: user.email,
      subject: "Your Readzio Digest",
      html,
      text: `Hi ${user.name}, check out the latest posts on Readzio.`,
    });

    user.emailAttempts = (user.emailAttempts || 0) + 1;
    if (result.success) {
      user.emailStatus = "sent";
      user.emailLastError = null;
    } else {
      user.emailStatus = "failed";
      user.emailLastError = result.error || "Unknown error";
    }
    await user.save();

    res.json({ messageId: result.messageId || null, success: result.success });
  } catch (err) {
    console.error("[sendDirectEmail] Error:", err.message);
    next(err);
  }
};
