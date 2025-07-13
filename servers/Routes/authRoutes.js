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

routes.post('/signup', geoLocationMiddleware, Signup);
routes.post('/login', geoLocationMiddleware, Login);
routes.post('/logout', geoLocationMiddleware, Logout);
routes.get('/check', protectedRoute, geoLocationMiddleware, checkAuth);
routes.post("/reset-verification", protectedRoute, resetAccountVerification);
routes.post('/google-login', geoLocationMiddleware, googleLogin);
routes.get('/check-email-status', checkEmailStatus);
routes.get('/all-email-statuses', protectedRoute, getAllEmailStatuses);
routes.post('/send-verify-otp', protectedRoute, sendVerifyOtp);
routes.post('/verify-email',  verifyEmail);
routes.post('/send-reset-otp', sendResetOtp);
routes.post('/reset-password', resetPassword);
routes.post('/verify-reset-otp', verifyResetOtp);
export default routes;