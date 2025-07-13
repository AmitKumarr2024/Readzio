import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError.js";
import { OAuth2Client } from "google-auth-library";
import {
  AUTO_EMAIL_DATE,
  GOOGLE_CLIENT_ID,
  SENDER_EMAIL,
} from "../config/dotenv.js";
import { recordActivity } from "../helpers/activityHelper.js";
import transporter from "../config/nodeMailer.js";
import createMailOption from "../helpers/emailHelper.js";
import { generateToken } from "../Utils/generateToken.js";
import UserLocation from "../Models/UserLocation.js";
import UserModel from "../Models/User.js";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const log = process.env.NODE_ENV === "production" ? () => {} : console.log;
const isAutoEmailDate = () => {
  const today = new Date();
  const autoEmailDate = parseInt(AUTO_EMAIL_DATE || "1", 10);
  return today.getDate() === autoEmailDate;
};

const emailQueue = [];
const processEmailQueue = async () => {
  while (emailQueue.length) {
    const { mailOption, userId } = emailQueue.shift();
    try {
      await sendEmailWithRetries(mailOption, userId);
    } catch (error) {
      emailQueue.push({ mailOption, userId });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

const sendEmailWithRetries = async (mailOption, userId, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      await transporter.sendMail(mailOption);
      await recordActivity({
        userId,
        action: "EMAIL_SENT",
        message: `Email sent to ${mailOption.to} after ${attempts} attempt(s)`,
      });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      await recordActivity({
        userId,
        action: "EMAIL_FAILED",
        message: `Email failed for ${mailOption.to} on attempt ${attempts}: ${error.message}`,
      });
      if (attempts < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * attempts ** 2)
        );
      }
    }
  }

  await recordActivity({
    userId,
    action: "EMAIL_FAILED_ALL_ATTEMPTS",
    message: `All ${attempts} email attempts failed for ${mailOption.to}: ${lastError.message}`,
  });
  throw new AppError(
    `Failed to send email after ${attempts} attempts: ${lastError.message}`,
    500,
    "SendEmailWithRetries"
  );
};

// Send OTP for email verification
export const sendVerifyOtp = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId)
      throw new AppError(
        "User ID is required",
        400,
        "SendVerifyOtp Controller"
      );

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError("User not found", 404, "SendVerifyOtp Controller");
    if (user.isAccountVerified)
      throw new AppError(
        "Account is already verified",
        400,
        "SendVerifyOtp Controller"
      );

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const mailOption = createMailOption({
      to: user.email,
      subject: "Account Verification OTP",
      name: user.name || "User",
      email: user.email,
      message: "Please use the following OTP to verify your email address.",
      otp,
      supportEmail: SENDER_EMAIL,
      isResetOtp: false, // Added for unified template
    });

    const emailResult = await sendEmailWithRetries(mailOption, user._id);
    user.emailAttempts = emailResult.attempts;
    user.emailStatus = "sent";
    await user.save();

    res
      .status(201)
      .json({ success: true, message: "Verification OTP sent to your email" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendVerifyOtp Controller")
    );
  }
};

// Verify email with OTP
export const verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      throw new AppError(
        "User ID and OTP are required",
        400,
        "VerifyEmail Controller"
      );

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError("User not found", 404, "VerifyEmail Controller");
    if (user.verifyOtp !== otp)
      throw new AppError("Invalid OTP", 401, "VerifyEmail Controller");
    if (user.verifyOtpExpireAt < Date.now())
      throw new AppError("OTP expired", 401, "VerifyEmail Controller");

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;
    await user.save();

    await recordActivity({
      userId: user._id,
      action: "EMAIL_VERIFIED",
      message: `User ${user.name} verified email from ${
        user.location || "unknown location"
      }`,
    });

    res
      .status(201)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "VerifyEmail Controller")
    );
  }
};

export const resetAccountVerification = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId)
      throw new AppError(
        "User ID is required",
        400,
        "ResetAccountVerification"
      );

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError("User not found", 404, "ResetAccountVerification");

    user.isAccountVerified = false;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Account verification reset" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ResetAccountVerification")
    );
  }
};

// Send OTP for password reset
export const sendResetOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      throw new AppError("Email is required", 400, "SendResetOtp Controller");

    const user = await UserModel.findOne({ email });
    if (!user)
      throw new AppError("User not found", 404, "SendResetOtp Controller");

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    console.log("Generated OTP:", otp); // Debug OTP
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const mailOption = createMailOption({
      to: user.email,
      subject: "Password Reset OTP",
      name: user.name || "User",
      email: user.email,
      message: "Please use the following OTP to reset your password.",
      otp,
      supportEmail: SENDER_EMAIL,
      isResetOtp: true,
    });

    console.log("Mail Option:", mailOption); // Debug mailOption
    const emailResult = await sendEmailWithRetries(mailOption, user._id);
    user.emailAttempts = emailResult.attempts;
    user.emailStatus = "sent";
    await user.save();

    res.status(201).json({
      success: true,
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendResetOtp Controller")
    );
  }
};

