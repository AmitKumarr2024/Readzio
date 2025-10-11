import { CLIENT_URL, 
  // SENDER_EMAIL 
} from "../config/dotenv.js";

import { AppError } from "../../servers/Utils/AppError.js";
import mongoose from "mongoose";
import validator from "validator";
import ContactMessage from "../../servers/Models/ContactMessage.js";
import ReportedPostModel from "../../servers/Models/ReportedPost.js";

// Creates a new contact message
export const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validates required fields
    if (!name || !email || !message)
      throw new AppError(
        "Name, email, and message required",
        400,
        "CreateContactMessage",
        "Missing required fields"
      );

    // Validates email format
    if (!validator.isEmail(email))
      throw new AppError(
        "Invalid email format",
        400,
        "CreateContactMessage",
        "Invalid email"
      );

    const contactMessage = new ContactMessage({
      name,
      email,
      subject,
      message,
    });
    await contactMessage.save();

    res.status(201).json({ success: true, message: "Message sent" });
  } catch (error) {
    // AppError with context for creating contact message
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "CreateContactMessage",
            "Failed to create contact message"
          )
    );
  }
};

// Retrieves all contact messages
export const viewContactMessages = async (req, res, next) => {
  try {
    // Fetches all contact messages, sorted by creation date
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    const totalMessages = await ContactMessage.countDocuments();

    res.status(200).json({ success: true, messages, totalMessages });
  } catch (error) {
    // AppError with context for fetching contact messages
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "ViewContactMessages",
            "Failed to fetch contact messages"
          )
    );
  }
};

// Creates a new report for a post
export const createReport = async (req, res, next) => {
  try {
    const { postId, reason, details } = req.body;
    const reporter = req.user._id;

    // Validates required fields
    if (!postId || !reason)
      throw new AppError(
        "Post ID and reason required",
        400,
        "CreateReport",
        "Missing required fields"
      );

    // Validates postId format
    if (!mongoose.isValidObjectId(postId))
      throw new AppError(
        "Invalid post ID",
        400,
        "CreateReport",
        "Invalid post ID format"
      );

    const report = new ReportedPostModel({
      post: postId,
      reporter,
      reason,
      details,
    });
    await report.save();

    res.status(201).json({ success: true, message: "Report submitted" });
  } catch (error) {
    // AppError with context for creating report
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "CreateReport",
            "Failed to create report"
          )
    );
  }
};

// Retrieves all reported posts
export const getAllReportedPosts = async (req, res, next) => {
  try {
    // Fetches all reports with populated post and reporter details
    const reports = await ReportedPostModel.find()
      .populate({
        path: "post",
        select: "title author",
        populate: { path: "author", select: "name email" },
      })
      .populate("reporter", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reports });
  } catch (error) {
    // AppError with context for fetching reported posts
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "GetAllReportedPosts",
            "Failed to fetch reported posts"
          )
    );
  }
};

// Reviews a reported post
export const reviewReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { forwardToAuthor } = req.body;

    // Validates report ID
    if (!mongoose.isValidObjectId(reportId))
      throw new AppError(
        "Invalid report ID",
        400,
        "ReviewReport",
        "Invalid report ID format"
      );

    // Fetches report with populated post and author
    const report = await ReportedPostModel.findById(reportId).populate({
      path: "post",
      select: "title author",
      populate: { path: "author", select: "name email" },
    });

    if (!report)
      throw new AppError(
        "Report not found",
        404,
        "ReviewReport",
        "Report does not exist"
      );

    // Marks report as reviewed
    report.isReviewed = true;
    report.forwardedToAuthor = forwardToAuthor;
    await report.save();

    res.status(200).json({ success: true, message: "Report reviewed" });
  } catch (error) {
    // AppError with context for reviewing report
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "ReviewReport",
            "Failed to review report"
          )
    );
  }
};

