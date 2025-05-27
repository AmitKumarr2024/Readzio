import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv.js";
import UserModel from "../Models/User.js";

export const protectedRoute = async (req, res, next) => {
  try {
    // ✅ First check Authorization header
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // ✅ Fallback to cookies if token not found in header
    if (!token) {
      token = req.cookies?.jwt;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized-No token Provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "Unauthorized-Token verification failed" });
    }

    const user = await UserModel.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in Protected Route Middleware:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