// authController.js (add to existing file)
export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new AppError(
        "Email and OTP are required",
        400,
        "VerifyResetOtp Controller"
      );
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404, "VerifyResetOtp Controller");
    }
    if (user.resetOtp !== otp) {
      throw new AppError("Invalid OTP", 401, "VerifyResetOtp Controller");
    }
    if (user.resetOtpExpireAt < Date.now()) {
      throw new AppError("OTP expired", 401, "VerifyResetOtp Controller");
    }
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "VerifyResetOtp Controller")
    );
  }
};

// Reset password with OTP

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      throw new AppError(
        "Email, OTP, and new password are required",
        400,
        "ResetPassword Controller"
      );
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404, "ResetPassword Controller");
    }
    if (user.resetOtp !== otp) {
      throw new AppError("Invalid OTP", 401, "ResetPassword Controller");
    }
    if (user.resetOtpExpireAt < Date.now()) {
      throw new AppError("OTP expired", 401, "ResetPassword Controller");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    await user.save();
    await recordActivity({
      userId: user._id,
      action: "PASSWORD_RESET",
      message: `User ${user.name} reset password from ${
        user.location || "unknown location"
      }`,
    });
    res
      .status(201)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ResetPassword Controller")
    );
  }
};

// Signup controller
export const Signup = async (req, res, next) => {
  const { fullName, email, password, sendEmail } = req.body;
  const geoLocation = req.geoLocation;

  try {
    if (!fullName || !email || !password) {
      throw new AppError("All fields are required", 400, "Signup Controller");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("Invalid email format", 400, "Signup Controller");
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new AppError(
        existingUser.authProvider === "google"
          ? "Email registered with Google. Use Google login."
          : "User with this email already exists",
        400,
        "Signup Controller"
      );
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
      emailStatus: "not_sent",
      stopEmailAttempts: false,
      isAccountVerified: false,
      location: geoLocation
        ? `${geoLocation.city}, ${geoLocation.country}`
        : "",
    });

    await newUser.save();

    if (geoLocation && newUser._id) {
      await UserLocation.create({
        userId: newUser._id,
        ip: geoLocation.ip,
        city: geoLocation.city,
        country: geoLocation.country,
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        timestamp: new Date(),
      });
    }

    if (
      (sendEmail === "true" || isAutoEmailDate()) &&
      !newUser.stopEmailAttempts
    ) {
      const mailOption = createMailOption({
        to: email,
        subject: "Welcome to Our Platform!",
        name: fullName,
        email,
        message: `Thank you for signing up! You're joining us from ${
          newUser.location || "an unknown location"
        }. We're excited to have you on board.`,
        hasButton: true,
        buttonText: "Get Started",
        buttonUrl: "https://localhost:5173/get-started", // Replace with your actual URL
      });
      try {
        const emailResult = await sendEmailWithRetries(mailOption, newUser._id);
        newUser.emailAttempts = emailResult.attempts;
        newUser.emailStatus = "sent";
      } catch (emailError) {
        newUser.emailAttempts = emailError.attempts || 3;
        newUser.emailStatus = "failed";
        newUser.emailLastError = emailError.message;
        newUser.stopEmailAttempts = true;
        await newUser.save();
        throw emailError;
      }
    } else {
      await recordActivity({
        userId: newUser._id,
        action: "EMAIL_SKIPPED",
        message: `Welcome email not sent for ${email}: sendEmail=${sendEmail}, autoEmailDate=${isAutoEmailDate()}`,
      });
    }

    await newUser.save();
    await recordActivity({
      userId: newUser._id,
      action: "SIGNED_UP",
      message: `User ${fullName} signed up from ${
        newUser.location || "unknown location"
      }`,
    });

    const token = generateToken(newUser, res);
    res.status(201).json({
      message: "User registered successfully",
      _id: newUser._id,
      fullName: newUser.name,
      email: newUser.email,
      role: newUser.role,
      location: newUser.location,
      isAccountVerified: newUser.isAccountVerified,
      token,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "Signup Controller")
    );
  }
};

// Login controller
export const Login = async (req, res, next) => {
  const { email, password } = req.body;
  const geoLocation = req.geoLocation;

  try {
    if (!email || !password) {
      throw new AppError(
        "Email and password are required",
        400,
        "Login Controller"
      );
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 400, "Login Controller");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 400, "Login Controller");
    }

    if (geoLocation) {
      user.location = `${geoLocation.city}, ${geoLocation.country}`;
      await UserLocation.create({
        userId: user._id,
        ip: geoLocation.ip,
        city: geoLocation.city,
        country: geoLocation.country,
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        timestamp: new Date(),
      });
      await user.save();
    }

    const token = generateToken(user, res);
    await recordActivity({
      userId: user._id,
      action: "LOGGED_IN",
      message: `User ${user.name} logged in from ${
        user.location || "unknown location"
      }`,
    });

    res.status(200).json({
      _id: user._id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      token,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "Login Controller")
    );
  }
};

// Logout controller
export const Logout = async (req, res, next) => {
  const geoLocation = req.geoLocation;

  try {
    if (req.user?._id) {
      await recordActivity({
        userId: req.user._id,
        action: "LOGGED_OUT",
        message: `User ${req.user.name} logged out from ${
          geoLocation
            ? `${geoLocation.city}, ${geoLocation.country}`
            : "unknown location"
        }`,
      });
    }

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "Logout Controller")
    );
  }
};

