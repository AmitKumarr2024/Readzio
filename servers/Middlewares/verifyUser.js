import { verifyToken } from '../../servers/Utils/verifyToken.js';
import { AppError } from "../../servers/Utils/AppError.js";

// Verifies user token and attaches user data to request
export const verifyUser = (req, res, next) => {
  try {
    // Retrieves token from cookie or header
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    // Validates token presence
    if (!token) {
      throw new AppError(
        "Unauthorized",
        401,
        "VerifyUser",
        "No token provided in cookie or header"
      );
    }

    // Verifies token using utility function
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "VerifyUser",
        "Invalid or expired token"
      );
    }

    // Attaches user data to request
    req.user = {
      _id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role,
      isAdmin: decoded.isAdmin,
    };

    next();
  } catch (error) {
    // AppError with context for user verification
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to verify user",
            401,
            "VerifyUser",
            "Error in verifyUser middleware"
          )
    );
  }
};