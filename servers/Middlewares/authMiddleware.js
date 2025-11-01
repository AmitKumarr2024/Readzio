// servers/Middlewares/authMiddleware.js

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv.js";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";

// Existing protectedRoute middleware (keep as is)
export const protectedRoute = async (req, res, next) => {
  try {
    if (
      req.path.startsWith("/public") ||
      req.path.match(/^\/comments\/[^/]+\/count$/)
    ) {
      return next();
    }

    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = req.cookies?.jwt;
    }

    if (!token) {
      throw new AppError(
        "Unauthorized",
        401,
        "ProtectedRoute",
        "No JWT token provided in header or cookie"
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "ProtectedRoute",
        "Invalid or expired JWT token"
      );
    }

    const user = await UserModel.findById(decoded.userId)
      .select("-password")
      .maxTimeMS(15000);
    if (!user) {
      throw new AppError(
        "Not found",
        404,
        "ProtectedRoute",
        "User associated with token does not exist"
      );
    }

    req.user = {
      ...user.toObject(),
      isAdmin: user.role === "admin",
    };

    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to authenticate request",
            500,
            "ProtectedRoute",
            "Error in protectedRoute middleware"
          )
    );
  }
};

// ✅ NEW: Optional authentication middleware
// Attaches user if token is valid, but continues even if no token or invalid token
export const optionalAuth = async (req, res, next) => {
  try {
    // Get token from multiple sources
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log("[optionalAuth] Token from Authorization header");
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
      console.log("[optionalAuth] Token from cookie");
    }

    console.log("[optionalAuth] Token present:", !!token);

    // If no token, continue as guest
    if (!token) {
      console.log("[optionalAuth] No token - continuing as guest");
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("[optionalAuth] Token decoded:", decoded);

      if (decoded && decoded.userId) {
        const user = await UserModel.findById(decoded.userId)
          .select("-password")
          .maxTimeMS(15000);

        if (user) {
          req.user = {
            ...user.toObject(),
            isAdmin: user.role === "admin",
          };
          console.log(
            "[optionalAuth] ✅ User authenticated:",
            user._id.toString(),
            user.email
          );
        } else {
          console.log(
            "[optionalAuth] ❌ User not found for ID:",
            decoded.userId
          );
        }
      }
    } catch (tokenError) {
      // Token is invalid or expired, but we continue as guest
      console.log(
        "[optionalAuth] Token verification failed:",
        tokenError.message
      );
    }

    // Always continue to next middleware, even if token is invalid
    next();
  } catch (error) {
    console.error("[optionalAuth] Unexpected error:", error);
    // Even on unexpected errors, continue as guest
    next();
  }
};
