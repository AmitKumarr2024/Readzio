// routes/emailRoutes.js
import express from "express";
import { body, query, param, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  sendBulkEmailsController,
  sendDailyReportEmail,
  getEmailLogs,
  getEmailStats,
  resendFailedEmails,
} from "../controllers/emailController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Rate Limiting Configuration
const emailSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 emails per 15 minutes for individual sends
  message: {
    success: false,
    message: "Too many email send attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // 2 bulk operations per hour
  message: {
    success: false,
    message: "Bulk email limit exceeded. Please try again later.",
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// 🔹 Validation Middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors occurred",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// 🔹 Common Validation Rules
const emailNameValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name is required and must be between 1 and 100 characters"),
];

const emailOnlyValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const dateRangeValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("End date must be a valid ISO 8601 date"),
];

const statusTypeValidation = [
  query("status")
    .optional()
    .isIn(["sent", "failed", "pending"])
    .withMessage("Status must be one of: sent, failed, pending"),
  query("type")
    .optional()
    .isIn([
      "verification",
      "welcome",
      "reset_password",
      "invoice",
      "daily_report",
      "notification",
    ])
    .withMessage("Invalid email type"),
];

// 🔹 PUBLIC ROUTES (No authentication required)

// Send verification email (public for registration)
router.post(
  "/send-verification",
  emailSendLimiter,
  emailNameValidation,
  handleValidationErrors,
  sendVerificationEmail
);

// Send password reset email (public)
router.post(
  "/send-password-reset",
  emailSendLimiter,
  emailOnlyValidation,
  handleValidationErrors,
  sendPasswordResetEmail
);

// 🔹 AUTHENTICATED ROUTES (Require login)
router.use(authenticate); // All routes below require authentication

// Send welcome email
router.post(
  "/send-welcome",
  generalLimiter,
  emailNameValidation,
  handleValidationErrors,
  sendWelcomeEmail
);

// Send invoice email
router.post(
  "/send-invoice",
  generalLimiter,
  [
    ...emailNameValidation,
    body("invoiceData")
      .isObject()
      .withMessage("Invoice data is required")
      .custom((value) => {
        if (!value.invoiceId || !value.amount || !value.currency) {
          throw new Error(
            "Invoice data must contain invoiceId, amount, and currency"
          );
        }
        return true;
      }),
  ],
  handleValidationErrors,
  sendInvoiceEmail
);

// Get email logs (basic user access - can see their own logs)
router.get(
  "/logs",
  generalLimiter,
  [...paginationValidation, ...dateRangeValidation, ...statusTypeValidation],
  handleValidationErrors,
  getEmailLogs
);

// Get email statistics (basic stats for authenticated users)
router.get(
  "/stats",
  generalLimiter,
  dateRangeValidation,
  handleValidationErrors,
  getEmailStats
);

// 🔹 ADMIN ROUTES (Require admin privileges)
router.use(authorize(["admin", "super_admin"])); // Admin/Super Admin only

// Send bulk emails (Admin only)
router.post(
  "/send-bulk",
  bulkEmailLimiter,
  [
    body("emailList")
      .isArray({ min: 1 })
      .withMessage("Email list must be a non-empty array")
      .custom((emailList) => {
        // Validate each email in the list
        for (const email of emailList) {
          if (!email.to || !email.subject || !email.type) {
            throw new Error(
              "Each email must have to, subject, and type fields"
            );
          }
          // Validate email format
          const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
          if (!emailRegex.test(email.to)) {
            throw new Error(`Invalid email format: ${email.to}`);
          }
          // Validate email type
          const validTypes = [
            "verification",
            "welcome",
            "reset_password",
            "invoice",
            "daily_report",
            "notification",
          ];
          if (!validTypes.includes(email.type)) {
            throw new Error(`Invalid email type: ${email.type}`);
          }
        }
        return true;
      }),
  ],
  handleValidationErrors,
  sendBulkEmailsController
);

// Send daily report email (Admin only)
router.post(
  "/send-daily-report",
  generalLimiter,
  [
    body("adminEmail")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid admin email is required"),
    body("reportData")
      .isObject()
      .withMessage("Report data is required")
      .custom((value) => {
        const requiredFields = [
          "totalUsers",
          "successCount",
          "failedCount",
          "postCount",
        ];
        for (const field of requiredFields) {
          if (typeof value[field] !== "number") {
            throw new Error(`Report data must contain numeric ${field}`);
          }
        }
        return true;
      }),
  ],
  handleValidationErrors,
  sendDailyReportEmail
);

// Resend failed emails (Admin only)
router.post(
  "/resend-failed",
  bulkEmailLimiter,
  [
    body("emailIds")
      .isArray({ min: 1 })
      .withMessage("Email IDs array is required")
      .custom((emailIds) => {
        // Validate each ID is a valid MongoDB ObjectId
        const ObjectId = /^[0-9a-fA-F]{24}$/;
        for (const id of emailIds) {
          if (!ObjectId.test(id)) {
            throw new Error(`Invalid email ID format: ${id}`);
          }
        }
        return true;
      }),
  ],
  handleValidationErrors,
  resendFailedEmails
);

// 🔹 Error handling for undefined routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Email route ${req.originalUrl} not found`,
  });
});

export default router;
