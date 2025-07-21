import Handlebars from 'handlebars';
import { EMAIL_TEMPLATE } from '../config/emailTemplate.js';
import { DAILY_POST_EMAIL_TEMPLATE } from '../config/dailyPostEmailTemplate.js';
import { SENDER_EMAIL } from '../config/dotenv.js';
import { AppError } from '../../servers/Utils/AppError.js';

// Creates email options for sending with validation and Handlebars templating
export default function createMailOption({
  to,
  subject,
  name = 'User',
  email,
  message,
  hasButton = false,
  buttonText = '',
  buttonUrl = '',
  otp = null,
  isResetOtp = false,
  posts = [],
  supportEmail = 'inksha.official@gmail.com',
}) {
  try {
    // Validates required fields
    if (!to || !subject || (!message && posts.length === 0)) {
      throw new AppError(
        'Missing required fields',
        400,
        'CreateMailOption',
        'to, subject, and either message or posts are required'
      );
    }

    // Validates email formats
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new AppError(
        'Invalid recipient email',
        400,
        'CreateMailOption',
        'Recipient email must be a valid email address'
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SENDER_EMAIL)) {
      throw new AppError(
        'Invalid sender email',
        400,
        'CreateMailOption',
        'Sender email must be a valid email address'
      );
    }
    if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      throw new AppError(
        'Invalid support email',
        400,
        'CreateMailOption',
        'Support email must be a valid email address'
      );
    }

    // Validates button fields when hasButton is true
    if (hasButton && (!buttonText || !buttonUrl)) {
      throw new AppError(
        'Missing button fields',
        400,
        'CreateMailOption',
        'buttonText and buttonUrl are required when hasButton is true'
      );
    }

    // Validates button URL format
    if (buttonUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(buttonUrl)) {
      throw new AppError(
        'Invalid button URL',
        400,
        'CreateMailOption',
        'Button URL must be a valid HTTP/HTTPS URL'
      );
    }

    // Validates OTP format
    if (otp && !/^\d{6}$/.test(otp)) {
      throw new AppError(
        'Invalid OTP format',
        400,
        'CreateMailOption',
        'OTP must be a 6-digit number'
      );
    }

    // Selects appropriate template based on posts
    const templateSource = posts.length > 0 ? DAILY_POST_EMAIL_TEMPLATE : EMAIL_TEMPLATE;
    const template = Handlebars.compile(templateSource);

    // Renders HTML content using Handlebars
    const htmlContent = template({
      subject,
      name,
      message: message || '',
      hasButton,
      buttonText,
      buttonUrl,
      supportEmail,
      otp,
      isResetOtp,
      posts: posts.map((post, index) => ({
        title: post.title || 'Untitled',
        slug: post.slug || '',
        thumbnail: post.thumbnail || '',
        author: { name: post.author?.name || 'Unknown Author' },
        index: index + 1,
      })),
    });

    // Returns email options
    return {
      from: `"Inksha Official" <${SENDER_EMAIL}>`,
      to,
      subject,
      html: htmlContent,
    };
  } catch (error) {
    // AppError with context for creating mail options
    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || 'Failed to create mail options',
          500,
          'CreateMailOption',
          'Error in createMailOption'
        );
  }
}