// Sends a report notification to the post author
export const sendReportNotification = async (req, res, next) => {
  try {
    const { reportId, subject, message, details } = req.body;
    const finalMessage = message || details;

    // Validates required fields
    if (!reportId || !subject || !finalMessage)
      throw new AppError(
        "Report ID, subject, and message/details required",
        400,
        "SendReportNotification",
        "Missing required fields"
      );

    // Validates field types
    if (
      typeof reportId !== "string" ||
      typeof subject !== "string" ||
      typeof finalMessage !== "string"
    )
      throw new AppError(
        "Invalid field types for reportId, subject, or message/details",
        400,
        "SendReportNotification",
        "Invalid field types"
      );

    // Fetches report with populated post and author
    const report = await ReportedPostModel.findById(reportId).populate({
      path: "post",
      select: "title author",
      populate: { path: "author", select: "name email" },
    });

    if (!report)
      throw new AppError(
        "Report not found",
        404,
        "SendReportNotification",
        "Report does not exist"
      );

    if (!report.post?.author?.email)
      throw new AppError(
        "Author email not found",
        404,
        "SendReportNotification",
        "Missing author email"
      );

  
    res
      .status(200)
      .json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    // AppError with context for sending report notification
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "SendReportNotification",
            "Failed to send report notification"
          )
    );
  }
};

// Replies to a contact message
export const replyContactMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { subject, message } = req.body;

    // Validates required fields
    if (!messageId || !subject || !message)
      throw new AppError(
        "Message ID, subject, and message required",
        400,
        "ReplyContactMessage",
        "Missing required fields"
      );

    // Validates message ID format
    if (!mongoose.isValidObjectId(messageId))
      throw new AppError(
        "Invalid message ID format",
        400,
        "ReplyContactMessage",
        "Invalid message ID"
      );

    // Validates field types
    if (typeof subject !== "string" || typeof message !== "string")
      throw new AppError(
        "Invalid field types for subject or message",
        400,
        "ReplyContactMessage",
        "Invalid field types"
      );

    // Fetches contact message
    const contactMessage = await ContactMessage.findById(messageId);
    if (!contactMessage)
      throw new AppError(
        "Contact message not found",
        404,
        "ReplyContactMessage",
        "Message does not exist"
      );

    // Validates recipient email
    if (!validator.isEmail(contactMessage.email))
      throw new AppError(
        "Invalid recipient email format",
        400,
        "ReplyContactMessage",
        "Invalid email format"
      );

    
    // Marks message as handled
    contactMessage.isHandled = true;
    await contactMessage.save();

    res.status(200).json({ success: true, message: "Reply sent successfully" });
  } catch (error) {
    // AppError with context for replying to contact message
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "ReplyContactMessage",
            "Failed to reply to contact message"
          )
    );
  }
};

// Acknowledges a report
export const acknowledgeReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    // Validates report ID
    if (!mongoose.isValidObjectId(reportId))
      throw new AppError(
        "Invalid report ID",
        400,
        "AcknowledgeReport",
        "Invalid report ID format"
      );

    // Fetches report with populated post and author
    const report = await ReportedPostModel.findById(reportId).populate({
      path: "post",
      select: "author",
      populate: { path: "author", select: "_id" },
    });

    if (!report)
      throw new AppError(
        "Report not found",
        404,
        "AcknowledgeReport",
        "Report does not exist"
      );

    // Validates user authorization
    if (report.post.author._id.toString() !== req.user._id.toString())
      throw new AppError(
        "Unauthorized: Only the post author can acknowledge this report",
        403,
        "AcknowledgeReport",
        "User not authorized"
      );

    // Marks report as acknowledged
    report.isAcknowledged = true;
    await report.save();

    res
      .status(200)
      .json({ success: true, message: "Report acknowledged successfully" });
  } catch (error) {
    // AppError with context for acknowledging report
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "AcknowledgeReport",
            "Failed to acknowledge report"
          )
    );
  }
};
