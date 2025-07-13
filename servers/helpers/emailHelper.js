import Handlebars from 'handlebars';
import { EMAIL_TEMPLATE } from '../config/emailTemplate.js';
import { DAILY_POST_EMAIL_TEMPLATE } from '../config/dailyPostEmailTemplate.js';
import { SENDER_EMAIL } from '../config/dotenv.js';

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
  supportEmail = 'support@yourplatform.com',
}) {
  // Validation
  if (!to || !subject || (!message && posts.length === 0)) {
    throw new Error('to, subject, and either message or posts are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Invalid recipient email format');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SENDER_EMAIL)) {
    throw new Error('Invalid sender email format');
  }
  if (hasButton && (!buttonText || !buttonUrl)) {
    throw new Error('buttonText and buttonUrl are required when hasButton is true');
  }
  if (buttonUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(buttonUrl)) {
    throw new Error('Invalid button URL format');
  }
  if (otp && !/^\d{6}$/.test(otp)) {
    throw new Error('Invalid OTP format');
  }
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    throw new Error('Invalid support email format');
  }

  // Choose template based on whether posts are provided
  const templateSource = posts.length > 0 ? DAILY_POST_EMAIL_TEMPLATE : EMAIL_TEMPLATE;
  const template = Handlebars.compile(templateSource);

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
      title: post.title,
      slug: post.slug,
      thumbnail: post.thumbnail || '',
      author: { name: post.author?.name || 'Unknown Author' },
      index: index + 1,
    })),
  });

  // Log for debugging
  console.log('Rendered HTML for email to:', to);

  return {
    from: `"Mount Amit Team" <${SENDER_EMAIL}>`,
    to,
    subject,
    html: htmlContent,
  };
}