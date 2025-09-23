// controllers/emailController.js
import {
  sendAndLogEmail,
  sendBulkEmails,
  generateOTP,
  isValidEmail,
} from "../helpers/emailHelper.js";
import EmailLog from "../../servers/Models/EmailLog.js";
import User from "../../servers/Models/User.js"; // Assuming you have a User model

// Send verification email
export const sendVerificationEmail = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database or cache (Redis recommended)
    // For demo purposes, storing in user model
    const user = await User.findOne({ email });
    if (user) {
      user.verificationOTP = otp;
      user.otpExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
    }

    const emailData = {
      to: email,
      subject: "Email Verification - inkshaa",
      type: "verification",
      templateData: {
        name,
        message:
          "Please verify your email address to complete your registration.",
        otp,
        isResetOtp: false,
      },
    };

    const result = await sendAndLogEmail(emailData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
        data: {
          emailId: result.emailLog._id,
          messageId: result.messageId,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send verification email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send verification email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send welcome email
export const sendWelcomeEmail = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    const emailData = {
      to: email,
      subject: "Welcome to inkshaa! 🎉",
      type: "welcome",
      templateData: {
        name,
        message: "Thank you for joining our creative community!",
        hasButton: true,
        buttonText: "Get Started",
        buttonUrl: "https://inkshaa.onrender.com/dashboard",
      },
    };

    const result = await sendAndLogEmail(emailData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Welcome email sent successfully",
        data: {
          emailId: result.emailLog._id,
          messageId: result.messageId,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send welcome email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send welcome email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate OTP for password reset
    const otp = generateOTP();

    // Store reset OTP
    user.resetPasswordOTP = otp;
    user.resetOTPExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const emailData = {
      to: email,
      subject: "Password Reset Request - inkshaa",
      type: "reset_password",
      templateData: {
        name: user.name,
        message:
          "You have requested to reset your password. Use the OTP below to proceed.",
        otp,
        isResetOtp: true,
      },
    };

    const result = await sendAndLogEmail(emailData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Password reset email sent successfully",
        data: {
          emailId: result.emailLog._id,
          messageId: result.messageId,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send password reset email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send password reset email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send invoice email
export const sendInvoiceEmail = async (req, res) => {
  try {
    const { email, name, invoiceData } = req.body;

    if (!email || !name || !invoiceData) {
      return res.status(400).json({
        success: false,
        message: "Email, name, and invoice data are required",
      });
    }

    const emailData = {
      to: email,
      subject: `Invoice Receipt - ${invoiceData.invoiceId}`,
      type: "invoice",
      templateData: {
        name,
        message:
          "Thank you for your payment. Please find your invoice details below:",
        invoice: invoiceData,
      },
    };

    const result = await sendAndLogEmail(emailData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Invoice email sent successfully",
        data: {
          emailId: result.emailLog._id,
          messageId: result.messageId,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send invoice email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send invoice email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send bulk emails
export const sendBulkEmailsController = async (req, res) => {
  try {
    const { emailList } = req.body;

    if (!emailList || !Array.isArray(emailList) || emailList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email list is required and must be a non-empty array",
      });
    }

    // Validate email list structure
    for (const email of emailList) {
      if (!email.to || !email.subject || !email.type) {
        return res.status(400).json({
          success: false,
          message: "Each email must have to, subject, and type fields",
        });
      }
    }

    const results = await sendBulkEmails(emailList);

    res.status(200).json({
      success: true,
      message: "Bulk email operation completed",
      data: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error) {
    console.error("Send bulk emails error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send daily report email
export const sendDailyReportEmail = async (req, res) => {
  try {
    const { adminEmail, reportData } = req.body;

    if (!adminEmail || !reportData) {
      return res.status(400).json({
        success: false,
        message: "Admin email and report data are required",
      });
    }

    const emailData = {
      to: adminEmail,
      subject: `Daily Post Email Report - ${new Date().toLocaleDateString()}`,
      type: "daily_report",
      templateData: {
        totalUsers: reportData.totalUsers,
        successCount: reportData.successCount,
        failedCount: reportData.failedCount,
        postCount: reportData.postCount,
        failedUsers: reportData.failedUsers || [],
      },
    };

    const result = await sendAndLogEmail(emailData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Daily report email sent successfully",
        data: {
          emailId: result.emailLog._id,
          messageId: result.messageId,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send daily report email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send daily report email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get email logs
export const getEmailLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      startDate,
      endDate,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-templateData"), // Exclude large template data
      EmailLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: logs.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    console.error("Get email logs error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get email statistics
export const getEmailStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await EmailLog.getEmailStats(start, end);

    // Transform stats for better readability
    const formattedStats = {
      sent: 0,
      failed: 0,
      pending: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    // Get type-wise statistics
    const typeStats = await EmailLog.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          sent: {
            $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: formattedStats,
        byType: typeStats,
        period: { startDate: start, endDate: end },
      },
    });
  } catch (error) {
    console.error("Get email stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Resend failed emails
export const resendFailedEmails = async (req, res) => {
  try {
    const { emailIds } = req.body;

    if (!emailIds || !Array.isArray(emailIds)) {
      return res.status(400).json({
        success: false,
        message: "Email IDs array is required",
      });
    }

    const failedEmails = await EmailLog.find({
      _id: { $in: emailIds },
      status: "failed",
    });

    if (failedEmails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No failed emails found with provided IDs",
      });
    }

    const resendResults = [];

    for (const emailLog of failedEmails) {
      try {
        const result = await sendAndLogEmail({
          to: emailLog.to,
          subject: emailLog.subject,
          type: emailLog.type,
          templateData: emailLog.templateData,
        });

        resendResults.push({
          originalEmailId: emailLog._id,
          newEmailId: result.emailLog._id,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        resendResults.push({
          originalEmailId: emailLog._id,
          success: false,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Resend operation completed",
      data: {
        total: failedEmails.length,
        results: resendResults,
      },
    });
  } catch (error) {
    console.error("Resend failed emails error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
