import nodemailer from "nodemailer";
import {
  SMTP_PASS,
  SMTP_USER,
  NODE_ENV,
  SENDER_EMAIL,
} from "../../servers/config/dotenv.js";

// Validate env variables
if (!SMTP_USER || !SMTP_PASS) {
  console.error("❌ Missing SMTP credentials:", {
    SMTP_USER: SMTP_USER ? "✅ Set" : "❌ Missing",
    SMTP_PASS: SMTP_PASS ? "✅ Set" : "❌ Missing",
  });
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined in .env");
}

// Create transporter with fallback configuration
const transporter = nodemailer.createTransport({
  // Use explicit host/port instead of service for better control
  host: "smtp.gmail.com",
  port: 587, // Use 587 for STARTTLS (more reliable than 465)
  secure: false, // false for 587, true for 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // Connection settings
  pool: true,
  maxConnections: 3, // Reduced from 5 to avoid Gmail limits
  maxMessages: 50, // Reduced from 100
  // TLS settings
  requireTLS: true,
  tls: {
    rejectUnauthorized: NODE_ENV === "production",
    ciphers: "SSLv3", // Better compatibility
    minVersion: "TLSv1.2",
  },
  // Shorter timeouts for faster failure detection
  connectionTimeout: 30000, // 30 seconds instead of 60
  socketTimeout: 30000,
  greetingTimeout: 15000, // 15 seconds instead of 30
  // Rate limiting (Gmail limits)
  rateDelta: 60000, // 1 minute instead of 20 seconds
  rateLimit: 10, // 10 emails per minute (safer for Gmail)
  // Debugging
  debug: NODE_ENV === "development",
  logger: NODE_ENV === "development",
  // Additional Gmail-specific settings
  authMethod: "PLAIN",
  name: "inkshaa", // HELO/EHLO name
});

// Enhanced connection verification with retry logic
const verifyConnection = async (maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 Attempting SMTP connection (${attempt}/${maxRetries})...`
      );

      const startTime = Date.now();
      await transporter.verify();
      const duration = Date.now() - startTime;

      console.log(`✅ SMTP Server connected successfully in ${duration}ms`);
      return true;
    } catch (error) {
      console.error(
        `❌ SMTP Connection Error (attempt ${attempt}/${maxRetries}):`,
        {
          message: error.message,
          code: error.code,
          command: error.command,
          errno: error.errno,
          syscall: error.syscall,
        }
      );

      // Specific error handling
      if (error.code === "EAUTH") {
        console.error(
          "🔑 Authentication failed - check your Gmail app password"
        );
        console.error(
          "💡 Make sure you're using an App Password, not your regular Gmail password"
        );
        break; // Don't retry auth errors
      } else if (error.code === "ENOTFOUND") {
        console.error(
          "🌐 DNS resolution failed - check your internet connection"
        );
        break; // Don't retry DNS errors
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") {
        console.error(
          "⏰ Connection timeout - this might be a network/firewall issue"
        );
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // Progressive delay
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      if (attempt === maxRetries) {
        if (NODE_ENV === "production") {
          console.error(
            "⚠️ Email service unavailable - continuing without email functionality"
          );
          return false;
        } else {
          console.error("💥 SMTP setup failed in development mode");
          // Don't throw in development to avoid crashing
          return false;
        }
      }
    }
  }
  return false;
};

// Test email function for debugging
export const testEmailConnection = async () => {
  try {
    const testEmail = {
      from: `"Inksha Test" <${SENDER_EMAIL}>`,
      to: SENDER_EMAIL, // Send to yourself for testing
      subject: "SMTP Test Email",
      text: "This is a test email to verify SMTP configuration.",
      html: "<p>This is a test email to verify SMTP configuration.</p>",
    };

    console.log("🧪 Sending test email...");
    const info = await transporter.sendMail(testEmail);

    console.log("✅ Test email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return true;
  } catch (error) {
    console.error("❌ Test email failed:", {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    return false;
  }
};

// Initialize connection verification
verifyConnection().then((success) => {
  if (success) {
    console.log("🚀 SMTP service ready");
  } else {
    console.log("⚠️ SMTP service unavailable");
  }
});

export default transporter;
