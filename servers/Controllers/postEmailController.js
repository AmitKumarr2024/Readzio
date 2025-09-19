import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";

// Sends daily post email to verified users with published posts
export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    console.log("📧 [DailyEmail] Starting daily post email process");

    // Enhanced user query - removed lastActiveAt filter since it doesn't exist in User model
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      email: { $exists: true, $ne: null, $ne: '' },
      blocked: { $ne: true }, // Don't send to blocked users
      // Remove lastActiveAt filter since it doesn't exist in the User model
    })
    .select('_id name email createdAt') // Select only needed fields
    .lean({ virtuals: true });

    console.log(`📊 [DailyEmail] Found ${users.length} eligible users`);

    if (users.length === 0) {
      return res.status(200).json({
        message: "No eligible users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Enhanced post fetching with better error handling
    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      isPublished: true,
      // Additional quality filters
      title: { $exists: true, $ne: '' },
      content: { $exists: true }
    })
    .select("title slug thumbnail author readTime likesCount commentsCount createdAt")
    .populate("author", "name avatar")
    .sort({ likesCount: -1, commentsCount: -1 }) // Prioritize popular posts
    .limit(15) // Get more to have fallback options
    .lean({ virtuals: true });

    console.log(`📰 [DailyEmail] Found ${posts.length} posts from today`);

    // Enhanced multi-tier fallback strategy for old posts
    if (posts.length < 10) {
      const needed = 10 - posts.length;
      console.log(`🔄 [DailyEmail] Need ${needed} more posts, searching for older posts...`);
      
      // Tier 1: Last 7 days with engagement
      let fallbackPosts = [];
      if (fallbackPosts.length < needed) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const recentPosts = await PostModel.aggregate([
          { 
            $match: { 
              createdAt: { $gte: sevenDaysAgo, $lt: todayStart }, 
              isPublished: true,
              likesCount: { $gte: 1 }, // Posts with engagement
              title: { $exists: true, $ne: '' }
            } 
          },
          { $sample: { size: needed } },
          {
            $project: {
              title: 1,
              slug: 1,
              thumbnail: 1,
              author: 1,
              readTime: 1,
              likesCount: 1,
              commentsCount: 1,
              createdAt: 1
            }
          }
        ]);

        fallbackPosts = [...fallbackPosts, ...recentPosts];
        console.log(`📰 [DailyEmail] Found ${recentPosts.length} posts from last 7 days`);
      }

      // Tier 2: Last 30 days (any published post)
      if (fallbackPosts.length < needed) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const stillNeeded = needed - fallbackPosts.length;
        
        const olderPosts = await PostModel.aggregate([
          { 
            $match: { 
              createdAt: { $gte: thirtyDaysAgo, $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, 
              isPublished: true,
              title: { $exists: true, $ne: '' }
            } 
          },
          { $sample: { size: stillNeeded } },
          {
            $project: {
              title: 1,
              slug: 1,
              thumbnail: 1,
              author: 1,
              readTime: 1,
              likesCount: 1,
              commentsCount: 1,
              createdAt: 1
            }
          }
        ]);

        fallbackPosts = [...fallbackPosts, ...olderPosts];
        console.log(`📰 [DailyEmail] Found ${olderPosts.length} posts from last 30 days`);
      }

      // Tier 3: Any time (best posts ever)
      if (fallbackPosts.length < needed) {
        const stillNeeded = needed - fallbackPosts.length;
        
        const bestPosts = await PostModel.aggregate([
          { 
            $match: { 
              createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              isPublished: true,
              title: { $exists: true, $ne: '' }
            } 
          },
          { $sort: { likesCount: -1, commentsCount: -1 } }, // Best posts first
          { $limit: stillNeeded * 3 }, // Get more to sample from
          { $sample: { size: stillNeeded } },
          {
            $project: {
              title: 1,
              slug: 1,
              thumbnail: 1,
              author: 1,
              readTime: 1,
              likesCount: 1,
              commentsCount: 1,
              createdAt: 1
            }
          }
        ]);

        fallbackPosts = [...fallbackPosts, ...bestPosts];
        console.log(`📰 [DailyEmail] Found ${bestPosts.length} best posts from all time`);
      }

      // Populate author info for all fallback posts
      if (fallbackPosts.length > 0) {
        const populatedFallback = await PostModel.populate(fallbackPosts, {
          path: "author",
          select: "name avatar",
        });

        posts = [...posts, ...populatedFallback];
        console.log(`✅ [DailyEmail] Added ${populatedFallback.length} fallback posts (total: ${posts.length})`);
      }
    }

    // Final check for posts
    if (posts.length === 0) {
      console.warn("⚠️ [DailyEmail] No posts available. Skipping email send.");
      return res.status(200).json({
        message: "No posts available to send. Skipped daily email.",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime
      });
    }

    // Sort posts by engagement for better email content
    posts = posts
      .sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
      .slice(0, 10); // Limit to top 10 posts

    const postSlugs = posts.map((post) => post.slug);
    const results = [];
    
    // Process users in batches to avoid overwhelming the email service
    const batchSize = 50;
    const userBatches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      userBatches.push(users.slice(i, i + batchSize));
    }

    console.log(`🔄 [DailyEmail] Processing ${userBatches.length} batches of users`);

    for (let batchIndex = 0; batchIndex < userBatches.length; batchIndex++) {
      const batch = userBatches[batchIndex];
      console.log(`📦 [DailyEmail] Processing batch ${batchIndex + 1}/${userBatches.length} (${batch.length} users)`);

      const batchPromises = batch.map(async (user) => {
        try {
          // Generate dynamic subject line
          const popularPost = posts[0];
          const subject = popularPost 
            ? `${popularPost.title.substring(0, 50)}${popularPost.title.length > 50 ? '...' : ''} | inkshaa Daily Digest`
            : `Your inkshaa Daily Brief – ${posts.length} Fresh Posts for You`;

          const mailOption = createMailOption({
            to: user.email,
            subject: subject,
            name: user.name || "Reader",
            email: user.email,
            hasButton: true,
            buttonText: "Read Today's Posts",
            buttonUrl: "https://inksha-uedq.onrender.com/explore",
            posts,
          });

          // Use the enhanced sendEmailWithRetries function
          await sendEmailWithRetries(mailOption, user._id, "daily_digest", 3);
          
          // Log success
          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_SENT",
            message: `Daily digest sent successfully to ${user.email}`,
            metadata: { postCount: posts.length }
          });

          return {
            email: user.email,
            success: true,
            userId: user._id
          };
        } catch (error) {
          console.error(`❌ [DailyEmail] Failed for ${user.email}:`, error.message);
          
          // Log failure
          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_FAILED",
            message: `Daily digest failed for ${user.email}: ${error.message}`,
            metadata: { postCount: posts.length, error: error.message }
          });

          return {
            email: user.email,
            success: false,
            error: error.message,
            userId: user._id
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const user = batch[index];
          results.push({
            email: user.email,
            success: false,
            error: result.reason?.message || 'Unknown error',
            userId: user._id
          });
        }
      });

      // Add delay between batches to avoid rate limiting
      if (batchIndex < userBatches.length - 1) {
        console.log("⏳ [DailyEmail] Waiting between batches...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`✅ [DailyEmail] Completed: ${successCount} success, ${failedCount} failed`);

    // Enhanced admin report
    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin) {
      try {
        const failedUsers = results.filter(r => !r.success).slice(0, 10); // Limit to first 10 failures
        
        const adminMailOption = createMailOption({
          to: admin.email,
          subject: `Daily Email Report - ${successCount}/${results.length} Sent Successfully`,
          name: admin.name || "Admin",
          email: admin.email,
          customTemplate: DAILY_POST_ADMIN_REPORT_TEMPLATE,
          customData: {
            totalUsers: results.length,
            successCount,
            failedCount,
            failedUsers,
            postCount: posts.length,
            processTime: Math.round((Date.now() - startTime) / 1000),
            topPosts: posts.slice(0, 3).map(p => ({
              title: p.title,
              author: p.author?.name || 'Unknown',
              likes: p.likesCount || 0,
              comments: p.commentsCount || 0
            }))
          },
        });

        await sendEmailWithRetries(adminMailOption, admin._id, "report", 3);
        console.log("📊 [DailyEmail] Admin report sent successfully");
      } catch (adminError) {
        console.error("❌ [DailyEmail] Failed to send admin report:", adminError.message);
      }
    }

    const processingTime = Date.now() - startTime;
    
    res.status(200).json({
      message: "Daily post emails processed successfully",
      results: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        failureRate: ((failedCount / results.length) * 100).toFixed(2) + '%'
      },
      postCount: posts.length,
      processTime: processingTime,
      performance: {
        avgTimePerEmail: Math.round(processingTime / results.length),
        totalBatches: userBatches.length,
        batchSize
      }
    });
    
  } catch (error) {
    console.error("💥 [DailyEmail] Critical error:", error);
    
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to process daily post emails",
            500,
            "SendDailyPostEmail",
            "Critical error in sendDailyPostEmail"
          )
    );
  }
};

