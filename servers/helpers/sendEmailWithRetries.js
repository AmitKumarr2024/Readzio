import transporter from '../config/nodeMailer.js';
import EmailLog from '../Models/EmailLog.js';
import { AppError } from '../utils/AppError.js';

const VALID_EMAIL_TYPES = ['signup', 'payout', 'subscription', 'contact_reply', 'report'];

export const sendEmailWithRetries = async (mailOption, userId, type, maxAttempts = 3) => {
  if (!mailOption.to || !VALID_EMAIL_TYPES.includes(type)) {
    throw new AppError(`Invalid email or type. Type must be one of: ${VALID_EMAIL_TYPES.join(', ')}`, 400);
  }

  const email = mailOption.to.toLowerCase();
  let attempts = 0;
  let lastError = null;

  // Create or find EmailLog
  const log = await EmailLog.findOneAndUpdate(
    { email, type, userId: userId || null },
    { $setOnInsert: { email, type, userId: userId || null, emailStatus: 'pending' } },
    { upsert: true, new: true }
  );

  while (attempts < maxAttempts && !log.stopEmailAttempts) {
    try {
      attempts++;
      await transporter.sendMail(mailOption);
      await EmailLog.findByIdAndUpdate(log._id, {
        emailStatus: 'sent',
        emailAttempts: attempts,
        emailLastError: null,
        updatedAt: new Date()
      });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      await EmailLog.findByIdAndUpdate(log._id, {
        emailAttempts: attempts,
        emailLastError: error.message,
        updatedAt: new Date()
      });
      if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  await EmailLog.findByIdAndUpdate(log._id, {
    emailStatus: 'failed',
    emailAttempts: attempts,
    emailLastError: lastError.message,
    stopEmailAttempts: true,
    updatedAt: new Date()
  });
  return { success: false, attempts, error: lastError.message };
};