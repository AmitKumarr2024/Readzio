import Handlebars from "handlebars";
import { EMAIL_TEMPLATE } from "../config/emailTemplate.js";
import { DAILY_POST_EMAIL_TEMPLATE } from "../config/dailyPostEmailTemplate.js";
import { INVOICE_EMAIL_TEMPLATE } from "../config/invoiceEmailTemplate.js"; // Optional, only if you use invoices
import { SENDER_EMAIL } from "../config/dotenv.js";
import { AppError } from "../../servers/Utils/AppError.js";

/**
 * Generates and returns email options for sending.
 */
export default function createMailOption({
  to,
  subject,
  name = "User",
  email,
  message,
  hasButton = false,
  buttonText = "",
  buttonUrl = "",
  otp = null,
  isResetOtp = false,
  posts = [],
  supportEmail = "inksha.official@gmail.com",
  invoice = null,
}) {
  try {
    // === Validation ===
    if (!to || (!message && posts.length === 0 && !otp && !invoice)) {
      throw new AppError(
        "Missing required fields",
        400,
        "CreateMailOption",
        "to, and either message, posts, otp, or invoice are required"
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(to)) {
      throw new AppError(
        "Invalid recipient email",
        400,
        "CreateMailOption",
        "Recipient email must be a valid email address"
      );
    }

    if (!emailRegex.test(SENDER_EMAIL)) {
      throw new AppError(
        "Invalid sender email",
        400,
        "CreateMailOption",
        "Sender email must be a valid email address"
      );
    }

    if (supportEmail && !emailRegex.test(supportEmail)) {
      throw new AppError(
        "Invalid support email",
        400,
        "CreateMailOption",
        "Support email must be a valid email address"
      );
    }

    if (hasButton && (!buttonText || !buttonUrl)) {
      throw new AppError(
        "Missing button fields",
        400,
        "CreateMailOption",
        "buttonText and buttonUrl are required when hasButton is true"
      );
    }

    if (buttonUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(buttonUrl)) {
      throw new AppError(
        "Invalid button URL",
        400,
        "CreateMailOption",
        "Button URL must be a valid HTTP/HTTPS URL"
      );
    }

    if (otp && !/^\d{6}$/.test(otp)) {
      throw new AppError(
        "Invalid OTP format",
        400,
        "CreateMailOption",
        "OTP must be a 6-digit number"
      );
    }

    // === Dynamic Subject Generation with Brand ===
    const brand = "Inksha";
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    if (!subject) {
      if (posts.length > 0) {
        subject = `[${brand}] Your Daily Digest – ${today}`;
      } else if (otp && isResetOtp) {
        subject = `[${brand}] Password Reset OTP`;
      } else if (otp) {
        subject = `[${brand}] Verification OTP`;
      } else if (invoice) {
        subject = `[${brand}] Invoice #${invoice.id || "N/A"}`;
      } else {
        subject = `[${brand}] Notification`;
      }
    }

    // === Template Selection ===
    const templateSource =
      posts.length > 0
        ? DAILY_POST_EMAIL_TEMPLATE
        : invoice
        ? INVOICE_EMAIL_TEMPLATE
        : EMAIL_TEMPLATE;

    const template = Handlebars.compile(templateSource);

    // === HTML Content Rendering ===
    const htmlContent = template({
      subject,
      name,
      message: message || "",
      invoice,
      hasButton,
      buttonText,
      buttonUrl,
      supportEmail,
      otp,
      isResetOtp,
      posts: posts.map((post, index) => ({
        title: post.title || "Untitled",
        slug: post.slug || "",
        thumbnail: post.thumbnail || "",
        author: { name: post.author?.name || "Unknown Author" },
        index: index + 1,
      })),
    });

    // === Return Final Email Options ===
    return {
      from: `"Inksha Official" <${SENDER_EMAIL}>`,
      to,
      subject,
      html: htmlContent,
    };
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || "Failed to create mail options",
          500,
          "CreateMailOption",
          "Error in createMailOption"
        );
  }
}
