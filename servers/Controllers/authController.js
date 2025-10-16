import bcrypt from "bcryptjs";
import { AppError } from "../../servers/Utils/AppError.js";
import { OAuth2Client } from "google-auth-library";
import {
  AUTO_EMAIL_DATE,
  GOOGLE_CLIENT_ID,
  // SENDER_EMAIL,
} from "../config/dotenv.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { generateToken } from "../Utils/generateToken.js";
import UserLocation from "../Models/UserLocation.js";
import UserModel from "../../servers/Models/User.js";
import mongoose from "mongoose";

import { sendEmail } from "../services/emailService.js";
import Handlebars from "handlebars";
import {
  WELCOME_EMAIL_TEMPLATE,
  EMAIL_TEMPLATE,
} from "../../servers/config/emailTemplate.js";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const log = process.env.NODE_ENV === "production" ? () => {} : console.log;

const renderTemplate = (template, data) => Handlebars.compile(template)(data);
const supportEmail = process.env.SENDER_EMAIL || "support@readzio.com";

// Sends OTP for email verification
export const sendVerifyOtp = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId)
      throw new AppError(
        "User ID is required",
        400,
        "SendVerifyOtp",
        "User ID missing"
      );

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "SendVerifyOtp",
        "User does not exist"
      );
    if (user.isAccountVerified)
      throw new AppError(
        "Account is already verified",
        400,
        "SendVerifyOtp",
        "Account already verified"
      );

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 60 * 60 * 1000; // 1 hour

    // reset email attempt metadata before sending
    user.stopEmailAttempts = false;
    user.emailStatus = "not_sent";
    user.emailAttempts = 0;
    await user.save();

    // send email
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Verify your Readzio account",
      html: renderTemplate(EMAIL_TEMPLATE, {
        subject: "Verify your Readzio account",
        name: user.name,
        message:
          "Your verification code is below. Enter it to confirm your email.",
        otp,
        isResetOtp: false,
        supportEmail,
        hasButton: false,
      }),
      type: "verification",
    });

    if (!emailResult.success) {
      // update user email metadata
      user.emailAttempts = (user.emailAttempts || 0) + 1;
      user.emailStatus = "failed";
      user.emailLastError = emailResult.error;
      await user.save();

      // respond with success of OTP creation but mention email issue or treat as error — here we'll return 201 but include warning
      return res.status(201).json({
        success: true,
        message:
          "Verification OTP generated and saved. Sending email failed, check emailLastError for details.",
      });
    }

    // success
    user.emailAttempts = (user.emailAttempts || 0) + 1;
    user.emailStatus = "sent";
    user.emailLastError = null;
    await user.save();

    res
      .status(201)
      .json({ success: true, message: "Verification OTP sent to your email" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "SendVerifyOtp",
            "Failed to send verification OTP"
          )
    );
  }
};

// Verifies email with OTP
export const verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      throw new AppError(
        "User ID and OTP are required",
        400,
        "VerifyEmail",
        "Missing required fields"
      );

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "VerifyEmail",
        "User does not exist"
      );
    if (user.verifyOtp !== otp)
      throw new AppError("Invalid OTP", 401, "VerifyEmail", "OTP is incorrect");
    if (user.verifyOtpExpireAt < Date.now())
      throw new AppError("OTP expired", 401, "VerifyEmail", "OTP has expired");

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
        : new AppError(
            error.message,
            500,
            "VerifyEmail",
            "Failed to verify email"
          )
    );
  }
};

// Resets account verification status
export const resetAccountVerification = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId)
      throw new AppError(
        "User ID is required",
        400,
        "ResetAccountVerification",
        "User ID missing"
      );

    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "ResetAccountVerification",
        "User does not exist"
      );

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
        : new AppError(
            error.message,
            500,
            "ResetAccountVerification",
            "Failed to reset account verification"
          )
    );
  }
};

