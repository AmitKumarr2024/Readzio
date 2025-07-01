import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/dotenv.js';

export const generateToken = (user, res) => {
  console.log('[generateToken] 🔑 Generating token:', { userId: user._id, role: user.role, isAdmin: user.isAdmin });

  if (!user?._id) {
    throw new Error('Invalid user: missing _id');
  }

  const role = user.role || 'user';
  const isAdmin = user.isAdmin || false;
  const token = jwt.sign(
    { userId: user._id.toString(), role, isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('jwt', token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  console.log('[generateToken] ✅ Token created:', { userId: user._id, role, isAdmin });
  return token;
};