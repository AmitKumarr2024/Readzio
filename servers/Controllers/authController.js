import bcrypt from "bcryptjs";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { OAuth2Client } from "google-auth-library";
import { AUTO_EMAIL_DATE, GOOGLE_CLIENT_ID} from "../config/dotenv.js";
import { recordActivity } from "../helpers/activityHelper.js";
import transporter from "../config/nodeMailer.js";
import createMailOption from "../helpers/emailHelper.js";
import { generateToken } from "../Utils/generateToken.js";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper function to check if today is the auto-email date
const isAutoEmailDate = () => {
  const today = new Date();
  const autoEmailDate = parseInt(AUTO_EMAIL_DATE || '1', 10);
  return today.getDate() === autoEmailDate;
};

// Helper function to send email with retries
const sendEmailWithRetries = async (mailOption, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log('[AuthController:sendEmailWithRetries] Attempting to send email', { to: mailOption.to, attempt: attempts });
      await transporter.sendMail(mailOption);
      console.log('[AuthController:sendEmailWithRetries] Email sent successfully', { to: mailOption.to, attempt: attempts });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      console.error('[AuthController:sendEmailWithRetries] Email sending failed', {
        to: mailOption.to,
        attempt: attempts,
        error: error.message,
        stack: error.stack,
        smtpConfig: {
          host: transporter.options.host,
          port: transporter.options.port,
          secure: transporter.options.secure,
          auth: transporter.options.auth ? { user: transporter.options.auth.user } : null,
        },
      });
      if (attempts < maxAttempts) {
        console.log('[AuthController:sendEmailWithRetries] Retrying email send', { to: mailOption.to, attempt: attempts + 1 });
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff: 1s, 2s, 3s
      }
    }
  }

  console.error('[AuthController:sendEmailWithRetries] All email attempts failed', { to: mailOption.to, attempts, lastError: lastError.message });
  return { success: false, attempts, lastError: lastError.message };
};

export const Signup = async (req, res, next) => {
  const { fullName, email, password, sendEmail } = req.body;

  try {
    console.log("[AuthController:Signup] Starting", { email, sendEmail });
    if (!fullName || !email || !password) {
      throw new AppError("All fields are required", 400, "Signup Controller");
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      if (existingUser.authProvider === "google") {
        throw new AppError(
          "This email is already registered with Google. Please log in using Google.",
          400,
          "Signup Controller"
        );
      } else {
        throw new AppError(
          "User with this email already exists",
          400,
          "Signup Controller"
        );
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new UserModel({
      name: fullName,
      email,
      password: hashedPassword,
      authProvider: "local",
      role: "user",
      emailAttempts: 0,
      emailStatus: 'not_sent',
    });

    await newUser.save();

    if (sendEmail === 'true' || isAutoEmailDate()) {
      const mailOption = createMailOption({
        to: email,
        subject: 'Welcome to Our Platform!',
        name: fullName || 'User',
        email,
        message: "Thank you for signing up! We're excited to have you on board.",
        hasButton: false,
      });
      console.log('[AuthController:Signup] Preparing to send welcome email', { mailOption, autoEmail: isAutoEmailDate() });

      const emailResult = await sendEmailWithRetries(mailOption);
      await UserModel.findByIdAndUpdate(newUser._id, {
        emailAttempts: emailResult.attempts,
        emailStatus: emailResult.success ? 'sent' : 'failed',
        emailLastError: emailResult.success ? null : emailResult.lastError,
      });

      if (!emailResult.success) {
        console.error('[AuthController:Signup] Email sending failed after 3 attempts', { email, attempts: emailResult.attempts, error: emailResult.lastError });
      }
    } else {
      console.log('[AuthController:Signup] Welcome email not sent', {
        reason: `sendEmail not true and not auto-email date (day ${new Date().getDate()})`,
        sendEmail,
      });
    }

    await recordActivity({
      userId: newUser._id,
      action: "SIGNED_UP",
      message: `User ${fullName} signed up`,
    });

    const token = generateToken(newUser, res);
    console.log("[AuthController:Signup] Success", { userId: newUser._id });

    const response = {
      message: "User registered successfully",
      _id: newUser._id,
      fullName: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token,
    };

    if (sendEmail === 'true' || isAutoEmailDate()) {
      if (!emailResult.success) {
        response.emailError = {
          userId: newUser._id,
          email,
          error: emailResult.lastError,
          attempts: emailResult.attempts,
        };
      }
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("[AuthController:Signup] Error:", { error: error.message, stack: error.stack });
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Signup Controller"));
    }
    next(error);
  }
};

export const Login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    console.log("[AuthController:Login] Starting", { email });
    if (!email || !password) {
      throw new AppError("Email and password are required", 400, "Login Controller");
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 400, "Login Controller");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 400, "Login Controller");
    }

    const token = generateToken(user, res);
    console.log("[AuthController:Login] Success", { userId: user._id });

    await recordActivity({
      userId: user._id,
      action: "LOGGED_IN",
      message: `User ${user.name} logged in`,
    });

    res.status(200).json({
      _id: user._id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("[AuthController:Login] Error:", { error: error.message, stack: error.stack });
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Login Controller"));
    }
    next(error);
  }
};

