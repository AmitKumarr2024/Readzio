import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv.js";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";

// Authenticates requests by verifying JWT and attaching user data
export const protectedRoute = async (req, res, next) => {
  try {
    // Bypasses auth for public routes
    if (
      req.path.startsWith("/public") ||
      req.path.match(/^\/comments\/[^/]+\/count$/)
    ) {
      return next();
    }

    // Retrieves token from header or cookie
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = req.cookies?.jwt;
    }

    // Validates token presence
    if (!token) {
      throw new AppError(
        "Unauthorized",
        401,
        "ProtectedRoute",
        "No JWT token provided in header or cookie"
      );
    }

    // Verifies token
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "ProtectedRoute",
        "Invalid or expired JWT token"
      );
    }

    // Fetches user from database
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

    // Attaches user data to request
    req.user = {
      ...user.toObject(),
      isAdmin: user.role === "admin",
    };

    next();
  } catch (error) {
    // AppError with context for protected route
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
