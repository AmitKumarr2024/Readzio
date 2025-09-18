import Handlebars from "handlebars";
import {
  EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
} from "../../servers/config/emailTemplate.js";
import { DAILY_POST_EMAIL_TEMPLATE } from "../../servers/config/dailyPostEmailTemplate.js";
import { INVOICE_EMAIL_TEMPLATE } from "../../servers/config/emailTemplate.js";
import { SENDER_EMAIL } from "../../servers/config/dotenv.js";
import { AppError } from "../../servers/Utils/AppError.js";

/**
 * Production-ready email options generator with enhanced validation and error handling
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
  customTemplate = null,
  customData = {},
}) {
  try {
    // Enhanced validation with detailed error messages
    if (!to) {
      throw new AppError(
        "Recipient email is required",
        400,
        "CreateMailOption",
        "Parameter 'to' cannot be empty"
      );
    }

    if (!message && posts.length === 0 && !otp && !invoice && !customTemplate) {
      throw new AppError(
        "Email content is required",
        400,
        "CreateMailOption",
        "At least one of: message, posts, otp, invoice, or customTemplate must be provided"
      );
    }

    // Enhanced email validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(to.trim())) {
      throw new AppError(
        "Invalid recipient email format",
        400,
        "CreateMailOption",
        `Email '${to}' does not match required format`
      );
    }

    if (!SENDER_EMAIL || !emailRegex.test(SENDER_EMAIL)) {
      throw new AppError(
        "Invalid sender email configuration",
        500,
        "CreateMailOption",
        "SENDER_EMAIL environment variable is not properly configured"
      );
    }

    if (supportEmail && !emailRegex.test(supportEmail)) {
      throw new AppError(
        "Invalid support email format",
        400,
        "CreateMailOption",
        `Support email '${supportEmail}' is not valid`
      );
    }

    // Button validation
    if (hasButton) {
      if (!buttonText || buttonText.trim().length === 0) {
        throw new AppError(
          "Button text is required when hasButton is true",
          400,
          "CreateMailOption"
        );
      }
      if (!buttonUrl || !buttonUrl.trim()) {
        throw new AppError(
          "Button URL is required when hasButton is true",
          400,
          "CreateMailOption"
        );
      }
    }

    // URL validation
    if (buttonUrl) {
      const urlRegex =
        /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/;
      if (!urlRegex.test(buttonUrl)) {
        throw new AppError(
          "Invalid button URL format",
          400,
          "CreateMailOption",
          `URL '${buttonUrl}' is not a valid HTTP/HTTPS URL`
        );
      }
    }

    // OTP validation
    if (otp && !/^\d{4,8}$/.test(otp)) {
      throw new AppError(
        "Invalid OTP format",
        400,
        "CreateMailOption",
        "OTP must be 4-8 digits"
      );
    }

    // Posts validation
    if (posts && Array.isArray(posts)) {
      posts.forEach((post, index) => {
        if (!post || typeof post !== "object") {
          throw new AppError(
            `Invalid post at index ${index}`,
            400,
            "CreateMailOption",
            "Each post must be a valid object"
          );
        }
      });
    }

    // Sanitize and prepare data
    const sanitizedTo = to.trim().toLowerCase();
    const sanitizedName = (name || "User").toString().trim();
    const brand = "inkshaa";

    // Enhanced subject generation with better fallbacks
    let finalSubject = subject;
    if (!finalSubject || finalSubject.trim().length === 0) {
      const today = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (posts.length > 0) {
        const topPost = posts[0];
        const postTitle = topPost?.title
          ? topPost.title.substring(0, 40)
          : "Latest Posts";
        finalSubject = `${postTitle}... | ${brand} Daily Digest`;
      } else if (otp && isResetOtp) {
        finalSubject = `[${brand}] Password Reset Verification Code`;
      } else if (otp) {
        finalSubject = `[${brand}] Your Verification Code`;
      } else if (invoice) {
        const invoiceId = invoice.id || invoice.invoiceId || "Unknown";
        finalSubject = `[${brand}] Invoice #${invoiceId} - Payment Confirmation`;
      } else if (customTemplate) {
        finalSubject = `[${brand}] Important Update`;
      } else {
        finalSubject = `[${brand}] Notification`;
      }
    }

    // Template selection with error handling
    let templateSource;
    try {
      templateSource =
        customTemplate ||
        (posts.length > 0
          ? DAILY_POST_EMAIL_TEMPLATE
          : invoice
          ? INVOICE_EMAIL_TEMPLATE
          : otp
          ? EMAIL_TEMPLATE
          : WELCOME_EMAIL_TEMPLATE);

      if (!templateSource) {
        throw new Error("No template source found");
      }
    } catch (templateError) {
      throw new AppError(
        "Email template not found",
        500,
        "CreateMailOption",
        `Failed to load email template: ${templateError.message}`
      );
    }

    // Compile template with error handling
    let template;
    try {
      template = Handlebars.compile(templateSource);
    } catch (compileError) {
      throw new AppError(
        "Template compilation failed",
        500,
        "CreateMailOption",
        `Handlebars compilation error: ${compileError.message}`
      );
    }

    // Prepare posts data with validation and fallbacks
    const processedPosts = Array.isArray(posts)
      ? posts
          .map((post, index) => {
            if (!post || typeof post !== "object") {
              console.warn(`Invalid post at index ${index}, using fallback`);
              return {
                title: "Untitled Post",
                slug: "",
                thumbnail: "",
                author: { name: "Unknown Author", avatar: "" },
                readTime: "0 min",
                likesCount: 0,
                commentsCount: 0,
                index: index + 1,
              };
            }

            return {
              title: post.title || "Untitled Post",
              slug: post.slug || "",
              thumbnail: post.thumbnail || "",
              author: {
                name: post.author?.name || "Unknown Author",
                avatar: post.author?.avatar || "",
              },
              readTime: post.readTime || "0 min",
              likesCount:
                typeof post.likesCount === "number" ? post.likesCount : 0,
              commentsCount:
                typeof post.commentsCount === "number" ? post.commentsCount : 0,
              index: index + 1,
            };
          })
          .slice(0, 20)
      : []; // Limit to 20 posts max

    // Prepare template data with comprehensive fallbacks
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
      unsubscribeUrl: `https://inksha-uedq.onrender.com/unsubscribe?email=${encodeURIComponent(
        sanitizedTo
      )}`,
      ...customData, // Merge custom data
    };

    // Render HTML content with error handling
    let htmlContent;
    try {
      htmlContent = template(templateData);

      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error("Template rendered empty content");
      }
    } catch (renderError) {
      throw new AppError(
        "Template rendering failed",
        500,
        "CreateMailOption",
        `Failed to render email template: ${renderError.message}`
      );
    }

    // Create comprehensive mail options
    const mailOptions = {
      from: `"${brand} Team" <${SENDER_EMAIL}>`,
      to: sanitizedTo,
      subject: finalSubject,
      html: htmlContent,
      // Add text version for better deliverability
      text: htmlContent
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      // Enhanced headers for better deliverability
      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        "X-Mailer": `${brand} Production Mailer v2.0`,
        "List-Unsubscribe": `<https://inksha-uedq.onrender.com/unsubscribe?email=${encodeURIComponent(
          sanitizedTo
        )}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "Return-Path": SENDER_EMAIL,
        "Reply-To": supportEmail || SENDER_EMAIL,
      },
      // Add message metadata
      messageId: `<${Date.now()}.${Math.random()
        .toString(36)
        .substring(2)}@inksha.com>`,
    };

    // Validate final mail options
    if (!mailOptions.html || mailOptions.html.length < 50) {
      throw new AppError(
        "Generated email content is too short",
        500,
        "CreateMailOption",
        "Email HTML content appears to be malformed"
      );
    }

    console.log(
      `✅ [EmailHelper] Created mail options for ${sanitizedTo}: ${finalSubject}`
    );

    return mailOptions;
  } catch (error) {
    // Enhanced error logging for debugging
    console.error("❌ [EmailHelper] Error creating mail options:", {
      error: error.message,
      to,
      subject,
      hasOtp: Boolean(otp),
      hasPosts: posts?.length > 0,
      hasCustomTemplate: Boolean(customTemplate),
      stack: error.stack?.split("\n").slice(0, 3).join("\n"), // First 3 lines of stack
    });

    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || "Failed to create mail options",
          500,
          "CreateMailOption",
          "Unexpected error in createMailOption"
        );
  }
}
