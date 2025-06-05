import bcrypt from "bcryptjs";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { generateToken } from "../Utils/generateToken.js";
import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_ID } from "../config/dotenv.js";
import { recordActivity } from "../helpers/activityHelper.js";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const Signup = async (req, res, next) => {
  const { fullName, email, password } = req.body;

  try {
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
    });

    await newUser.save();
    generateToken(newUser._id, res);

    // Record signup activity
    await recordActivity({
      userId: newUser._id,
      action: "SIGNED_UP", // New enum value needed in ActivityModel
      message: `User ${fullName} signed up`,
    });

    res.status(201).json({
      message: "User registered successfully",
      _id: newUser._id,
      fullName: newUser.name,
      email: newUser.email,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Signup Controller"));
    }
    next(error);
  }
};

export const Login = async (req, res, next) => {
  const { email, password } = req.body;

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 400, "Login Controller");
    }

    const token = generateToken(user._id, res);

    // Record login activity
    await recordActivity({
      userId: user._id,
      action: "LOGGED_IN", // Matches existing enum in ActivityModel
      message: `User ${user.name} logged in`,
    });

    res.status(200).json({
      _id: user._id,
      fullName: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Login Controller"));
    }
    next(error);
  }
};

export const Logout = async (req, res, next) => {
  try {
    // Record logout activity if user is authenticated
    if (req.user?._id) {
      await recordActivity({
        userId: req.user._id,
        action: "LOGGED_OUT", // New enum value needed in ActivityModel
        message: `User ${req.user.name} logged out`,
      });
    }

    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Logout Controller"));
    }
    next(error);
  }
};

export const checkAuth = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError("Unauthorized - No user found", 401, "CheckAuth Controller");
    }

    // Record check auth activity (optional)
    await recordActivity({
      userId: req.user._id,
      action: "CHECKED_AUTH", // New enum value needed in ActivityModel
      message: `User ${req.user.name} checked authentication status`,
    });

    res.status(200).json(req.user);
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "CheckAuth Controller"));
    }
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  const { token } = req.body;

  try {
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
      });
      await user.save();
    }

    const jwtToken = generateToken(user._id, res);

    // Record Google login activity
    await recordActivity({
      userId: user._id,
      action: "GOOGLE_LOGGED_IN", // New enum value needed in ActivityModel
      message: `User ${user.name} logged in with Google`,
    });

    res.status(200).json({
      message: "Google login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        username: user.username,
        createdAt: user.createdAt,
      },
      token: jwtToken,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message, 500, "Google Login Controller"));
    }
    next(error);
  }
};