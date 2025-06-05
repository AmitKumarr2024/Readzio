import Razorpay from "razorpay";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import PaymentModel from "../Models/PaymentModel.js";
import {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAYX_KEY_ID,
  RAZORPAYX_KEY_SECRET,
  RAZORPAYX_ACCOUNT_NO,
} from "../config/dotenv.js";
import { recordActivity } from "../helpers/activityHelper.js";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// === 1. Create Razorpay Order & save in DB ===
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "INR", receipt, notes } = req.body;

  if (!req.user?._id) {
    throw new Error("Unauthorized - No user found");
  }

  if (!amount || !receipt) {
    throw new Error("Amount and receipt are required");
  }

  const options = {
    amount: amount * 100, // convert rupees to paise
    currency,
    receipt,
    payment_capture: 1,
    notes,
  };

  const order = await razorpay.orders.create(options);

  await PaymentModel.create({
    orderId: order.id,
    amount: order.amount, // in paise
    currency: order.currency,
    status: "created",
    receipt: order.receipt,
    notes: order.notes,
    userId: req.user._id,
  });

  // Record activity for order creation
  await recordActivity({
    userId: req.user._id.toString(),
    action: "CREATED_RAZORPAY_ORDER",
    message: `Created Razorpay order ${order.id} for amount ₹${amount} ${currency}`,
  });

  res.status(200).json({
    success: true,
    order,
    message: "Razorpay order created and stored successfully",
  });
});

// === 2. Verify Razorpay Payment Signature & update DB ===
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!req.user?._id) {
    throw new Error("Unauthorized - No user found");
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error("Order ID, payment ID, and signature are required");
  }

  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: "paid",
        // Do not overwrite userId unless needed
      }
    );

    // Record activity for payment verification
    await recordActivity({
      userId: req.user._id.toString(),
      action: "VERIFIED_PAYMENT",
      message: `Verified payment ${razorpay_payment_id} for order ${razorpay_order_id}`,
    });

    res.status(200).json({
      success: true,
      message: "Payment verified and updated successfully",
    });
  } else {
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { status: "failed" }
    );

    // Record activity for failed payment verification
    await recordActivity({
      userId: req.user._id.toString(),
      action: "FAILED_PAYMENT_VERIFICATION",
      message: `Failed to verify payment for order ${razorpay_order_id}`,
    });

    res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  }
});

// === Helper: Create Contact in RazorpayX ===
const createContact = async (contactData) => {
  const response = await axios.post(
    "https://api.razorpay.com/v1/contacts",
    contactData,
    {
      auth: {
        username: RAZORPAYX_KEY_ID,
        password: RAZORPAYX_KEY_SECRET,
      },
    }
  );
  return response.data;
};

// === Helper: Create Fund Account in RazorpayX ===
const createFundAccount = async (contact_id, bankAccount) => {
  const data = {
    contact_id,
    account_type: "bank_account",
    bank_account: bankAccount,
  };

  const response = await axios.post(
    "https://api.razorpay.com/v1/fund_accounts",
    data,
    {
      auth: {
        username: RAZORPAYX_KEY_ID,
        password: RAZORPAYX_KEY_SECRET,
      },
    }
  );
  return response.data;
};

// === 3. Bulk RazorpayX Payouts ===
export const bulkPayout = asyncHandler(async (req, res) => {
  const { payouts } = req.body;

  if (!req.user?._id) {
    throw new Error("Unauthorized - No user found");
  }

  if (!payouts || !Array.isArray(payouts) || payouts.length === 0) {
    throw new Error("Invalid or empty payouts array");
  }

  const results = [];

  for (const payout of payouts) {
    try {
      const {
        name,
        email,
        contact,
        bankAccount,
        amount,
        currency = "INR",
        notes,
      } = payout;

      if (!name || !email || !contact || !bankAccount || !amount) {
        throw new Error("Missing required payout fields");
      }

      // 1. Create Contact
      const createdContact = await createContact({
        name,
        email,
        contact,
        type: "employee",
        notes,
      });

      // 2. Create Fund Account
      const createdFundAccount = await createFundAccount(
        createdContact.id,
        bankAccount
      );

      // 3. Create Payout
      const payoutResponse = await axios.post(
        "https://api.razorpay.com/v1/payouts",
        {
          account_number: RAZORPAYX_ACCOUNT_NO,
          fund_account_id: createdFundAccount.id,
          amount: amount * 100, // convert rupees to paise
          currency,
          mode: "IMPS",
          purpose: "payout",
          queue_if_low_balance: true,
          notes,
        },
        {
          auth: {
            username: RAZORPAYX_KEY_ID,
            password: RAZORPAYX_KEY_SECRET,
          },
        }
      );

      // 4. Save payout record to DB
      await PaymentModel.create({
        contactId: createdContact.id,
        fundAccountId: createdFundAccount.id,
        payoutId: payoutResponse.data.id,
        amount: payoutResponse.data.amount,
        currency: payoutResponse.data.currency,
        status: payoutResponse.data.status,
        notes,
        userId: req.user._id,
      });

      // Record activity for each successful payout
      await recordActivity({
        userId: req.user._id.toString(),
        action: "PROCESSED_BULK_PAYOUT",
        message: `Processed payout ${payoutResponse.data.id} of ₹${amount} ${currency} to ${name}`,
      });

      results.push({
        payout: payoutResponse.data,
        status: "success",
      });
    } catch (error) {
      results.push({
        payout,
        status: "failed",
        error: error.response?.data || error.message,
      });
    }
  }

  // Record activity for bulk payout attempt
  await recordActivity({
    userId: req.user._id.toString(),
    action: "ATTEMPTED_BULK_PAYOUT",
    message: `Attempted bulk payout with ${payouts.length} transactions`,
  });

  res.status(200).json({ success: true, results });
});


// === 4. Get all payment records with optional filters and pagination ===
export const getAllPayments = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  // Optional filters by status, userId, type, date range
  if (req.query.status) {
    filter.status = req.query.status; // e.g. 'paid', 'failed', 'created'
  }
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  if (req.query.type) {
    filter.type = req.query.type; // if you have a "type" field in your PaymentModel
  }
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const totalRecords = await PaymentModel.countDocuments(filter);
  const records = await PaymentModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    page,
    limit,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    records,
  });
});
