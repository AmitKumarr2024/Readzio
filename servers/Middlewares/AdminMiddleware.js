import { AppError } from "../../servers/Utils/AppError.js";

// Restricts access to admin users only
export const adminOnly = (req, res, next) => {
  try {
    // Validates user presence
    if (!req.user) {
      throw new AppError(
        "Unauthorized",
        401,
        "AdminOnly",
        "No user found in request"
      );
    }

    // Validates admin role
    if (req.user.role !== "admin") {
      throw new AppError(
        "Forbidden",
        403,
        "AdminOnly",
        "User does not have admin role"
      );
    }

    // Proceeds if user is admin
    next();
  } catch (error) {
    // AppError with context for admin-only middleware
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to verify admin access",
            500,
            "AdminOnly",
            "Error in adminOnly middleware"
          )
    );
  }
};