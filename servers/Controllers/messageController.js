import { CLIENT_URL, SENDER_EMAIL } from "../config/dotenv.js";
import transporter from "../config/nodeMailer.js";
import ReportedPost from "../Models/ReportedPost.js";
import User from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import mongoose from "mongoose";
import validator from "validator";
import ContactMessage from "../models/ContactMessage.js";
import createMailOption from "../helpers/emailHelper.js";

// Create contact message
export const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    console.log("Creating contact message", { name, email, subject });
    if (!name || !email || !message) {
      throw new AppError("Name, email, and message required", 400);
    }

    const contactMessage = new ContactMessage({
      name,
      email,
      subject,
      message,
    });
    await contactMessage.save();
    console.log("Contact message saved", { email, subject });

    res.status(201).json({ success: true, message: "Message sent" });
  } catch (error) {
    console.error("Error creating contact message", { error: error.message, stack: error.stack });
    next(new AppError(error.message, 500));
  }
};

// View all contact messages
export const viewContactMessages = async (req, res, next) => {
  try {
    console.log("Fetching all contact messages");
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    const totalMessages = await ContactMessage.countDocuments();
    console.log("Retrieved contact messages", { totalMessages });

    res.status(200).json({ success: true, messages, totalMessages });
  } catch (error) {
    console.error("Error fetching contact messages", { error: error.message, stack: error.stack });
    next(new AppError(error.message, 500));
  }
};

// Create report
export const createReport = async (req, res, next) => {
  try {
    const { postId, reason, details } = req.body;
    const reporter = req.user._id;
    console.log("Creating report", { postId, reporter });

    if (!postId || !reason) {
      throw new AppError("Post ID and reason required", 400);
    }

    const report = new ReportedPost({
      post: postId,
      reporter,
      reason,
      details,
    });
    await report.save();
    console.log("Report saved", { postId, reason });

    res.status(201).json({ success: true, message: "Report submitted" });
  } catch (error) {
    console.error("Error creating report", { error: error.message, stack: error.stack });
    next(new AppError(error.message, 500));
  }
};

// Get all reported posts
export const getAllReportedPosts = async (req, res, next) => {
  try {
    console.log("Fetching all reported posts");
    const reports = await ReportedPost.find()
      .populate({
        path: "post",
        select: "title author",
        populate: { path: "author", select: "name email" },
      })
      .populate("reporter", "name email")
      .sort({ createdAt: -1 });
    console.log("Retrieved reported posts", { count: reports.length });

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error fetching reported posts", { error: error.message, stack: error.stack });
    next(new AppError(error.message, 500, "GetAllReportedPosts"));
  }
};

// Review reported post
export const reviewReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { forwardToAuthor } = req.body;
    console.log("Reviewing report", { reportId, forwardToAuthor });

    const report = await ReportedPost.findById(reportId).populate({
      path: "post",
      select: "title author",
      populate: { path: "author", select: "name email" },
    });

    if (!report) throw new AppError("Report not found", 404, "ReviewReport");

    report.isReviewed = true;
    report.forwardedToAuthor = forwardToAuthor;
    await report.save();
    console.log("Report reviewed", { reportId });

    res.status(200).json({ success: true, message: "Report reviewed" });
  } catch (error) {
    console.error("Error reviewing report", { error: error.message, stack: error.stack });
    next(new AppError(error.message, 500, "ReviewReport"));
  }
};

