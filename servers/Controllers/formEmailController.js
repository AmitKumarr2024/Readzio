
// Controllers/formEmailController.js
import { sendEmail } from "../services/emailService.js";
import { AppError } from "../Utils/AppError.js";
import validator from "validator";
import {
  verificationOtpTemplate,
  welcomeTemplate,
  resetOtpTemplate,
} from "../services/emailTemplates.js";

/**
 * Send Verification Email (Form-based)
 */
export const sendVerificationEmail = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    // Validation
    if (!email || !validator.isEmail(email)) {
      throw new AppError("Valid email is required", 400, "SendVerificationEmail");
    }
    if (!name || name.trim().length === 0) {
      throw new AppError("Name is required", 400, "SendVerificationEmail");
    }

    // Generate a dummy OTP for manual verification emails
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Send email using existing template
    const result = await sendEmail({
      to: email,
      subject: "Verify Your Readzio Account",
      html: verificationOtpTemplate(otp, name),
      text: `Hi ${name}, your verification OTP is: ${otp}. This code is valid for 1 hour.`,
      type: "verification",
    });

    if (!result.success) {
      throw new AppError(
        result.error || "Failed to send email",
        500,
        "SendVerificationEmail"
      );
    }

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
      messageId: result.messageId,
      otp, // Include OTP in response for admin testing
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendVerificationEmail")
    );
  }
};

/**
 * Send Welcome Email (Form-based)
 */
export const sendWelcomeEmail = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email || !validator.isEmail(email)) {
      throw new AppError("Valid email is required", 400, "SendWelcomeEmail");
    }
    if (!name || name.trim().length === 0) {
      throw new AppError("Name is required", 400, "SendWelcomeEmail");
    }

    // Send email using existing template
    const result = await sendEmail({
      to: email,
      subject: "Welcome to Readzio! 🎉",
      html: welcomeTemplate(name),
      text: `Welcome to Readzio, ${name}! We're excited to have you join our community.`,
      type: "welcome",
    });

    if (!result.success) {
      throw new AppError(
        result.error || "Failed to send email",
        500,
        "SendWelcomeEmail"
      );
    }

    res.status(200).json({
      success: true,
      message: "Welcome email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendWelcomeEmail")
    );
  }
};

/**
 * Send Password Reset Email (Form-based)
 */
export const sendPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      throw new AppError(
        "Valid email is required",
        400,
        "SendPasswordResetEmail"
      );
    }

    // Generate a dummy OTP for manual password reset emails
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Send email using existing template
    const result = await sendEmail({
      to: email,
      subject: "Reset Your Readzio Password",
      html: resetOtpTemplate(otp, "User"),
      text: `Your OTP for password reset is: ${otp}. This code expires in 15 minutes.`,
      type: "reset",
    });

    if (!result.success) {
      throw new AppError(
        result.error || "Failed to send email",
        500,
        "SendPasswordResetEmail"
      );
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
      messageId: result.messageId,
      otp, // Include OTP in response for admin testing
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendPasswordResetEmail")
    );
  }
};

/**
 * Send Invoice Email (Form-based)
 */
export const sendInvoiceEmail = async (req, res, next) => {
  try {
    const { email, name, invoiceData } = req.body;

    if (!email || !validator.isEmail(email)) {
      throw new AppError("Valid email is required", 400, "SendInvoiceEmail");
    }
    if (!name || name.trim().length === 0) {
      throw new AppError("Name is required", 400, "SendInvoiceEmail");
    }
    if (!invoiceData) {
      throw new AppError("Invoice data is required", 400, "SendInvoiceEmail");
    }

    const { invoiceId, orderId, paymentId, amount, currency, date } =
      invoiceData;

    if (!invoiceId || !orderId || !paymentId || !amount || !currency || !date) {
      throw new AppError(
        "All invoice fields are required",
        400,
        "SendInvoiceEmail"
      );
    }

    // Create invoice email template
    const invoiceTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice from Readzio</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .invoice-details p { margin: 8px 0; display: flex; justify-content: space-between; }
    .invoice-details strong { color: #4f46e5; }
    .footer { background-color: #f3f4f6; text-align: center; padding: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .button { display: inline-block; margin: 20px 0; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Invoice from Readzio</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for your payment. Here are your invoice details:</p>
      
      <div class="invoice-details">
        <p><strong>Invoice ID:</strong> <span>${invoiceId}</span></p>
        <p><strong>Order ID:</strong> <span>${orderId}</span></p>
        <p><strong>Payment ID:</strong> <span>${paymentId}</span></p>
        <p><strong>Amount:</strong> <span>${currency} ${amount}</span></p>
        <p><strong>Date:</strong> <span>${new Date(date).toLocaleDateString()}</span></p>
      </div>
      
      <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <center>
        <a href="https://readzio.com/invoices/${invoiceId}" class="button">View Invoice</a>
      </center>
    </div>
    <div class="footer">
      Need help? Contact us at <a href="mailto:support@readzio.com" style="color: #4f46e5;">support@readzio.com</a><br />
      © ${new Date().getFullYear()} Readzio. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const result = await sendEmail({
      to: email,
      subject: `Invoice ${invoiceId} from Readzio`,
      html: invoiceTemplate,
      text: `Hi ${name}, your invoice ${invoiceId} for ${currency} ${amount} is ready. View it at: https://readzio.com/invoices/${invoiceId}`,
      type: "payout",
    });

    if (!result.success) {
      throw new AppError(
        result.error || "Failed to send email",
        500,
        "SendInvoiceEmail"
      );
    }

    res.status(200).json({
      success: true,
      message: "Invoice email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendInvoiceEmail")
    );
  }
};