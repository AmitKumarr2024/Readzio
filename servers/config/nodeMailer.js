import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER, NODE_ENV, RESEND_API_KEY } from "../../servers/config/dotenv.js";

// Validate credentials
if (!SMTP_USER || !SMTP_PASS) {
  throw new Error("❌ SMTP_USER and SMTP_PASS must be defined");
}

// Try multiple Gmail configurations
const gmailConfigs = [
  // Config 1: Port 465 with SSL (most reliable on Render)
  {
    name: "Gmail SSL (465)",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 20000,
    socketTimeout: 20000,
    greetingTimeout: 10000,
  },

  // Config 2: Port 587 with STARTTLS
  {
    name: "Gmail STARTTLS (587)",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 20000,
    socketTimeout: 20000,
    greetingTimeout: 10000,
  },

  // Config 3: Gmail service shorthand
  {
    name: "Gmail Service",
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    greetingTimeout: 8000,
  },
  {
    host: "smtp.resend.com",
    port: 587,
    secure: false,
    auth: {
      user: "resend",
      pass: RESEND_API_KEY,
    },
  },
];

// Try each config until one works
const createTransporter = async () => {
  for (const config of gmailConfigs) {
    try {
      console.log(`🔄 Trying ${config.name}...`);

      const transporter = nodemailer.createTransporter({
        ...config,
        pool: true,
        maxConnections: 2,
        maxMessages: 20,
        debug: NODE_ENV === "development",
        logger: NODE_ENV === "development",
      });

      // Test the connection
      await transporter.verify();
      console.log(`✅ ${config.name} connected successfully!`);
      return transporter;
    } catch (error) {
      console.log(`❌ ${config.name} failed:`, error.code || error.message);
      continue;
    }
  }

  throw new Error("All Gmail configurations failed");
};

// Export the working transporter
let transporter;

try {
  transporter = await createTransporter();
} catch (error) {
  console.error("💥 Gmail SMTP completely blocked on this server");
  console.error(
    "💡 Consider using a free email service like Resend or SendGrid"
  );

  // Create a dummy transporter that logs instead of sending
  transporter = {
    sendMail: async (options) => {
      console.log("📧 [MOCK] Would send email to:", options.to);
      console.log("📧 [MOCK] Subject:", options.subject);
      return {
        messageId: `mock-${Date.now()}`,
        accepted: [options.to],
        rejected: [],
      };
    },
    verify: async () => Promise.resolve(true),
  };
}

export default transporter;
