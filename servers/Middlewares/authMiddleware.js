import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";

export const protectedRoute = async (req, res, next) => {
  try {
    if (
      req.path.startsWith("/public") ||
      req.path.match(/^\/comments\/[^/]+\/count$/)
    ) {
      console.log(
        "[ProtectedRoute] Bypassing auth for public route:",
        req.path
      );
      return next();
    }

    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = req.cookies?.jwt;
    }

    console.log("[ProtectedRoute] Cookie check:", {
      jwt: token ? "present" : "missing",
    });

    if (!token) {
      return next(
        new AppError(
          "Unauthorized - No token provided",
          401,
          "ProtectedRoute Middleware"
        )
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("[ProtectedRoute] Token decoded:", {
      userId: decoded.userId,
      role: decoded.role,
    });

    if (!decoded || !decoded.userId) {
      return next(
        new AppError(
          "Unauthorized - Invalid token: missing userId",
          401,
          "ProtectedRoute Middleware"
        )
      );
    }

    const user = await UserModel.findById(decoded.userId)
      .select("-password")
      .maxTimeMS(15000);
    if (!user) {
      return next(
        new AppError("User not found", 404, "ProtectedRoute Middleware")
      );
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[ProtectedRoute] Error:", error.message, {
      token: token?.slice(0, 10) + "...",
    });
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal Server Error",
            500,
            "ProtectedRoute Middleware"
          )
    );
  }
};
