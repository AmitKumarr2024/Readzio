import express from 'express';
import { protectedRoute } from '../Middlewares/authMiddleware.js';
import {
  checkAuth,
  googleLogin,
  Login,
  Logout,
  Signup,
  checkEmailStatus,
  getAllEmailStatuses,
  sendVerifyOtp,
  verifyEmail,
  sendResetOtp,
  resetPassword,
  verifyResetOtp,
  resetAccountVerification,
} from '../Controllers/authController.js';
import { geoLocationMiddleware } from '../Middlewares/geoLocationMiddleware.js';

const routes = express.Router();

// Public routes with geolocation tracking
// POST /signup - Registers a new user
routes.post('/signup', geoLocationMiddleware, Signup);
// POST /login - Authenticates a user
routes.post('/login', geoLocationMiddleware, Login);
// POST /logout - Logs out a user
routes.post('/logout', geoLocationMiddleware, Logout);
// POST /google-login - Authenticates via Google OAuth
routes.post('/google-login', geoLocationMiddleware, googleLogin);
// POST /send-verify-otp - Sends OTP for email verification
routes.post('/send-verify-otp', protectedRoute, sendVerifyOtp);
// POST /verify-email - Verifies email with OTP
routes.post('/verify-email', verifyEmail);
// POST /send-reset-otp - Sends OTP for password reset
routes.post('/send-reset-otp', sendResetOtp);
// POST /reset-password - Resets password with OTP
routes.post('/reset-password', resetPassword);
// POST /verify-reset-otp - Verifies password reset OTP
routes.post('/verify-reset-otp', verifyResetOtp);

// Protected routes
// GET /check - Verifies authentication status
routes.get('/check', protectedRoute, geoLocationMiddleware, checkAuth);
// POST /reset-verification - Resets account verification process
routes.post("/reset-verification", protectedRoute, resetAccountVerification);
// GET /check-email-status - Checks email status for the user
routes.get('/check-email-status', checkEmailStatus);
// GET /all-email-statuses - Fetches all email statuses (protected)
routes.get('/all-email-statuses', protectedRoute, getAllEmailStatuses);

export default routes;