// Sends OTP for password reset
export const sendResetOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      throw new AppError(
        "Email is required",
        400,
        "SendResetOtp",
        "Email missing"
      );

    const user = await UserModel.findOne({ email });
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "SendResetOtp",
        "User does not exist"
      );

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    log("Generated OTP:", otp);
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // reset email metadata
    user.stopEmailAttempts = false;
    user.emailStatus = "not_sent";
    user.emailAttempts = 0;
    await user.save();

    // send reset OTP email
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your Readzio password",
      html: renderTemplate(EMAIL_TEMPLATE, {
        subject: "Reset your Readzio password",
        name: user.name,
        message:
          "Use the code below to reset your password. If you didn't request this, ignore it.",
        otp,
        isResetOtp: true,
        supportEmail,
        hasButton: false,
      }),
      type: "reset",
    });

    if (!emailResult.success) {
      user.emailAttempts = (user.emailAttempts || 0) + 1;
      user.emailStatus = "failed";
      user.emailLastError = emailResult.error;
      await user.save();

      return res.status(201).json({
        success: true,
        message:
          "Password reset OTP generated and saved. Sending email failed, check emailLastError for details.",
      });
    }

    // mark sent
    user.emailAttempts = (user.emailAttempts || 0) + 1;
    user.emailStatus = "sent";
    user.emailLastError = null;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "SendResetOtp",
            "Failed to send password reset OTP"
          )
    );
  }
};

// Verifies password reset OTP
export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      throw new AppError(
        "Email and OTP are required",
        400,
        "VerifyResetOtp",
        "Missing required fields"
      );

    const user = await UserModel.findOne({ email });
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "VerifyResetOtp",
        "User does not exist"
      );
    if (user.resetOtp !== otp)
      throw new AppError(
        "Invalid OTP",
        401,
        "VerifyResetOtp",
        "OTP is incorrect"
      );
    if (user.resetOtpExpireAt < Date.now())
      throw new AppError(
        "OTP expired",
        401,
        "VerifyResetOtp",
        "OTP has expired"
      );

    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "VerifyResetOtp",
            "Failed to verify OTP"
          )
    );
  }
};

// Resets password using OTP
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      throw new AppError(
        "Email, OTP, and new password are required",
        400,
        "ResetPassword",
        "Missing required fields"
      );

    const user = await UserModel.findOne({ email });
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "ResetPassword",
        "User does not exist"
      );
    if (user.resetOtp !== otp)
      throw new AppError(
        "Invalid OTP",
        401,
        "ResetPassword",
        "OTP is incorrect"
      );
    if (user.resetOtpExpireAt < Date.now())
      throw new AppError(
        "OTP expired",
        401,
        "ResetPassword",
        "OTP has expired"
      );

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
        : new AppError(
            error.message,
            500,
            "ResetPassword",
            "Failed to reset password"
          )
    );
  }
};

// Handles user signup
export const Signup = async (req, res, next) => {
  const { fullName, email, password, sendEmail: sendEmailFlag } = req.body;
  const geoLocation = req.geoLocation;

  try {
    if (!fullName || !email || !password)
      return next(
        new AppError(
          "All fields are required",
          400,
          "Signup",
          "Missing required fields"
        )
      );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return next(
        new AppError(
          "Invalid email format",
          400,
          "Signup",
          "Invalid email format"
        )
      );
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser)
      return next(
        new AppError(
          existingUser.authProvider === "google"
            ? "Email registered with Google. Use Google login."
            : "User with this email already exists",
          400,
          "Signup",
          "Email already exists"
        )
      );

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      name: fullName,
      email: normalizedEmail,
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
        coordinates: {
          type: "Point",
          coordinates: [geoLocation.longitude, geoLocation.latitude],
        },
        timestamp: new Date(),
      });
    }

    // Reset email attempts before sending welcome email
    await UserModel.updateOne(
      { _id: newUser._id },
      { stopEmailAttempts: false, emailStatus: "not_sent", emailAttempts: 0 }
    );

    // Send welcome email optionally (based on request or default true)
    if (sendEmailFlag !== false) {
      try {
        const emailResult = await sendEmail({
          to: newUser.email,
          subject: "Welcome to Readzio 🎉",
          html: renderTemplate(WELCOME_EMAIL_TEMPLATE, {
            subject: "Welcome to Readzio 🎉",
            name: newUser.name,
            message: "We're excited to have you on board!",
            hasButton: true,
            buttonUrl: "https://readzio.com/dashboard",
            buttonText: "Get Started",
            supportEmail,
          }),
          type: "welcome",
        });

        if (!emailResult.success) {
          newUser.emailAttempts = (newUser.emailAttempts || 0) + 1;
          newUser.emailStatus = "failed";
          newUser.emailLastError = emailResult.error;
          await newUser.save();
        } else {
          newUser.emailAttempts = (newUser.emailAttempts || 0) + 1;
          newUser.emailStatus = "sent";
          newUser.emailLastError = null;
          await newUser.save();
        }
      } catch (emailError) {
        console.error("[Signup] Email error:", emailError.message);
        newUser.emailAttempts = emailError.attempts || 3;
        newUser.emailStatus = "failed";
        newUser.emailLastError = emailError.message;
        await newUser.save();
      }
    }

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
    console.error("[Signup] Error:", error.message);
    return next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "Signup", "Failed to register user")
    );
  }
};

