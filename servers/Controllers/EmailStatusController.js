import EmailLog from "../Models/EmailLog.js";
import { AppError } from "../utils/AppError.js";
import validator from "validator";

const VALID_EMAIL_TYPES = [
  "signup",
  "payout",
  "subscription",
  "contact_reply",
  "report",
];

export const checkEmailStatus = async (req, res, next) => {
  const { email, type } = req.query;
  try {
    if (!email || !validator.isEmail(email))
      throw new AppError("Valid email required", 400);
    if (!type || !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400
      );
    console.log(
      `[checkEmailStatus] Querying EmailLog for email: ${email}, type: ${type}`
    );
    const log = await EmailLog.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
      type,
    }).select(
      "emailStatus emailAttempts emailLastError stopEmailAttempts createdAt"
    );

    if (!log) {
      console.log(
        `[checkEmailStatus] No log found for email: ${email}, type: ${type}`
      );
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
    console.error(`[checkEmailStatus] Error: ${error.message}`);
    next(
      new AppError(error.message, error.statusCode || 500, "CheckEmailStatus")
    );
  }
};

export const getAllEmailStatuses = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      throw new AppError("Admin access required", 403);
    const { page = 1, limit = 10, type } = req.query;
    if (type && !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400
      );
    const query = type ? { type } : {};
    console.log(
      `[getAllEmailStatuses] Query: ${JSON.stringify(
        query
      )}, page: ${page}, limit: ${limit}`
    );
    const logs = await EmailLog.find(query)
      .select(
        "email type emailStatus emailAttempts emailLastError stopEmailAttempts createdAt"
      )

      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await EmailLog.countDocuments(query);
    res.status(200).json({ logs, total, page, limit });
  } catch (error) {
    console.error(`[getAllEmailStatuses] Error: ${error.message}`);
    next(new AppError(error.message, 500, "GetAllEmailStatuses"));
  }
};

export const retryFailedEmails = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      throw new AppError("Admin access required", 403);
    const { type } = req.body;
    if (type && !VALID_EMAIL_TYPES.includes(type))
      throw new AppError(
        `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}`,
        400
      );
    const query = { emailStatus: "failed", stopEmailAttempts: true };
    if (type) query.type = type;
    console.log(`[retryFailedEmails] Query: ${JSON.stringify(query)}`);
    const failedLogs = await EmailLog.find(query);
    const results = [];
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
    console.error(`[retryFailedEmails] Error: ${error.message}`);
    next(new AppError(error.message, 500, "RetryFailedEmails"));
  }
};