// CheckAuth controller
export const checkAuth = async (req, res, next) => {
  const geoLocation = req.geoLocation;

  try {
    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "CheckAuth Controller"
      );
    }

    const token = req.cookies.jwt;
    if (!token) {
      throw new AppError("No token found", 401, "CheckAuth Controller");
    }

    await recordActivity({
      userId: req.user._id,
      action: "CHECKED_AUTH",
      message: `User ${req.user.name} checked authentication status from ${
        geoLocation
          ? `${geoLocation.city}, ${geoLocation.country}`
          : "unknown location"
      }`,
    });

    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      location: req.user.location,
      token,
      isAccountVerified: req.user.isAccountVerified,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "CheckAuth Controller")
    );
  }
};

// Google Login controller
export const googleLogin = async (req, res, next) => {
  const { token, sendEmail } = req.body;
  const geoLocation = req.geoLocation;

  try {
    if (!token) {
      throw new AppError(
        "Google token is required",
        400,
        "Google Login Controller"
      );
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(
        "Invalid email from Google",
        400,
        "Google Login Controller"
      );
    }

    let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });
    let isNewUser = false;

    if (user) {
      if (user.authProvider === "local") {
        throw new AppError(
          "Email registered with password-based account. Use password login.",
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
        emailStatus: "not_sent",
        stopEmailAttempts: false,
        location: geoLocation
          ? `${geoLocation.city}, ${geoLocation.country}`
          : "",
      });
      isNewUser = true;
    }

    if (geoLocation && user._id) {
      await UserLocation.create({
        userId: user._id,
        ip: geoLocation.ip,
        city: geoLocation.city,
        country: geoLocation.country,
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        timestamp: new Date(),
      });
    }

    if (
      isNewUser &&
      (sendEmail === "true" || isAutoEmailDate()) &&
      !user.stopEmailAttempts
    ) {
      const mailOption = createMailOption({
        to: email,
        subject: "Welcome to Our Platform!",
        name: name || "User",
        email,
        message: `Thank you for signing up with Google! You're joining us from ${
          user.location || "an unknown location"
        }. We're excited to have you on board.`,
        hasButton: true,
        buttonText: "Get Started",
        buttonUrl: "https://localhost:5173/get-started", // Replace with your actual URL
      });

      try {
        const emailResult = await sendEmailWithRetries(mailOption, user._id);
        user.emailAttempts = emailResult.attempts;
        user.emailStatus = "sent";
      } catch (emailError) {
        user.emailAttempts = emailError.attempts || 3;
        user.emailStatus = "failed";
        user.emailLastError = emailError.message;
        user.stopEmailAttempts = true;
        await user.save();
        throw emailError;
      }
    } else if (isNewUser) {
      await recordActivity({
        userId: user._id,
        action: "EMAIL_SKIPPED",
        message: `Welcome email not sent for ${email}: sendEmail=${sendEmail}, autoEmailDate=${isAutoEmailDate()}`,
      });
    }

    if (isNewUser) await user.save();
    await recordActivity({
      userId: user._id,
      action: "GOOGLE_LOGGED_IN",
      message: `User ${user.name} logged in with Google from ${
        user.location || "unknown location"
      }`,
    });

    const jwtToken = generateToken(user, res);
    res.status(200).json({
      message: isNewUser
        ? "Google signup successful"
        : "Google login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        username: user.username,
        createdAt: user.createdAt,
        role: user.role,
        location: user.location,
      },
      token: jwtToken,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "Google Login Controller")
    );
  }
};

// Check Email Status controller
export const checkEmailStatus = async (req, res, next) => {
  const { email } = req.query;

  try {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(
        "Valid email is required",
        400,
        "CheckEmailStatus Controller"
      );
    }

    const user = await UserModel.findOne({ email }).select(
      "emailStatus emailAttempts emailLastError stopEmailAttempts name location"
    );
    if (!user) {
      throw new AppError("User not found", 404, "CheckEmailStatus Controller");
    }

    await recordActivity({
      userId: user._id,
      action: "CHECKED_EMAIL_STATUS",
      message: `User ${user.name} checked email status for ${email}`,
    });

    res.status(200).json({
      message: "Email status retrieved successfully",
      email,
      emailStatus: user.emailStatus,
      emailAttempts: user.emailAttempts,
      emailLastError: user.emailLastError || null,
      stopEmailAttempts: user.stopEmailAttempts || false,
      location: user.location,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "CheckEmailStatus Controller")
    );
  }
};

// Get All Email Statuses controller
export const getAllEmailStatuses = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      throw new AppError("Admin access required", 403, "GetAllEmailStatuses");
    }
    const { page = 1, limit = 10 } = req.query;
    const users = await UserModel.find()
      .select(
        "email emailStatus emailAttempts emailLastError stopEmailAttempts name location"
      )
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await UserModel.countDocuments();
    res.status(200).json({ users, total, page, limit });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetAllEmailStatuses")
    );
  }
};
