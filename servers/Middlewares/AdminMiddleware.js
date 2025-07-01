import { AppError } from "../utils/AppError.js";

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    console.error('[AdminOnlyMiddleware] ❌ No user in request');
    return next(new AppError("Unauthorized", 401, "AdminMiddleware"));
  }

  console.log('[AdminOnlyMiddleware] Checking admin role:', { userId: req.user._id, role: req.user.role });

  if (req.user.role !== "admin") {
    console.error('[AdminOnlyMiddleware] ❌ Access denied: Not admin');
    return next(new AppError("Admin access only", 403, "AdminMiddleware"));
  }

  console.log('[AdminOnlyMiddleware] ✅ Admin access granted');
  next();
};
