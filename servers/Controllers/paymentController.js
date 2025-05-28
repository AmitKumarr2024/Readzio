import Razorpay from "razorpay";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import PaymentModel from "../Models/PaymentModel.js";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET, RAZORPAYX_ACCOUNT_NO } from "../config/dotenv.js";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// === 1. Create Razorpay Order & save in DB ===
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "INR", receipt, notes } = req.body;

  const options = {
    amount: amount * 100, // paise
    currency,
    receipt,
    payment_capture: 1,
    notes,
  };

  const order = await razorpay.orders.create(options);

  await PaymentModel.create({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: "created",
    receipt: order.receipt,
    notes: order.notes,
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

  const generated_signature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: "paid",
      }
    );

    res.status(200).json({
      success: true,
      message: "Payment verified and updated successfully",
    });
  } else {
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { status: "failed" }
    );

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

  if (!payouts || !Array.isArray(payouts) || payouts.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid or empty payouts array",
    });
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
          amount: amount * 100,
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

  res.status(200).json({ success: true, results });
});
