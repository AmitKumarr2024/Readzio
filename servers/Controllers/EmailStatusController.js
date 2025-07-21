import EmailLog from "../Models/EmailLog.js";
import { AppError } from "../../servers/Utils/AppError.js";
import validator from "validator";

// Valid email types for validation
const VALID_EMAIL_TYPES = [
  "signup",
  "payout",
  "subscription",
  "contact_reply",
  "report",
];

// Checks email status for a specific email and type
export const checkEmailStatus = async (req, res, next) => {
  try {
    const { email, type } = req.query;

    // Validates email format
    if (!email || !validator.isEmail(email))
      throw new AppError("Valid email required", 400, "CheckEmailStatus", "Invalid email format");

    // Validates email type
    if (!type || !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400,
        "CheckEmailStatus",
        "Invalid email type"
      );

    // Queries email log
    const log = await EmailLog.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
      type,
    }).select(
      "emailStatus emailAttempts emailLastError stopEmailAttempts createdAt"
    );

    // Returns default status if no log found
    if (!log) {
      return res.status(200).json({
        email,
        type,
        emailStatus: "not_sent",
        emailAttempts: 0,
        emailLastError: null,
        stopEmailAttempts: false,
      });
    }

    res.status(200).json({ email, type, ...log.toObject() });
  } catch (error) {
    // AppError with context for checking email status
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "CheckEmailStatus", "Failed to check email status")
    );
  }
};

// Retrieves all email statuses, optionally filtered by type
export const getAllEmailStatuses = async (req, res, next) => {
  try {
    // Validates admin access
    if (req.user.role !== "admin")
      throw new AppError("Admin access required", 403, "GetAllEmailStatuses", "Admin privileges required");

    const { page = 1, limit = 10, type } = req.query;

    // Validates email type if provided
    if (type && !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400,
        "GetAllEmailStatuses",
        "Invalid email type"
      );

    const query = type ? { type } : {};

    // Fetches email logs with pagination
    const logs = await EmailLog.find(query)
      .select(
        "email type emailStatus emailAttempts emailLastError stopEmailAttempts createdAt"
      )
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await EmailLog.countDocuments(query);

    res.status(200).json({ logs, total, page, limit });
  } catch (error) {
    // AppError with context for fetching all email statuses
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetAllEmailStatuses", "Failed to fetch email statuses")
    );
  }
};

// Retries sending failed emails
export const retryFailedEmails = async (req, res, next) => {
  try {
    // Validates admin access
    if (req.user.role !== "admin")
      throw new AppError("Admin access required", 403, "RetryFailedEmails", "Admin privileges required");

    const { type } = req.body;

    // Validates email type if provided
    if (type && !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400,
        "RetryFailedEmails",
        "Invalid email type"
      );

    const query = { emailStatus: "failed", stopEmailAttempts: true };
    if (type) query.type = type;

    // Fetches failed email logs
    const failedLogs = await EmailLog.find(query);
    const results = [];

    // Retries sending each failed email
    for (const log of failedLogs) {
      try {
        const mailOption = createMailOption({
          to: log.email,
          subject: `Retry: ${log.type} Notification`,
          message: `Retrying email for ${log.type}.`,
          hasButton: false,
        });

        const emailResult = await sendEmailWithRetries(
          mailOption,
          log.userId,
          log.type
        );

        results.push({
          email: log.email,
          type: log.type,
          success: emailResult.success,
          attempts: emailResult.attempts,
        });
      } catch (error) {
        results.push({
          email: log.email,
          type: log.type,
          success: false,
          error: error.message,
        });
      }
    }

    res.status(200).json({ results });
  } catch (error) {
    // AppError with context for retrying failed emails
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "RetryFailedEmails", "Failed to retry failed emails")
    );
  }
};