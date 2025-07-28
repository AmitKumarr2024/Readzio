import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../servers/config/dotenv.js";
import logger from "../../servers/Utils/Logger.js";

export const verifyToken = (token) => {
  try {
    if (!token) throw new Error("No token provided");

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded._id || decoded.id || decoded.userId;
    const role = decoded.role;
    const isAdmin = decoded.isAdmin;

    if (!userId || !role) {
      throw new Error("Invalid token payload: missing userId or role");
    }

    return { userId: userId.toString(), role, isAdmin };
  } catch (err) {
    logger.error("[verifyToken]", { message: err.message, stack: err.stack });
    throw new Error(`Invalid token: ${err.message}`);
  }
};
