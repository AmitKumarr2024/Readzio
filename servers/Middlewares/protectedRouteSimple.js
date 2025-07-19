import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv.js";
import { AppError } from "../utils/AppError.js";

// Lightweight JWT verification middleware without DB lookup
export const protectedRouteSimple = (req, res, next) => {
  try {
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
        "ProtectedRouteSimple",
        "No JWT token provided in header or cookie"
      );
    }

    // Verifies token
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "ProtectedRouteSimple",
        "Invalid or expired JWT token"
      );
    }

    // Attaches decoded user data to request
    req.user = decoded; // { userId, role }
    next();
  } catch (error) {
    // AppError with context for simple protected route
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to verify session",
            401,
            "ProtectedRouteSimple",
            "Error in protectedRouteSimple middleware"
          )
    );
  }
};