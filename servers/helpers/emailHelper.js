// servers/helpers/email/createMailOption.js
import {
  EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  INVOICE_EMAIL_TEMPLATE,
} from "../../servers/config/emailTemplate.js";
import { CLIENT_URL, SMTP_USER } from "../../servers/config/dotenv.js";
import { AppError } from "../../servers/Utils/AppError.js";
import handlebars from "handlebars";
import sanitizeHtml from "sanitize-html";
import BounceLog from "../../servers/Models/BounceModel.js";

// ✅ Simple, safe regexes
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https?:\/\/[^\s]+$/;

export default function createMailOption({
  to,
  subject,
  name = "User",
  otp,
  posts = [],
  templateType = "DEFAULT",
  templateData = {},
}) {
  if (!to || !emailRegex.test(to)) {
    throw new AppError("Invalid recipient email", 400);
  }

  const sanitizedTo = sanitizeHtml(to);

  // Pick template
  let template;
  switch (templateType) {
    case "WELCOME":
      template = WELCOME_EMAIL_TEMPLATE;
      break;
    case "INVOICE":
      template = INVOICE_EMAIL_TEMPLATE;
      break;
    default:
      template = EMAIL_TEMPLATE;
  }

  // Compile with Handlebars
  const compiledTemplate = handlebars.compile(template);

  const placeholders = {
    name: sanitizeHtml(name),
    otp: otp || "",
    subject: subject || "Notification from Inkshaa",
    posts: Array.isArray(posts) ? posts.slice(0, 20) : [],
    hasPosts: Array.isArray(posts) && posts.length > 0,
    hasButton: !!templateData.buttonText && !!templateData.buttonUrl,
    buttonText: templateData.buttonText || "View More",
    buttonUrl: urlRegex.test(templateData.buttonUrl || "")
      ? templateData.buttonUrl
      : `${CLIENT_URL}/posts`,
    unsubscribeUrl: `${CLIENT_URL}/unsubscribe?email=${encodeURIComponent(
      sanitizedTo
    )}`,
    ...templateData,
  };

  const html = `<html><body>${compiledTemplate(placeholders)}</body></html>`;

  // Cleaner text fallback
  const text = html
    .replace(/<\/?[^>]+(>|$)/g, " ") // remove tags
    .replace(/\s+/g, " ") // normalize spaces
    .trim();

  return {
    from: `"Inkshaa" <${SMTP_USER}>`, // ✅ must match Gmail SMTP_USER
    to: sanitizedTo,
    subject: placeholders.subject,
    text,
    html,
    // let Nodemailer auto-generate messageId
    headers: {
      "X-Inkshaa-Mailer": "Inkshaa-Mail-Service",
      // List-Unsubscribe can be added if using a proper email service
      // "List-Unsubscribe": `<${placeholders.unsubscribeUrl}>`,
    },
  };
}

// ✅ Bounce handling helpers
export async function logBounce(email, reason, messageId) {
  try {
    const log = new BounceLog({
      email,
      reason,
      messageId,
      timestamp: new Date(),
    });
    await log.save();
  } catch (err) {
    console.error("Error logging bounce:", err);
  }
}

export async function getBounceStats() {
  try {
    const stats = await BounceLog.aggregate([
      {
        $group: {
          _id: "$email",
          count: { $sum: 1 },
          reasons: { $addToSet: "$reason" },
          lastBounce: { $max: "$timestamp" },
        },
      },
    ]);

    return {
      totalBounces: stats.reduce((acc, s) => acc + s.count, 0),
      totalUniqueEmails: stats.length,
      details: stats,
    };
  } catch (err) {
    console.error("Error fetching bounce stats:", err);
    return { totalBounces: 0, totalUniqueEmails: 0, details: [] };
  }
}
