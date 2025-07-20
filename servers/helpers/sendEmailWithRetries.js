import transporter from '../config/nodeMailer.js';
import EmailLog from '../Models/EmailLog.js';
import { AppError } from '../utils/AppError.js';

// Defines valid email types for sending emails
const VALID_EMAIL_TYPES = ['signup', 'payout', 'subscription', 'contact_reply', 'report'];

// Sends an email with retry logic and logs the attempt
export const sendEmailWithRetries = async (mailOption, userId, type, maxAttempts = 3) => {
  try {
    // Validates inputs
    if (!mailOption || typeof mailOption !== 'object' || !mailOption.to) {
      throw new AppError(
        'Invalid mail options',
        400,
        'SendEmailWithRetries',
        'mailOption must be a non-null object with a valid "to" field'
      );
    }
    if (!VALID_EMAIL_TYPES.includes(type)) {
      throw new AppError(
        'Invalid email type',
        400,
        'SendEmailWithRetries',
        `Type must be one of: ${VALID_EMAIL_TYPES.join(', ')}`
      );
    }
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(
        'Invalid user ID',
        400,
        'SendEmailWithRetries',
        'userId must be a valid MongoDB ObjectId'
      );
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new AppError(
        'Invalid max attempts',
        400,
        'SendEmailWithRetries',
        'maxAttempts must be a positive integer'
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailOption.to)) {
      throw new AppError(
        'Invalid recipient email',
        400,
        'SendEmailWithRetries',
        'Recipient email must be a valid email address'
      );
    }

    const email = mailOption.to.toLowerCase();
    let attempts = 0;
    let lastError = null;

    // Creates or updates email log entry
    const log = await EmailLog.findOneAndUpdate(
      { email, type, userId: userId || null },
      { $setOnInsert: { email, type, userId: userId || null, emailStatus: 'pending' } },
      { upsert: true, new: true }
    );

    // Attempts to send email with retries
    while (attempts < maxAttempts && !log.stopEmailAttempts) {
      try {
        attempts++;
        await transporter.sendMail(mailOption);
        // Updates log on successful send
        await EmailLog.findByIdAndUpdate(log._id, {
          emailStatus: 'sent',
          emailAttempts: attempts,
          emailLastError: null,
          updatedAt: new Date(),
        });
        return { success: true, attempts };
      } catch (error) {
        lastError = error;
        // Updates log with error details
        await EmailLog.findByIdAndUpdate(log._id, {
          emailAttempts: attempts,
          emailLastError: error.message,
          updatedAt: new Date(),
        });
        if (attempts < maxAttempts) {
          // Waits before retrying, with increasing delay
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    // Marks log as failed after max attempts
    await EmailLog.findByIdAndUpdate(log._id, {
      emailStatus: 'failed',
      emailAttempts: attempts,
      emailLastError: lastError?.message || 'Unknown error',
      stopEmailAttempts: true,
      updatedAt: new Date(),
    });

    throw new AppError(
      'Failed to send email after maximum attempts',
      500,
      'SendEmailWithRetries',
      lastError?.message || 'Unknown error during email sending'
    );
  } catch (error) {
    // AppError with context for sending email with retries
    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || 'Failed to send email',
          500,
          'SendEmailWithRetries',
          'Error in sendEmailWithRetries'
        );
  }
};