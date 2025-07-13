import EmailLog from '../Models/EmailLog.js';
import UserModel from '../Models/User.js';
import PostModel from '../Models/Post.js';
import Notification from '../Models/Notification.js';
import { AppError } from '../utils/AppError.js';
import transporter from '../config/nodeMailer.js';
import createMailOption from '../helpers/emailHelper.js';
import { recordActivity } from '../helpers/activityHelper.js';

// Send daily post email to all verified users
export const sendDailyPostEmail = async (req, res, next) => {
  try {
    console.log('[sendDailyPostEmail] Starting email processing...');
    const users = await UserModel.find({ isAccountVerified: true, stopEmailAttempts: false }).lean();
    console.log(`[sendDailyPostEmail] Found ${users.length} verified users`);

    if (users.length === 0) {
      console.log('[sendDailyPostEmail] No verified users found, aborting email sending');
      return res.status(200).json({ message: 'No verified users to send emails to', results: [], postCount: 0 });
    }

    // Fetch today's posts (created within the last 24 hours)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    console.log('[sendDailyPostEmail] Fetching today\'s posts...');
    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      status: 'published', // Only include published posts
    })
      .select('title slug thumbnail author')
      .populate('author', 'name')
      .limit(10)
      .lean();

    // If fewer than 10 posts, fetch most popular posts to fill up to 10
    if (posts.length < 10) {
      console.log(`[sendDailyPostEmail] Found ${posts.length} posts, fetching additional popular posts...`);
      const additionalPostsNeeded = 10 - posts.length;
      const popularPosts = await PostModel.find({
        createdAt: { $lt: todayStart },
        status: 'published', // Only include published posts
      })
        .sort({ views: -1 })
        .select('title slug thumbnail author') // Fixed typo: 'tell' → 'title'
        .populate('author', 'name')
        .limit(additionalPostsNeeded)
        .lean();
      posts = [...posts, ...popularPosts];
    }
    console.log(`[sendDailyPostEmail] Total posts to include: ${posts.length}`);

    if (posts.length === 0) {
      console.log('[sendDailyPostEmail] No published posts found, sending fallback email');
      const fallbackMailOption = createMailOption({
        to: users.map(user => user.email),
        subject: 'Your Daily Post Digest (No New Posts)',
        name: 'User',
        email: '',
        message: 'No new posts today. Check out our platform for more content!',
        hasButton: true,
        buttonText: 'Visit Platform',
        buttonUrl: 'https://yourplatform.com/posts',
        posts: [],
      });

      try {
        await transporter.sendMail(fallbackMailOption);
        console.log('[sendDailyPostEmail] Fallback email sent to users');
        return res.status(200).json({ message: 'No posts available, sent fallback email', results: [], postCount: 0 });
      } catch (error) {
        console.error(`[sendDailyPostEmail] Failed to send fallback email: ${error.message}`);
        throw new AppError(`Failed to send fallback email: ${error.message}`, 500, 'SendDailyPostEmail Fallback');
      }
    }

    const postSlugs = posts.map(post => post.slug);
    const results = [];

    for (const user of users) {
      console.log(`[sendDailyPostEmail] Preparing email for user: ${user.email}`);
      const mailOption = createMailOption({
        to: user.email,
        subject: `Your Daily Post Digest (${posts.length} Posts)`,
        name: user.name || 'User',
        email: user.email,
        hasButton: true,
        buttonText: 'Read Posts',
        buttonUrl: 'https://yourplatform.com/posts',
        posts,
      });

      try {
        const emailResult = await sendEmailWithRetries(mailOption, user._id);
        const emailLog = new EmailLog({
          userId: user._id,
          email: user.email,
          type: 'daily_digest',
          emailStatus: 'sent',
          emailAttempts: emailResult.attempts,
          postSlugs,
          sentAt: new Date(),
        });
        await emailLog.save();
        results.push({ email: user.email, success: true, attempts: emailResult.attempts });
        console.log(`[sendDailyPostEmail] Email sent to ${user.email}`);
      } catch (error) {
        const emailLog = new EmailLog({
          userId: user._id,
          email: user.email,
          type: 'daily_digest',
          emailStatus: 'failed',
          emailAttempts: error.attempts || 3,
          emailLastError: error.message,
          postSlugs,
          sentAt: new Date(),
        });
        await emailLog.save();
        results.push({ email: user.email, success: false, error: error.message });
        console.log(`[sendDailyPostEmail] Failed to send email to ${user.email}: ${error.message}`);
      }
    }

    // Notify admin about email send results
    const admin = await UserModel.findOne({ role: 'admin' }).lean();
    if (admin) {
      console.log('[sendDailyPostEmail] Sending admin notification...');
      const adminMailOption = createMailOption({
        to: admin.email,
        subject: 'Daily Post Email Report',
        name: admin.name || 'Admin',
        email: admin.email,
        message: `Daily post email sent to ${results.length} users. Success: ${
          results.filter(r => r.success).length
        }, Failed: ${results.filter(r => !r.success).length}, Posts included: ${posts.length}`,
        hasButton: false,
      });
      try {
        await sendEmailWithRetries(adminMailOption, admin._id);
        console.log('[sendDailyPostEmail] Admin notification sent');
      } catch (error) {
        console.error(`[sendDailyPostEmail] Failed to send admin notification: ${error.message}`);
      }
    }

    console.log('[sendDailyPostEmail] Email processing completed');
    res.status(200).json({ message: 'Daily post emails processed', results, postCount: posts.length });
  } catch (error) {
    console.error(`[sendDailyPostEmail] Error: ${error.message}`);
    next(new AppError(error.message, 500, 'SendDailyPostEmail Controller'));
  }
};

