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

// Protected routes for Razorpay payment operations
// POST /razorpay/order - Creates a Razorpay order
router.post("/razorpay/order", protectedRoute, createRazorpayOrder);
// POST /razorpay/verify - Verifies a Razorpay payment
router.post("/razorpay/verify", protectedRoute, verifyRazorpayPayment);
// POST /razorpay/bulk-payout - Processes bulk payouts
router.post("/razorpay/bulk-payout", protectedRoute, bulkPayout);
// POST /bank-details - Creates bank details
router.post("/bank-details", protectedRoute, createBankDetails);
// PATCH /bank-details/:id - Updates bank details
router.patch("/bank-details/:id", protectedRoute, updateBankDetails);
// GET /records - Fetches bank details
router.get("/records", protectedRoute, viewBankDetails);
// DELETE /bank-details/:id - Deletes bank details
router.delete("/bank-details/:id", protectedRoute, deleteBankDetails);
// POST /razorpay/webhook - Handles Razorpay webhook events
router.post("/razorpay/webhook", handleRazorpayWebhook);

export default router;