// Enhanced report function with better filtering and pagination
export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      date, 
      status,
      type = 'daily_digest'
    } = req.query;

    const query = { type };

    // Enhanced date filtering with timezone support
    if (date) {
      const istDate = new Date(date);
      if (isNaN(istDate.getTime())) {
        throw new AppError("Invalid date format", 400, "GetDailyPostEmailReport");
      }
      
      const startDate = new Date(istDate);
      startDate.setUTCHours(18, 30, 0, 0); // 00:00 IST
      const endDate = new Date(istDate);
      endDate.setUTCHours(18 + 23, 30 + 59, 59, 999); // 23:59 IST

      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Status filtering
    if (status && ['sent', 'failed', 'suppressed', 'pending'].includes(status)) {
      query.emailStatus = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page

    // Enhanced aggregation pipeline for better reporting
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, role: 1 } }]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          email: 1,
          emailStatus: 1,
          emailAttempts: 1,
          emailLastError: 1,
          bounceType: 1,
          bounceReason: 1,
          messageId: 1,
          sentAt: 1,
          createdAt: 1,
          updatedAt: 1,
          'user.name': 1,
          'user.role': 1
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          logs: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
          ],
          stats: [
            {
              $group: {
                _id: '$emailStatus',
                count: { $sum: 1 }
              }
            }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ];

    const [result] = await EmailLog.aggregate(pipeline);
    const { logs, stats, totalCount } = result;
    const total = totalCount[0]?.count || 0;

    // Process stats for better reporting
    const statusStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    console.log(`📊 [EmailReport] Fetched ${logs.length} logs out of ${total} total`);

    res.status(200).json({
      logs,
      pagination: {
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      },
      stats: {
        total,
        sent: statusStats.sent || 0,
        failed: statusStats.failed || 0,
        suppressed: statusStats.suppressed || 0,
        pending: statusStats.pending || 0,
        successRate: total > 0 ? ((statusStats.sent || 0) / total * 100).toFixed(2) + '%' : '0%'
      },
      filters: {
        date,
        status,
        type
      }
    });
    
  } catch (error) {
    console.error("❌ [EmailReport] Failed to fetch email report:", error);

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch email report",
            500,
            "GetDailyPostEmailReport",
            "Error in getDailyPostEmailReport"
          )
    );
  }
};

// Enhanced notification cleanup with better logging
export const deleteAllNotifications = async (req, res, next) => {
  try {
    console.log("🗑️ [Cleanup] Starting notification cleanup...");
    
    // Get count before deletion for logging
    const countBefore = await Notification.countDocuments({});
    
    const result = await Notification.deleteMany({});
    
    console.log(`✅ [Cleanup] Deleted ${result.deletedCount} notifications (${countBefore} total found)`);

    // Record activity for audit trail
    await recordActivity({
      userId: req.user?._id || null,
      action: "NOTIFICATIONS_CLEANUP",
      message: `Deleted ${result.deletedCount} notifications`,
      metadata: { deletedCount: result.deletedCount, totalFound: countBefore }
    });

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount,
      totalFound: countBefore,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ [Cleanup] Failed to delete notifications:", error);
    
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to delete notifications",
            500,
            "DeleteAllNotifications",
            "Error in deleteAllNotifications"
          )
    );
  }
};