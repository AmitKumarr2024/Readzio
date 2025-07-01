import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/dotenv.js';

export const verifyToken = (token) => {
  console.log('[verifyToken] 🔒 Verifying token...');
  try {
    if (!token) throw new Error('No token provided');

    const rawDecoded = jwt.decode(token);
    console.log('[verifyToken] 🧾 Raw decoded payload:', rawDecoded);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[verifyToken] ✅ Verified token payload:', decoded);

    const userId = decoded._id || decoded.id || decoded.userId;
    const role = decoded.role;
    const isAdmin = decoded.isAdmin;

    if (!userId || !role) {
      throw new Error('Invalid token payload: missing userId or role');
    }

    console.log('[verifyToken] 🎯 Success:', { userId, role, isAdmin });
    return { userId: userId.toString(), role, isAdmin };
  } catch (err) {
    console.error('[verifyToken] ❌ Error:', { message: err.message });
    throw new Error(`Invalid token: ${err.message}`);
  }
};