// Fetch daily post email report
export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    console.log('[getDailyPostEmailReport] Fetching email report...');
    const { page = 1, limit = 10, date } = req.query;
    const query = { type: 'daily_digest' };
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.sentAt = { $gte: startDate, $lte: endDate };
    }

    const logs = await EmailLog.find(query)
      .select('userId email type emailStatus emailAttempts emailLastError postSlugs sentAt')
      .populate('userId', 'name')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await EmailLog.countDocuments(query);
    console.log(`[getDailyPostEmailReport] Found ${logs.length} logs, total: ${total}`);

    res.status(200).json({
      logs,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(`[getDailyPostEmailReport] Error: ${error.message}`);
    next(new AppError(error.message, 500, 'GetDailyPostEmailReport Controller'));
  }
};

// Delete all notifications
export const deleteAllNotifications = async (req, res, next) => {
  try {
    console.log('[deleteAllNotifications] Deleting notifications...');
    const result = await Notification.deleteMany({});
    console.log(`[deleteAllNotifications] Deleted ${result.deletedCount} notifications`);
    res.status(200).json({
      message: `Deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(`[deleteAllNotifications] Error: ${error.message}`);
    next(new AppError(error.message, 500, 'DeleteAllNotifications Controller'));
  }
};

// Helper function to send email with retries
const sendEmailWithRetries = async (mailOption, userId, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[sendEmailWithRetries] Attempt ${attempts} to send email to ${mailOption.to}`);
      await transporter.sendMail(mailOption);
      await recordActivity({
        userId,
        action: 'EMAIL_SENT',
        message: `Daily post email sent to ${mailOption.to} after ${attempts} attempt(s)`,
      });
      console.log(`[sendEmailWithRetries] Email sent successfully to ${mailOption.to}`);
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      console.error(`[sendEmailWithRetries] Attempt ${attempts} failed for ${mailOption.to}: ${error.message}`);
      await recordActivity({
        userId,
        action: 'EMAIL_FAILED',
        message: `Daily post email failed for ${mailOption.to} on attempt ${attempts}: ${error.message}`,
      });
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts ** 2));
      }
    }
  }

  await recordActivity({
    userId,
    action: 'EMAIL_FAILED_ALL_ATTEMPTS',
    message: `All ${attempts} daily post email attempts failed for ${mailOption.to}: ${lastError.message}`,
  });
  console.error(`[sendEmailWithRetries] All attempts failed for ${mailOption.to}: ${lastError.message}`);
  throw new AppError(
    `Failed to send daily post email after ${attempts} attempts: ${lastError.message}`,
    500,
    'SendEmailWithRetries'
  );
};