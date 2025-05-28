// routes/paymentRoutes.js
import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  bulkPayout,
} from "../Controllers/paymentController.js";

const router = express.Router();

router.post("/razorpay/order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);
router.post("/razorpayx/bulk-payout", bulkPayout);

export default router;
