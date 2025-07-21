import { AppError } from "../../servers/Utils/AppError.js";

// Restricts access to specified roles
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Validates user and role
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        throw new AppError(
          "Forbidden",
          403,
          "RestrictTo",
          `User role '${req.user?.role || "none"}' not in allowed roles: ${allowedRoles.join(", ")}`
        );
      }

      next();
    } catch (error) {
      // AppError with context for role restriction
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to verify role access",
              403,
              "RestrictTo",
              "Error in restrictTo middleware"
            )
      );
    }
  };
};