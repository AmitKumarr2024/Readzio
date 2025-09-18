import nodemailer from "nodemailer";
import {
  SMTP_PASS,
  SMTP_USER,
  SENDGRID_API_KEY,
  NODE_ENV,
} from "../../servers/config/dotenv.js";

// Validate primary (Gmail) credentials
if (!SMTP_USER || !SMTP_PASS) {
  console.error("❌ SMTP_USER and SMTP_PASS must be defined in .env for Gmail");
  throw new Error("Gmail SMTP credentials missing");
}

// Primary transporter (Gmail)
const gmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS, // Gmail App Password
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 180_000,
  socketTimeout: 180_000,
  greetingTimeout: 90_000,
  rateDelta: 60_000,
  rateLimit: 10,
  debug: NODE_ENV === "development",
  logger: NODE_ENV === "development",
});

// Fallback transporter (SendGrid)
const sendgridTransporter = SENDGRID_API_KEY
  ? nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: SENDGRID_API_KEY,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 180_000,
      socketTimeout: 180_000,
      greetingTimeout: 90_000,
      rateDelta: 60_000,
      rateLimit: 100,
      debug: NODE_ENV === "development",
      logger: NODE_ENV === "development",
    })
  : null;

// Verify transporter with retries
const verifyWithRetry = async (transporter, retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await transporter.verify();
      console.log(`✅ SMTP Server (${transporter.options.host}) is ready`);
      return true;
    } catch (error) {
      console.error(
        `❌ SMTP Retry ${i + 1}/${retries} for ${transporter.options.host}:`,
        {
          message: error.message,
          code: error.code,
          command: error.command,
        }
      );
      if (i < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, i))
        );
      }
    }
  }
  console.warn(`⚠️ SMTP unavailable for ${transporter.options.host}`);
  return false;
};

// Choose transporter
const selectTransporter = async () => {
  const gmailAvailable = await verifyWithRetry(gmailTransporter);
  if (gmailAvailable) return gmailTransporter;

  if (sendgridTransporter) {
    const sendgridAvailable = await verifyWithRetry(sendgridTransporter);
    if (sendgridAvailable) return sendgridTransporter;
  }

  console.warn("⚠️ All SMTP services unavailable");
  return null;
};

const transporter = {
  sendMail: async (mailOptions) => {
    const activeTransporter = await selectTransporter();
    if (!activeTransporter) {
      throw new Error("No SMTP service available");
    }
    return activeTransporter.sendMail(mailOptions);
  },
  verify: async () => {
    const activeTransporter = await selectTransporter();
    return !!activeTransporter;
  },
};

export default transporter;
