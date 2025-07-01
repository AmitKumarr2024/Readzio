import express from 'express';
import { 
  getUserEarnings, 
  getAllUsersEarnings, 
  processBulkPayouts, 
  recordSubscriptionPayment, 
  recordAdsPayment 
} from '../Controllers/earningController.js';
import { protectedRoute } from '../Middlewares/authMiddleware.js';
import { adminOnly } from '../Middlewares/AdminMiddleware.js';

const router = express.Router();

// User routes
router.get('/earnings', protectedRoute, getUserEarnings);
router.post('/subscription', protectedRoute, recordSubscriptionPayment);
router.post('/ads', protectedRoute, recordAdsPayment);

// Admin routes
router.get('/admin/earnings', protectedRoute, adminOnly, getAllUsersEarnings);
router.post('/admin/payouts', protectedRoute, adminOnly, processBulkPayouts);

export default router;