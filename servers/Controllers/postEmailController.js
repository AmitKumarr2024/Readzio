import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Bounce from "../../servers/Models/BounceModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import transporter from "../../servers/config/nodeMailer.js";
import { SMTP_USER } from "../../servers/config/dotenv.js";

const SENDER_EMAIL = SMTP_USER;
export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();
  console.log("📧 [DailyEmail] Starting daily post email process");

  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      blocked: { $ne: true },
      email: { $exists: true, $ne: null, $ne: "" },
    })
      .select("_id name email")
      .limit(50)
      .lean();

    console.log(`📊 [DailyEmail] Found ${users.length} eligible users`);

    if (users.length === 0) {
      return res.status(200).json({
        message: "No eligible users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const posts = await PostModel.find({
      isPublished: true,
      title: { $exists: true, $ne: "" },
    })
      .select(
        "title slug thumbnail author readTime likesCount commentsCount createdAt"
      )
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`[DailyEmail] Found ${posts.length} posts`);

    if (posts.length === 0) {
      return res.status(200).json({
        message: "No posts available to send",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const results = [];

    for (const user of users) {
      try {
        console.log(`[DailyEmail] Sending email to ${user.email}...`);

        const subject = `${posts[0].title.substring(
          0,
          50
        )}... | inkshaa Daily Digest`;

        const mailOption = await createMailOption({
          to: user.email,
          subject: subject,
          name: user.name || "Reader",
          email: user.email,
          hasButton: true,
          buttonText: "Read Today's Posts",
          buttonUrl: "https://inkshaa.onrender.com/explore",
          posts,
        });

        const emailResult = await sendEmailWithRetries(
          mailOption,
          user._id,
          "daily_digest",
          2
        );

        console.log(
          `✅ [DailyEmail] Email sent to ${user.email}: ${emailResult.messageId}`
        );

        results.push({
          email: user.email,
          success: true,
          userId: user._id,
          messageId: emailResult.messageId,
        });
      } catch (error) {
        console.error(
          `❌ [DailyEmail] Failed for ${user.email}:`,
          error.message
        );

        results.push({
          email: user.email,
          success: false,
          error: error.message,
          userId: user._id,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(
      `📊 [DailyEmail] Final results: ${successCount} success, ${failedCount} failed`
    );

    res.status(200).json({
      message: "Daily post emails processed successfully",
      results: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        successRate:
          results.length > 0
            ? ((successCount / results.length) * 100).toFixed(2) + "%"
            : "0%",
      },
      postCount: posts.length,
      processTime: Date.now() - startTime,
      details: results,
    });
  } catch (error) {
    console.error("💥 [DailyEmail] Critical error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to process daily post emails",
            500,
            "SendDailyPostEmail"
          )
    );
  }
};

export const testSingleEmail = async (req, res, next) => {
  try {
    const { email, type = "test" } = req.body;
    console.log(`[TestEmail] Testing email: ${email}`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const mailOption = await createMailOption({
      from: SENDER_EMAIL,
      to: email,
      subject: "🧪 Test Email from inkshaa",
      name: "Test User",
      email: email,
      message: "This is a test email to verify the system is working.",
      hasButton: true,
      buttonText: "Visit inkshaa",
      buttonUrl: "https://inkshaa.onrender.com",
    });

    console.log(`[TestEmail] Sending test email to ${email}...`);
    const result = await sendEmailWithRetries(
      mailOption,
      "test_user_id",
      type,
      1
    );

    console.log(`✅ [TestEmail] Test email sent: ${result.messageId}`);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      email: email,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [TestEmail] Failed:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send test email",
      email: req.body.email,
    });
  }
};

export const sendDirectEmail = async (req, res, next) => {
  let email = req.body?.email; // define outside try
  try {
    console.log(`[DirectEmail] Sending email to ${email}...`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Verify transporter
    try {
      await transporter.verify();
      console.log(`[DirectEmail] SMTP transporter verified successfully`);
    } catch (verifyErr) {
      console.error(
        `[DirectEmail] SMTP verification failed:`,
        verifyErr.message
      );
      return res.status(500).json({
        success: false,
        message: "SMTP transporter verification failed",
        error: verifyErr.message,
      });
    }

    const mailOption = {
      from: SENDER_EMAIL, // must be defined at top of file
      to: email,
      subject: "Message from inkshaa",
      text: "hello world",
    };

    console.log(`[DirectEmail] Sending email with options:`, mailOption);

    const emailResult = await transporter.sendMail(mailOption);

    console.log(
      `✅ [DirectEmail] Email sent to ${email}:`,
      emailResult.messageId
    );

    return res.status(200).json({
      success: true,
      message: "Direct email sent successfully",
      email,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [DirectEmail] Failed for ${email}:`, error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send direct email",
      email,
    });
  }
};

export const clearEmailFailures = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log(`[ClearEmailFailures] Clearing failures for ${email}...`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await Bounce.updateOne(
      { email },
      { $set: { bounceCount: 0, status: "resolved", updatedAt: new Date() } },
      { upsert: true }
    );

    console.log(`✅ [ClearEmailFailures] Failures cleared for ${email}`);

    res.status(200).json({
      success: true,
      message: `Failures cleared for ${email}`,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });
  } catch (error) {
    console.error(
      `❌ [ClearEmailFailures] Failed for ${email}:`,
      error.message
    );
    res.status(500).json({
      success: false,
      message: error.message || "Failed to clear email failures",
      email: req.body.email,
    });
  }
};

export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type = "daily_digest" } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const logs = await EmailLog.find({ type })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await EmailLog.countDocuments({ type });

    res.status(200).json({
      logs,
      pagination: {
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("❌ [EmailReport] Failed:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            "Failed to fetch email report",
            500,
            "GetDailyPostEmailReport"
          )
    );
  }
};
