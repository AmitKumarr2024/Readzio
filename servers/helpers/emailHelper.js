import Handlebars from "handlebars";
import {
  EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  INVOICE_EMAIL_TEMPLATE,
} from "../config/emailTemplate.js";
import { DAILY_POST_EMAIL_TEMPLATE } from "../config/dailyPostEmailTemplate.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { AppError } from "../Utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file directly
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  console.log(`📄 Loading .env from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(
    "🌐 No .env found, relying on host-provided environment variables"
  );
}

// Fetch environment variables
const SENDER_EMAIL = process.env.SENDER_EMAIL;

/**
 * Creates the mail options for sending email via Resend
 * @param {Object} options
 * @returns {Object} { from, to, subject, html, text }
 */
export default async function createMailOption({
  to,
  subject,
  name = "User",
  message,
  hasButton = false,
  buttonText = "",
  buttonUrl = "",
  otp = null,
  isResetOtp = false,
  posts = [],
  supportEmail = "inksha.official@gmail.com",
  invoice = null,
  customTemplate = null,
  customData = {},
}) {
  try {
    if (!to)
      throw new AppError(
        "Recipient email is required",
        400,
        "CreateMailOption"
      );

    const normalizedTo = to.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedTo))
      throw new AppError("Invalid email format", 400, "CreateMailOption");

    if (!message && posts.length === 0 && !otp && !invoice && !customTemplate)
      throw new AppError("Email content is required", 400, "CreateMailOption");

    if (!SENDER_EMAIL)
      throw new AppError(
        "Sender email not configured",
        500,
        "CreateMailOption"
      );

    if (hasButton && (!buttonText || !buttonUrl))
      throw new AppError(
        "Button text and URL required when hasButton is true",
        400,
        "CreateMailOption"
      );

    if (otp && !/^\d{4,8}$/.test(otp))
      throw new AppError("Invalid OTP format", 400, "CreateMailOption");

    const processedPosts = Array.isArray(posts)
      ? posts.slice(0, 20).map((post, index) => ({
          title: post.title || "Untitled Post",
          slug: post.slug || "",
          thumbnail: post.thumbnail || "",
          author: {
            name: post.author?.name || "Unknown Author",
            avatar: post.author?.avatar || "",
          },
          readTime: post.readTime || "0 min",
          likesCount: typeof post.likesCount === "number" ? post.likesCount : 0,
          commentsCount:
            typeof post.commentsCount === "number" ? post.commentsCount : 0,
          index: index + 1,
        }))
      : [];

    const brand = "inkshaa";
    let finalSubject = subject || "";

    if (!finalSubject) {
      if (processedPosts.length > 0) {
        finalSubject = `${processedPosts[0].title.substring(
          0,
          40
        )}... | ${brand} Daily Digest`;
      } else if (otp && isResetOtp) {
        finalSubject = `[${brand}] Password Reset Verification Code`;
      } else if (otp) {
        finalSubject = `[${brand}] Your Verification Code`;
      } else {
        finalSubject = `[${brand}] Notification`;
      }
    }

    const templateSource =
      customTemplate ||
      (processedPosts.length > 0
        ? DAILY_POST_EMAIL_TEMPLATE
        : invoice
        ? INVOICE_EMAIL_TEMPLATE
        : otp
        ? EMAIL_TEMPLATE
        : WELCOME_EMAIL_TEMPLATE);

    if (!templateSource) throw new AppError("No template source found");

    const template = Handlebars.compile(templateSource);

    const templateData = {
      subject: finalSubject,
      name,
      message: message || "",
      invoice: invoice || null,
      hasButton: Boolean(hasButton),
      buttonText: buttonText || "",
      buttonUrl: buttonUrl || "",
      supportEmail: supportEmail || SENDER_EMAIL,
      otp: otp || null,
      isResetOtp: Boolean(isResetOtp),
      posts: processedPosts,
      brand,
      currentYear: new Date().getFullYear(),
      unsubscribeUrl: `https://readzio.com/unsubscribe?email=${encodeURIComponent(
        normalizedTo
      )}`,
      ...customData,
    };

    const htmlContent = template(templateData);
    if (!htmlContent || htmlContent.trim().length === 0)
      throw new AppError(
        "Template rendered empty content",
        500,
        "CreateMailOption"
      );

    const textContent = htmlContent
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      from: `"${brand} Team" <${SENDER_EMAIL}>`,
      to: normalizedTo,
      subject: finalSubject,
      html: htmlContent,
      text: textContent,
    };
  } catch (error) {
    console.error("❌ [EmailHelper] Error creating mail options:", {
      error: error.message,
      to,
      subject,
    });
    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || "Failed to create mail options",
          500,
          "CreateMailOption"
        );
  }
}
