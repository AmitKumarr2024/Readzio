// routes/paymentRoutes.js
import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  bulkPayout,
  getAllPayments,
} from "../Controllers/paymentController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.post("/razorpay/order",protectedRoute, createRazorpayOrder);
router.post("/razorpay/verify",protectedRoute, verifyRazorpayPayment);
router.post("/razorpayx/bulk-payout",protectedRoute, bulkPayout);
router.get("/razorpay/records", protectedRoute, getAllPayments);

export default router;
