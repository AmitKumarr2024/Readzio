import EmailLog from "../Models/EmailLog.js";
import { AppError } from "../../servers/Utils/AppError.js";
import validator from "validator";
import { sendEmail } from "../../servers/services/emailService.js";

const VALID_EMAIL_TYPES = [
  "signup",
  "payout",
  "subscription",
  "contact_reply",
  "report",
  "daily_digest",
];

// Check status of a specific email
export const checkEmailStatus = async (req, res, next) => {
  try {
    const { email, type } = req.query;

    if (!email || !validator.isEmail(email))
      throw new AppError("Valid email required", 400, "CheckEmailStatus");

    if (!type || !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400,
        "CheckEmailStatus"
      );

    const log = await EmailLog.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
      type,
    }).select(
      "emailStatus emailAttempts emailLastError stopEmailAttempts createdAt"
    );

    if (!log)
      return res.status(200).json({
        email,
        type,
        emailStatus: "not_sent",
        emailAttempts: 0,
        emailLastError: null,
        stopEmailAttempts: false,
      });

    res.status(200).json({ email, type, ...log.toObject() });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "CheckEmailStatus")
    );
  }
};

// Get all email statuses (admin)
export const getAllEmailStatuses = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      throw new AppError("Admin access required", 403, "GetAllEmailStatuses");

    const { page = 1, limit = 10, type } = req.query;

    if (type && !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400,
        "GetAllEmailStatuses"
      );

    const query = type ? { type } : {};
    const logs = await EmailLog.find(query)
      .select(
        "email type emailStatus emailAttempts emailLastError stopEmailAttempts createdAt"
      )
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await EmailLog.countDocuments(query);

    res.status(200).json({ logs, total, page, limit });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetAllEmailStatuses")
    );
  }
};

// Retry failed emails (admin)
export const retryFailedEmails = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      throw new AppError("Admin access required", 403, "RetryFailedEmails");

    const { type } = req.body;

    if (type && !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400,
        "RetryFailedEmails"
      );

    const query = { emailStatus: "failed", stopEmailAttempts: true };
    if (type) query.type = type;

    const failedLogs = await EmailLog.find(query);
    const results = [];

    for (const log of failedLogs) {
      try {
        // Call sendEmail service again
        const { success } = await sendEmail({
          to: log.email,
          subject: "Retry Email",
          html: "<p>Retrying failed email</p>",
          text: "Retrying failed email",
          type: log.type,
        });
        results.push({ email: log.email, success });
      } catch (err) {
        results.push({ email: log.email, success: false, error: err.message });
      }
    }

    res.status(200).json({ results });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "RetryFailedEmails")
    );
  }
};