// Handles user login
export const Login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      throw new AppError(
        "Email and password required",
        400,
        "Login",
        "Missing fields"
      );
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      "+password"
    );
    if (!user) {
      throw new AppError(
        "User not found",
        400,
        "Login",
        "Invalid email or password"
      );
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      throw new AppError(
        "Invalid credentials",
        400,
        "Login",
        "Incorrect password"
      );
    const token = generateToken(user, res);
    res.status(200).json({
      _id: user._id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("[Login] Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "Login", "Failed to log in")
    );
  }
};

// Handles user logout
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
        : new AppError(error.message, 500, "Logout", "Failed to log out")
    );
  }
};

// Checks user authentication status
export const checkAuth = async (req, res, next) => {
  const geoLocation = req.geoLocation;

  try {
    if (!req.user?._id)
      throw new AppError(
        "Unauthorized - No user found",
        401,
        "CheckAuth",
        "User not authenticated"
      );

    const token = req.cookies.jwt;
    if (!token)
      throw new AppError(
        "No token found",
        401,
        "CheckAuth",
        "Authentication token missing"
      );

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
        : new AppError(
            error.message,
            500,
            "CheckAuth",
            "Failed to check authentication"
          )
    );
  }
};

// Handles Google login
export const googleLogin = async (req, res, next) => {
  const { token, sendEmail: sendEmailFlag } = req.body;
  const geoLocation = req.geoLocation;

  try {
    if (!token)
      throw new AppError(
        "Google token is required",
        400,
        "GoogleLogin",
        "Google token missing"
      );

    log("[GoogleLogin] Verifying Google token");
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AppError(
        "Invalid email from Google",
        400,
        "GoogleLogin",
        "Invalid Google email"
      );

    log("[GoogleLogin] Finding or creating user for email:", email);

    // Check for existing user by googleId or email
    let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });
    let isNewUser = false;

    if (user) {
      // If user signed up with local password, block Google login
      if (user.authProvider === "local")
        throw new AppError(
          "Email registered with password-based account. Use password login.",
          400,
          "GoogleLogin",
          "Email conflict with local account"
        );

      // If user exists but doesn't have googleId, update it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create a new Google user
      log("[GoogleLogin] Creating new user");
      user = new UserModel({
        name: name || "Unnamed User",
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
      await user.save(); // Save before using _id
      isNewUser = true;
    }

    // Record user's location after ensuring user._id exists
    if (geoLocation && user._id) {
      await UserLocation.create({
        userId: user._id,
        ip: geoLocation.ip,
        city: geoLocation.city,
        country: geoLocation.country,
        coordinates: {
          type: "Point",
          coordinates: [geoLocation.longitude, geoLocation.latitude],
        },
        timestamp: new Date(),
      });
    }

    // Reset email attempts before sending welcome email
    await UserModel.updateOne(
      { _id: user._id },
      { stopEmailAttempts: false, emailStatus: "not_sent", emailAttempts: 0 }
    );

    // Send welcome email only for new users (if not explicitly disabled)
    if (isNewUser && sendEmailFlag !== false) {
      log("[GoogleLogin] Preparing welcome email for:", email);

      try {
        const emailResult = await sendEmail({
          to: email,
          subject: "Welcome to Readzio 🎉",
          html: renderTemplate(WELCOME_EMAIL_TEMPLATE, {
            subject: "Welcome to Readzio 🎉",
            name: name,
            message: "We're excited to have you on board!",
            hasButton: true,
            buttonUrl: "https://readzio.com/dashboard",
            buttonText: "Get Started",
            supportEmail,
          }),
          type: "welcome",
        });

        if (!emailResult.success) {
          log("[GoogleLogin] Email sending failed:", emailResult.error);
          user.emailAttempts = (user.emailAttempts || 0) + 1;
          user.emailStatus = "failed";
          user.emailLastError = emailResult.error;
          await user.save();
        } else {
          user.emailAttempts = (user.emailAttempts || 0) + 1;
          user.emailStatus = "sent";
          user.emailLastError = null;
          await user.save();
          log("[GoogleLogin] Welcome email sent to:", email);
        }
      } catch (emailError) {
        log("[GoogleLogin] Email sending failed:", emailError.message);
        user.emailAttempts = emailError.attempts || 3;
        user.emailStatus = "failed";
        user.emailLastError = emailError.message;
        await user.save();
      }
    }

    // Record login activity
    log("[GoogleLogin] Recording login activity for userId:", user._id);
    await recordActivity({
      userId: user._id,
      action: "GOOGLE_LOGGED_IN",
      message: `User ${user.name} logged in with Google from ${
        user.location || "unknown location"
      }`,
    });

    // Generate JWT
    log("[GoogleLogin] Generating JWT token");
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
    log("[GoogleLogin] Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "GoogleLogin",
            "Failed to process Google login"
          )
    );
  }
};

