import { verifyToken } from '../utils/verifyToken.js';

export const verifyUser = (req, res, next) => {
  try {
    const token =
      req.cookies.token || req.headers.authorization?.split(" ")[1];

    const decoded = verifyToken(token);

    // ✅ Set req.user with both _id and userId
    req.user = {
      _id: decoded.userId,        // ✅ So that req.user._id is defined
      userId: decoded.userId,     // keep existing support
      role: decoded.role,
      isAdmin: decoded.isAdmin,
    };

    next();
  } catch (err) {
    console.error("[verifyUser] ❌ Token verification failed:", err.message);
    res.status(401).json({ message: "Unauthorized: " + err.message });
  }
};
