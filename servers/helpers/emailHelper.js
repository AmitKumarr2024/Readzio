import Handlebars from "handlebars";
import {
  EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
} from "../../servers/config/emailTemplate.js";
import { DAILY_POST_EMAIL_TEMPLATE } from "../../servers/config/dailyPostEmailTemplate.js";
import { INVOICE_EMAIL_TEMPLATE } from "../../servers/config/emailTemplate.js";
import { SENDER_EMAIL } from "../../servers/config/dotenv.js";
import { AppError } from "../../servers/Utils/AppError.js";
import Bounce from "../../servers/Models/BounceModel.js";

export default async function createMailOption({
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
  customTemplate = null,
  customData = {},
}) {
  try {
    // Basic validation (keeping your original checks)
    if (!to) {
      throw new AppError(
        "Recipient email is required",
        400,
        "CreateMailOption"
      );
    }

    const normalizedTo = to.trim().toLowerCase();
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(normalizedTo)) {
      throw new AppError("Invalid email format", 400, "CreateMailOption");
    }

    // Check if email is suppressed (NEW - but simple)
    const isEmailSuppressed = await Bounce.isEmailSuppressed(normalizedTo);
    if (isEmailSuppressed) {
      throw new AppError(
        `Email ${normalizedTo} is suppressed due to previous bounces`,
        400,
        "CreateMailOption"
      );
    }

    // Your existing validation logic continues...
    if (!message && posts.length === 0 && !otp && !invoice && !customTemplate) {
      throw new AppError("Email content is required", 400, "CreateMailOption");
    }

    if (!SENDER_EMAIL) {
      throw new AppError(
        "Sender email not configured",
        500,
        "CreateMailOption"
      );
    }

    // Button validation (your existing logic)
    if (hasButton && (!buttonText || !buttonUrl)) {
      throw new AppError(
        "Button text and URL required when hasButton is true",
        400,
        "CreateMailOption"
      );
    }

    // OTP validation (your existing logic)
    if (otp && !/^\d{4,8}$/.test(otp)) {
      throw new AppError("Invalid OTP format", 400, "CreateMailOption");
    }

    // Process posts (enhanced but keeping your structure)
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

    // Your existing subject generation
    const sanitizedName = (name || "User").toString().trim();
    const brand = "inkshaa";

    let finalSubject = subject;
    if (!finalSubject) {
      if (processedPosts.length > 0) {
        const topPost = processedPosts[0];
        finalSubject = `${topPost.title.substring(
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

    // Your existing template selection
    let templateSource =
      customTemplate ||
      (processedPosts.length > 0
        ? DAILY_POST_EMAIL_TEMPLATE
        : invoice
        ? INVOICE_EMAIL_TEMPLATE
        : otp
        ? EMAIL_TEMPLATE
        : WELCOME_EMAIL_TEMPLATE);

    if (!templateSource) {
      throw new Error("No template source found");
    }

    // Compile template (your existing logic)
    const template = Handlebars.compile(templateSource);

    // Template data (enhanced but keeping your structure)
    const templateData = {
      subject: finalSubject,
      name: sanitizedName,
      message: message || "",
      invoice: invoice || null,
      hasButton: Boolean(hasButton),
      buttonText: buttonText || "",
      buttonUrl: buttonUrl || "",
      supportEmail: supportEmail || "support@inksha.com",
      otp: otp || null,
      isResetOtp: Boolean(isResetOtp),
      posts: processedPosts,
      brand,
      currentYear: new Date().getFullYear(),
      unsubscribeUrl: `https://inkshaa.onrender.com/unsubscribe?email=${encodeURIComponent(
        normalizedTo
      )}`,
      ...customData,
    };

    // Render HTML
    const htmlContent = template(templateData);
    if (!htmlContent || htmlContent.trim().length === 0) {
      throw new Error("Template rendered empty content");
    }

    // Create text version (simple)
    const textContent = htmlContent
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Your existing mail options structure (enhanced headers)
    const mailOptions = {
      from: `"${brand} Team" <${SENDER_EMAIL}>`,
      to: normalizedTo,
      subject: finalSubject,
      html: htmlContent,
      text: textContent,
      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        "X-Mailer": `${brand} Production Mailer v2.0`,
        "List-Unsubscribe": `<https://inkshaa.onrender.com/unsubscribe?email=${encodeURIComponent(
          normalizedTo
        )}>`,
        "Return-Path": SENDER_EMAIL,
        "Reply-To": supportEmail || SENDER_EMAIL,
      },
      messageId: `<${Date.now()}.${Math.random()
        .toString(36)
        .substring(2)}@inksha.com>`,
    };

    console.log(
      `✅ [EmailHelper] Created mail options for ${normalizedTo}: ${finalSubject}`
    );
    return mailOptions;
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