// Checks email status for a user
export const checkEmailStatus = async (req, res, next) => {
  const { email } = req.query;

  try {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AppError(
        "Valid email is required",
        400,
        "CheckEmailStatus",
        "Invalid email format"
      );

    const user = await UserModel.findOne({ email }).select(
      "emailStatus emailAttempts emailLastError stopEmailAttempts name location"
    );
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "CheckEmailStatus",
        "User does not exist"
      );

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
        : new AppError(
            error.message,
            500,
            "CheckEmailStatus",
            "Failed to retrieve email status"
          )
    );
  }
};

// Fetches email statuses for all users (admin only)
export const getAllEmailStatuses = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      throw new AppError(
        "Admin access required",
        403,
        "GetAllEmailStatuses",
        "Admin privileges required"
      );

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
        : new AppError(
            error.message,
            500,
            "GetAllEmailStatuses",
            "Failed to fetch email statuses"
          )
    );
  }
};

// Test endpoint to send welcome email
export const testWelcomeEmail = async (req, res, next) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) {
      throw new AppError(
        "User ID and email required",
        400,
        "TestWelcomeEmail",
        "Missing fields"
      );
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "TestWelcomeEmail",
        "User does not exist"
      );
    }

    // reset email attempts metadata
    await UserModel.updateOne(
      { _id: userId },
      { stopEmailAttempts: false, emailStatus: "not_sent", emailAttempts: 0 }
    );

    // send welcome email
    const emailResult = await sendEmail({
      to: email,
      subject: "Welcome to Readzio 🎉",
      html: renderTemplate(WELCOME_EMAIL_TEMPLATE, {
        subject: "Welcome to Readzio 🎉",
        name: user.name,
        message: "We're excited to have you on board!",
        hasButton: true,
        buttonUrl: "https://readzio.com/dashboard",
        buttonText: "Get Started",
        supportEmail,
      }),
    });

    // update DB based on send result
    await UserModel.updateOne(
      { _id: userId },
      {
        emailAttempts:
          (user.emailAttempts || 0) + (emailResult.success ? 1 : 1),
        emailStatus: emailResult.success ? "sent" : "failed",
        emailLastError: emailResult.success ? null : emailResult.error,
      }
    );

    res.status(200).json({
      success: emailResult.success,
      message: emailResult.success
        ? "Test welcome email sent"
        : "Test welcome email failed to send",
      error: emailResult.success ? null : emailResult.error,
    });
  } catch (error) {
    console.error("[TestWelcomeEmail] Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "TestWelcomeEmail",
            "Failed to send test email"
          )
    );
  }
};
