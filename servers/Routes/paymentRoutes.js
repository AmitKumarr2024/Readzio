// RazorpayRoutes.js
import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  bulkPayout,
  getAllPayments,
  createBankDetails,
  updateBankDetails,
  viewBankDetails,
  deleteBankDetails,
  handleRazorpayWebhook,
} from "../Controllers/paymentController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.post("/razorpay/order", protectedRoute, createRazorpayOrder);
router.post("/razorpay/verify", protectedRoute, verifyRazorpayPayment);
router.post("/razorpay/bulk-payout", protectedRoute, bulkPayout);
router.post("/bank-details", protectedRoute, createBankDetails);
router.patch("/bank-details/:id", protectedRoute, updateBankDetails);
router.get("/bank-details", protectedRoute, viewBankDetails);
router.delete("/bank-details/:id", protectedRoute, deleteBankDetails);
router.post("/razorpay/webhook", handleRazorpayWebhook);

export default router;