// Send report notification
export const sendReportNotification = async (req, res, next) => {
  try {
    const { reportId, subject, message, details } = req.body;
    console.log("Sending report notification", { reportId, subject, requestBody: req.body });
    const finalMessage = message || details;

    if (!reportId) throw new AppError("Report ID required", 400);
    if (!subject) throw new AppError("Subject required", 400);
    if (!finalMessage) throw new AppError("Message or details required", 400);

    if (
      typeof reportId !== "string" ||
      typeof subject !== "string" ||
      typeof finalMessage !== "string"
    ) {
      throw new AppError(
        "Invalid field types for reportId, subject, or message/details",
        400
      );
    }

    const report = await ReportedPost.findById(reportId).populate({
      path: "post",
      select: "title author",
      populate: { path: "author", select: "name email" },
    });

    if (!report) throw new AppError("Report not found", 404);
    if (!report.post?.author?.email)
      throw new AppError("Author email not found", 404);

    const mailOption = createMailOption({
      to: report.post.author.email,
      subject,
      name: report.post.author.name || "User",
      email: report.post.author.email,
      message: finalMessage,
      hasButton: true,
      buttonText: "Acknowledge",
      buttonUrl: `${CLIENT_URL}/acknowledge/${reportId}`,
    });
    console.log("Preparing to send report notification email", { mailOption });

    try {
      await transporter.sendMail(mailOption);
      console.log("Report notification email sent successfully", { to: report.post.author.email, reportId });
    } catch (emailError) {
      console.error("Failed to send report notification email", {
        to: report.post.author.email,
        reportId,
        error: emailError.message,
        stack: emailError.stack,
        smtpConfig: {
          host: transporter.options.host,
          port: transporter.options.port,
          secure: transporter.options.secure,
          auth: transporter.options.auth ? { user: transporter.options.auth.user } : null,
        },
      });
      throw new AppError(`Failed to send email: ${emailError.message}`, 500, "SendReportNotificationEmail");
    }

    res.status(200).json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error in sendReportNotification", { error: error.message, stack: error.stack });
    next(new AppError(error.message, error.statusCode || 500, "SendReportNotification"));
  }
};

// Reply to contact message
export const replyContactMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { subject, message } = req.body;
    console.log("Replying to contact message", { messageId, subject });

    if (!messageId) throw new AppError("Message ID required", 400);
    if (!subject) throw new AppError("Subject required", 400);
    if (!message) throw new AppError("Message required", 400);

    if (!mongoose.isValidObjectId(messageId)) {
      throw new AppError("Invalid message ID format", 400);
    }

    if (typeof subject !== "string" || typeof message !== "string") {
      throw new AppError("Invalid field types for subject or message", 400);
    }

    const contactMessage = await ContactMessage.findById(messageId);
    if (!contactMessage) throw new AppError("Contact message not found", 404);

    if (!validator.isEmail(contactMessage.email)) {
      throw new AppError("Invalid recipient email format", 400);
    }

    const mailOption = createMailOption({
      to: contactMessage.email,
      subject,
      name: contactMessage.name || "User",
      email: contactMessage.email,
      message,
      hasButton: false,
    });
    console.log("Preparing to send contact message reply email", { mailOption });

    try {
      await transporter.sendMail(mailOption);
      contactMessage.isHandled = true;
      await contactMessage.save();
      console.log("Contact message reply email sent successfully", { to: contactMessage.email, messageId });
    } catch (emailError) {
      console.error("Failed to send contact message reply email", {
        to: contactMessage.email,
        messageId,
        error: emailError.message,
        stack: emailError.stack,
        smtpConfig: {
          host: transporter.options.host,
          port: transporter.options.port,
          secure: transporter.options.secure,
          auth: transporter.options.auth ? { user: transporter.options.auth.user } : null,
        },
      });
      throw new AppError(`Failed to send email: ${emailError.message}`, 500, "ReplyContactMessageEmail");
    }

    res.status(200).json({ success: true, message: "Reply sent successfully" });
  } catch (error) {
    console.error("Error in replyContactMessage", { error: error.message, stack: error.stack });
    next(new AppError(error.message, error.statusCode || 500, "ReplyContactMessage"));
  }
};

// Acknowledge report
export const acknowledgeReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    console.log("Acknowledging report", { reportId, userId: req.user?._id });

    if (!mongoose.isValidObjectId(reportId)) {
      throw new AppError("Invalid report ID", 400);
    }

    const report = await ReportedPost.findById(reportId).populate({
      path: "post",
      select: "author",
      populate: { path: "author", select: "_id" },
    });
    if (!report) {
      throw new AppError("Report not found", 404);
    }

    if (report.post.author._id.toString() !== req.user._id.toString()) {
      throw new AppError("Unauthorized: Only the post author can acknowledge this report", 403);
    }

    report.isAcknowledged = true;
    await report.save();
    console.log("Report acknowledged", { reportId });

    res.status(200).json({ success: true, message: "Report acknowledged successfully" });
  } catch (error) {
    console.error("Error acknowledging report", { error: error.message, stack: error.stack });
    next(new AppError(error.message, error.statusCode || 500, "AcknowledgeReport"));
  }
};