export const Logout = async (req, res, next) => {
  try {
    console.log("[AuthController:Logout] Starting", { userId: req.user?._id });
    if (req.user?._id) {
      await recordActivity({
        userId: req.user._id,
        action: "LOGGED_OUT",
        message: `User ${req.user.name} logged out`,
      });
    }

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    console.log("[AuthController:Logout] Success");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("[AuthController:Logout] Error:", { error: error.message, stack: error.stack });
    return next(new AppError(error.message, 500, "Logout Controller"));
  }
};

export const checkAuth = async (req, res, next) => {
  try {
    console.log("[AuthController:checkAuth] Starting", { userId: req.user?._id });
    if (!req.user?._id) {
      throw new AppError("Unauthorized - No user found", 401, "CheckAuth Controller");
    }

    const token = req.cookies.jwt;
    if (!token) {
      throw new AppError("No token found", 401, "CheckAuth Controller");
    }

    await recordActivity({
      userId: req.user._id,
      action: "CHECKED_AUTH",
      message: `User ${req.user.name} checked authentication status`,
    });

    console.log("[AuthController:checkAuth] Success", { userId: req.user._id });
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      token,
    });
  } catch (error) {
    console.error("[AuthController:checkAuth] Error:", { error: error.message, stack: error.stack });
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "CheckAuth Controller"));
    }
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  const { token, sendEmail } = req.body;

  try {
    console.log("[AuthController:googleLogin] Starting", { sendEmail });
    if (!token) {
      throw new AppError("Google token is required", 400, "Google Login Controller");
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });

    let isNewUser = false;
    if (user) {
      if (user.authProvider === "local") {
        throw new AppError(
          "This email is registered with a password-based account. Please log in with your password or link your Google account.",
          400,
          "Google Login Controller"
        );
      }
    } else {
      user = new UserModel({
        name: name || "Unnamed Author",
        email,
        googleId,
        avatar: picture,
        username: email.split("@")[0],
        authProvider: "google",
        role: "user",
        emailAttempts: 0,
        emailStatus: 'not_sent',
      });
      await user.save();
      isNewUser = true;
    }

    if (isNewUser && (sendEmail === 'true' || isAutoEmailDate())) {
      const mailOption = createMailOption({
        to: email,
        subject: 'Welcome to Our Platform!',
        name: name || 'User',
        email,
        message: "Thank you for signing up with Google! We're excited to have you on board.",
        hasButton: false,
      });
      console.log('[AuthController:googleLogin] Preparing to send welcome email', { mailOption, autoEmail: isAutoEmailDate() });

      const emailResult = await sendEmailWithRetries(mailOption);
      await UserModel.findByIdAndUpdate(user._id, {
        emailAttempts: emailResult.attempts,
        emailStatus: emailResult.success ? 'sent' : 'failed',
        emailLastError: emailResult.success ? null : emailResult.lastError,
      });

      if (!emailResult.success) {
        console.error('[AuthController:googleLogin] Email sending failed after 3 attempts', { email, attempts: emailResult.attempts, error: emailResult.lastError });
      }
    } else if (isNewUser) {
      console.log('[AuthController:googleLogin] Welcome email not sent', {
        reason: `sendEmail not true and not auto-email date (day ${new Date().getDate()})`,
        sendEmail,
      });
    }

    const jwtToken = generateToken(user, res);
    console.log("[AuthController:googleLogin] Success", { userId: user._id });

    await recordActivity({
      userId: user._id,
      action: "GOOGLE_LOGGED_IN",
      message: `User ${user.name} logged in with Google`,
    });

    const response = {
      message: isNewUser ? "Google signup successful" : "Google login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        username: user.username,
        createdAt: user.createdAt,
        role: user.role,
      },
      token: jwtToken,
    };

    if (isNewUser && (sendEmail === 'true' || isAutoEmailDate())) {
      if (!emailResult.success) {
        response.emailError = {
          userId: user._id,
          email,
          error: emailResult.lastError,
          attempts: emailResult.attempts,
        };
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("[AuthController:googleLogin] Error:", { error: error.message, stack: error.stack });
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Google Login Controller"));
    }
    next(error);
  }
};