import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";

export const protectedRoute = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      token = req.cookies?.jwt;
    }

    if (!token) {
      return next(new AppError("Unauthorized - No token provided", 401, "ProtectedRoute Middleware"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded) {
      return next(new AppError("Unauthorized - Token verification failed", 401, "ProtectedRoute Middleware"));
    }

    const user = await UserModel.findById(decoded.userId).select("-password");
    if (!user) {
      return next(new AppError("User not found", 404, "ProtectedRoute Middleware"));
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in Protected Route Middleware:", error.message);
    if (!(error instanceof AppError)) {
      return next(new AppError(error.message || "Internal Server Error", 500, "ProtectedRoute Middleware"));
    }
    next(error);
  }
};