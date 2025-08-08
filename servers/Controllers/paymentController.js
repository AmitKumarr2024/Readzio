import Razorpay from "razorpay";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from "../config/dotenv.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import axiosInstance from "../Utils/axiosInstance.js";
import { AppError } from "../../servers/Utils/AppError.js";
import PaymentModel from "../Models/PaymentModel.js";
import createMailOption from "../helpers/emailHelper.js";
import { sendEmailWithRetries } from "../helpers/sendEmailWithRetries.js";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const isRazorpayXMocked =
  !process.env.RAZORPAYX_KEY_ID || !process.env.RAZORPAYX_KEY_SECRET;

// Validates card details
const validateCardDetails = (cardDetails) => {
  const { cardName, card_number, expiry, cardType } = cardDetails || {};
  if (!cardName || !card_number || !expiry || !cardType)
    throw new AppError(
      "Incomplete card details: missing required fields",
      400,
      "ValidateCardDetails",
      "Missing card fields"
    );
  if (!/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(card_number))
    throw new AppError(
      "Invalid card number format (xxxx-xxxx-xxxx-xxxx)",
      400,
      "ValidateCardDetails",
      "Invalid card number"
    );
  if (!/^\d{2}\/\d{4}$/.test(expiry))
    throw new AppError(
      "Invalid expiry format (MM/YYYY)",
      400,
      "ValidateCardDetails",
      "Invalid expiry format"
    );
  if (!["Visa", "MasterCard", "Amex", "Discover"].includes(cardType))
    throw new AppError(
      "Invalid card type",
      400,
      "ValidateCardDetails",
      "Invalid card type"
    );
};

// Validates bank account details
const validateBankAccount = (bankAccount) => {
  const { name, account_number, ifsc_code } = bankAccount || {};
  if (!name || !account_number || !ifsc_code)
    throw new AppError(
      "Incomplete bank account details",
      400,
      "ValidateBankAccount",
      "Missing bank account fields"
    );
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code))
    throw new AppError(
      "Invalid IFSC code format",
      400,
      "ValidateBankAccount",
      "Invalid IFSC code"
    );
};

// Validates UPI ID
const validateUpiId = (upiId) => {
  if (!upiId || !/^[\w\.\-_]+@[\w]+$/.test(upiId))
    throw new AppError(
      "Invalid UPI ID format",
      400,
      "ValidateUpiId",
      "Invalid UPI ID"
    );
};

// Processes contact payload for RazorpayX
const processContact = async (name, email, contact) => {
  if (!name || !email || !contact)
    throw new AppError(
      "Name, email, and contact are required",
      400,
      "ProcessContact",
      "Missing contact fields"
    );
  const contactPayload = { name, email, contact, type: "vendor" };
  return await createContact(contactPayload);
};

// Creates contact in RazorpayX
export const createContact = asyncHandler(async (contactData) => {
  if (isRazorpayXMocked) {
    return {
      id: `mock_cont_${Date.now()}`,
      name: contactData.name,
      email: contactData.email,
      contact: contactData.contact,
      type: contactData.type,
      created_at: Math.floor(Date.now() / 1000),
    };
  }
  const response = await axiosInstance.post("/contacts", contactData, {
    headers: { "X-Api-Type": "razorpayX" },
  });
  return response.data;
});

// Creates fund account in RazorpayX
export const createFundAccount = asyncHandler(
  async (contact_id, fundAccountData) => {
    if (isRazorpayXMocked) {
      return {
        id: `mock_fa_${Date.now()}`,
        contact_id,
        account_type: fundAccountData.account_type,
        [fundAccountData.account_type === "bank_account"
          ? "bank_account"
          : fundAccountData.account_type === "card"
          ? "card"
          : "vpa"]:
          fundAccountData[
            fundAccountData.account_type === "bank_account"
              ? "bank_account"
              : fundAccountData.account_type === "card"
              ? "card"
              : "vpa"
          ],
        created_at: Math.floor(Date.now() / 1000),
      };
    }
    const response = await axiosInstance.post(
      "/fund_accounts",
      { contact_id, ...fundAccountData },
      { headers: { "X-Api-Type": "razorpayX" } }
    );
    return response.data;
  }
);

// Creates a Razorpay order
export const createRazorpayOrder = asyncHandler(async (req, res, next) => {
  const { amount, currency = "INR", receipt, notes } = req.body;
  const userId = req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized",
      401,
      "CreateRazorpayOrder",
      "User not authenticated"
    );

  // Validates required fields
  if (!amount || !receipt)
    throw new AppError(
      "Amount and receipt are required",
      400,
      "CreateRazorpayOrder",
      "Missing required fields"
    );

  // Validates amount range
  if (amount < 100 || amount > 1000000)
    throw new AppError(
      "Amount must be between ₹1 and ₹10,000 (in paise: 100–1000000)",
      400,
      "CreateRazorpayOrder",
      "Invalid amount"
    );

  // Checks for existing order
  const existingOrder = await PaymentModel.findOne({
    userId,
    receipt,
    status: { $in: ["created", "paid"] },
  });

  if (existingOrder) {
    return res.status(200).json({
      success: true,
      alreadyExists: true,
      order: {
        id: existingOrder.orderId,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        receipt: existingOrder.receipt,
        notes: existingOrder.notes,
      },
      message: "Order already exists for this receipt",
    });
  }

  try {
    const options = {
      amount,
      currency,
      receipt,
      payment_capture: 1,
      notes: notes || {},
    };

    // Creates order in Razorpay
    const order = await razorpay.orders.create(options);

    // Saves order to database
    await PaymentModel.create({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "created",
      receipt: order.receipt,
      notes: order.notes,
      userId,
      payoutDetails: undefined,
    });

    // Logs order creation activity
    await recordActivity({
      userId: userId.toString(),
      action: "CREATED_RAZORPAY_ORDER",
      message: `Created Razorpay order ${order.id} for amount ₹${(
        amount / 100
      ).toFixed(2)} ${currency}`,
    });

    res.status(200).json({
      success: true,
      order,
      amountInRupees: amount / 100,
      amountInPaise: amount,
      message: "Order created successfully",
    });
  } catch (err) {
    // AppError with context for order creation
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to create Razorpay order",
            500,
            "CreateRazorpayOrder",
            "Razorpay order creation failed"
          )
    );
  }
});

// Verifies Razorpay payment
export const verifyRazorpayPayment = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const userId = req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized",
      401,
      "VerifyRazorpayPayment",
      "User not authenticated"
    );

  // Validates required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    throw new AppError(
      "Order ID, payment ID, and signature are required",
      400,
      "VerifyRazorpayPayment",
      "Missing required fields"
    );

  // Verifies payment signature
  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    // Updates payment status to paid
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: "paid",
      }
    );

    // Logs payment verification activity
    await recordActivity({
      userId: userId.toString(),
      action: "VERIFIED_PAYMENT",
      message: `Verified payment ${razorpay_payment_id} for order ${razorpay_order_id}`,
    });

    res.status(200).json({
      success: true,
      message: "Payment verified and updated successfully",
    });
  } else {
    // Updates payment status to failed
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { status: "failed" }
    );

    // Logs failed verification activity
    await recordActivity({
      userId: userId.toString(),
      action: "FAILED_PAYMENT_VERIFICATION",
      message: `Failed to verify payment for order ${razorpay_order_id}`,
    });

    throw new AppError(
      "Invalid payment signature",
      400,
      "VerifyRazorpayPayment",
      "Signature verification failed"
    );
  }
});

// Creates bank details for payout
export const createBankDetails = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    contact,
    payoutMethod,
    bankAccount,
    cardDetails,
    upiId,
  } = req.body;
  const userId = req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized",
      401,
      "CreateBankDetails",
      "User not authenticated"
    );

  const contactData = await processContact(name, email, contact);
  const timestamp = Math.floor(Date.now() / 1000);
  let fundAccount = null;
  let bankMeta = {};

  // Initializes payment model if not exists
  let payment = await PaymentModel.findOne({
    userId,
    "payoutDetails.payoutMethod": { $exists: true },
  });
  if (!payment) {
    payment = new PaymentModel({
      userId,
      orderId: `mock_order_${Date.now()}`,
      amount: 0,
      currency: "INR",
      status: "created",
    });
  }

  if (payoutMethod === "bank") {
    validateBankAccount(bankAccount);
    const { name: accName, account_number, ifsc_code } = bankAccount || {};
    const { data: ifscInfo } = await axios
      .get(`https://ifsc.razorpay.com/${ifsc_code}`)
      .catch(() => {
        throw new AppError(
          "Invalid IFSC code",
          400,
          "CreateBankDetails",
          "Invalid IFSC code"
        );
      });
    fundAccount = await createFundAccount(contactData.id, {
      account_type: "bank_account",
      bank_account: { name: accName, account_number, ifsc: ifsc_code },
    });
    bankMeta = {
      bank: ifscInfo.BANK,
      branch: ifscInfo.BRANCH,
      address: ifscInfo.ADDRESS,
    };
    payment.payoutDetails = {
      payoutMethod: "bank",
      bank: {
        bankName: ifscInfo.BANK,
        branch: ifscInfo.BRANCH,
        ifsc: ifsc_code,
        accountNumber: account_number,
        bankAccountName: accName,
        name,
        email,
        contact,
        bankMeta,
      },
    };
  } else if (payoutMethod === "card") {
    validateCardDetails(cardDetails);
    const { cardName, card_number, expiry, cardType } = cardDetails || {};
    const last4 = card_number?.slice(-4);
    fundAccount = {
      id: payment.fundAccountId || `mock_card_fa_${Date.now()}`,
      contact_id: contactData.id,
      account_type: "card",
      card: { name: cardName, card_number: `xxxx-xxxx-xxxx-${last4}`, expiry },
      created_at: timestamp,
    };
    bankMeta = { cardBrand: cardType, last4, address: "N/A" };
    payment.payoutDetails = {
      payoutMethod: "card",
      card: {
        cardHolderName: cardName,
        cardNumberLast4: last4,
        cardType,
        expiryMonth: expiry.split("/")[0],
        expiryYear: expiry.split("/")[1],
        contact,
        email,
      },
    };
  } else if (payoutMethod === "upi") {
    validateUpiId(upiId);
    fundAccount = {
      id: payment.fundAccountId || `mock_upi_fa_${Date.now()}`,
      contact_id: contactData.id,
      account_type: "vpa",
      vpa: { address: upiId },
      created_at: timestamp,
    };
    bankMeta = { vpa: upiId, address: "Virtual Payment Address" };
    payment.payoutDetails = {
      payoutMethod: "upi",
      upi: {
        upiId,
        name,
        contact,
        email,
      },
    };
  } else {
    throw new AppError(
      "Invalid payout method",
      400,
      "CreateBankDetails",
      "Unsupported payout method"
    );
  }

  payment.contactId = contactData.id;
  payment.fundAccountId = fundAccount.id;
  await payment.save();

  // Logs payout details creation activity
  await recordActivity({
    userId: userId.toString(),
    action: "CREATED_PAYOUT_DETAILS",
    message: `Created ${payoutMethod} payout method`,
  });

  res.status(201).json({
    success: true,
    contactData,
    paymentId: payment._id,
    bankMeta,
    fundAccount,
  });
});

// Updates bank details for payout
export const updateBankDetails = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    contact,
    payoutMethod,
    bankAccount,
    cardDetails,
    upiId,
  } = req.body;
  const { id } = req.params;
  const userId = req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized",
      401,
      "UpdateBankDetails",
      "User not authenticated"
    );

  // Validates payment record
  const payment = await PaymentModel.findOne({ _id: id, userId });
  if (!payment)
    throw new AppError(
      "Payment record not found",
      404,
      "UpdateBankDetails",
      "Payment record does not exist"
    );

  const contactData = await processContact(name, email, contact);
  const timestamp = Math.floor(Date.now() / 1000);
  let fundAccount = null;
  let bankMeta = {};

  if (payoutMethod === "bank") {
    validateBankAccount(bankAccount);
    const { name: accName, account_number, ifsc_code } = bankAccount || {};
    const { data: ifscInfo } = await axios
      .get(`https://ifsc.razorpay.com/${ifsc_code}`)
      .catch(() => {
        throw new AppError(
          "Invalid IFSC code",
          400,
          "UpdateBankDetails",
          "Invalid IFSC code"
        );
      });
    fundAccount = await createFundAccount(contactData.id, {
      account_type: "bank_account",
      bank_account: { name: accName, account_number, ifsc: ifsc_code },
    });
    bankMeta = {
      bank: ifscInfo.BANK,
      branch: ifscInfo.BRANCH,
      address: ifscInfo.ADDRESS,
    };
    payment.payoutDetails = {
      payoutMethod: "bank",
      bank: {
        bankName: ifscInfo.BANK,
        branch: ifscInfo.BRANCH,
        ifsc: ifsc_code,
        accountNumber: account_number,
        bankAccountName: accName,
        name,
        email,
        contact,
        bankMeta,
      },
    };
  } else if (payoutMethod === "card") {
    validateCardDetails(cardDetails);
    const { cardName, card_number, expiry, cardType } = cardDetails || {};
    const last4 = card_number.slice(-4);
    fundAccount = {
      id: payment.fundAccountId || `mock_card_fa_${Date.now()}`,
      contact_id: contactData.id,
      account_type: "card",
      card: { name: cardName, card_number: `xxxx-xxxx-xxxx-${last4}`, expiry },
      created_at: timestamp,
    };
    bankMeta = { cardBrand: cardType, last4, address: "N/A" };
    payment.payoutDetails = {
      payoutMethod: "card",
      card: {
        cardHolderName: cardName,
        cardNumberLast4: last4,
        cardType,
        expiryMonth: expiry.split("/")[0],
        expiryYear: expiry.split("/")[1],
        contact,
        email,
      },
    };
  } else if (payoutMethod === "upi") {
    validateUpiId(upiId);
    fundAccount = {
      id: payment.fundAccountId || `mock_upi_fa_${Date.now()}`,
      contact_id: contactData.id,
      account_type: "vpa",
      vpa: { address: upiId },
      created_at: timestamp,
    };
    bankMeta = { vpa: upiId, address: "Virtual Payment Address" };
    payment.payoutDetails = {
      payoutMethod: "upi",
      upi: {
        upiId,
        name,
        contact,
        email,
      },
    };
  } else {
    throw new AppError(
      "Invalid payout method",
      400,
      "UpdateBankDetails",
      "Unsupported payout method"
    );
  }

  payment.contactId = contactData.id;
  payment.fundAccountId = fundAccount.id;
  await payment.save();

  // Logs payout details update activity
  await recordActivity({
    userId: userId.toString(),
    action: "UPDATED_PAYOUT_DETAILS",
    message: `Updated ${payoutMethod} payout method`,
  });

  res.status(200).json({
    success: true,
    contactData,
    paymentId: payment._id,
    bankMeta,
    fundAccount,
  });
});

// Views bank details for a user
export const viewBankDetails = asyncHandler(async (req, res, next) => {
  const userId = req.query.userId || req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized: User ID required",
      401,
      "ViewBankDetails",
      "User not authenticated"
    );

  // Fetches latest payment record with payout details
  const payment = await PaymentModel.findOne({
    userId,
    "payoutDetails.payoutMethod": { $exists: true },
  }).sort({ updatedAt: -1 });

  if (!payment || !payment.payoutDetails) {
    return res.status(200).json({
      success: true,
      bankDetails: null,
      message: "No bank details found for this user",
    });
  }

  const { payoutMethod, [payoutMethod]: payoutData = {} } =
    payment.payoutDetails;
  const baseCreatedAt = payment.updatedAt
    ? Math.floor(new Date(payment.updatedAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const contactData = {
    id: payment.contactId || `mock_cont_${Date.now()}`,
    name: payoutData.name || "N/A",
    email: payoutData.email || "N/A",
    contact: payoutData.contact || "N/A",
    type: "vendor",
    created_at: baseCreatedAt,
  };

  let fundAccount = {
    id: payment.fundAccountId || `mock_fa_${Date.now()}`,
    contact_id: payment.contactId || `mock_cont_${Date.now()}`,
    account_type: payoutMethod,
    created_at: baseCreatedAt,
  };

  let bankMeta = {};

  if (payoutMethod === "bank") {
    fundAccount.bank_account = {
      name: payoutData.bankAccountName || "N/A",
      account_number: payoutData.accountNumber || "N/A",
      ifsc: payoutData.ifsc || "N/A",
    };
    bankMeta = {
      bank: payoutData.bankMeta?.bank || payoutData.bankName || "Unknown",
      branch: payoutData.bankMeta?.branch || payoutData.branch || "Unknown",
      address: payoutData.bankMeta?.address || "Unknown",
    };
  } else if (payoutMethod === "card") {
    fundAccount.card = {
      name: payoutData.cardHolderName || "N/A",
      card_number: payoutData.cardNumberLast4
        ? `xxxx-xxxx-xxxx-${payoutData.cardNumberLast4}`
        : "N/A",
      expiry:
        payoutData.expiryMonth && payoutData.expiryYear
          ? `${payoutData.expiryMonth}/${payoutData.expiryYear}`
          : "N/A",
    };
    bankMeta = {
      cardBrand: payoutData.cardType || "Unknown",
      last4: payoutData.cardNumberLast4 || "N/A",
      address: "N/A",
    };
  } else if (payoutMethod === "upi") {
    fundAccount.vpa = { address: payoutData.upiId || "N/A" };
    bankMeta = {
      vpa: payoutData.upiId || "N/A",
      address: "Virtual Payment Address",
    };
  } else {
    throw new AppError(
      "Invalid payout method",
      400,
      "ViewBankDetails",
      "Unsupported payout method"
    );
  }

  res.status(200).json({
    success: true,
    bankDetails: {
      payoutMethod,
      contactData,
      fundAccount,
      bankMeta,
      paymentId: payment._id,
    },
    message: "Bank details fetched successfully",
  });
});

// Deletes bank details
export const deleteBankDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized",
      401,
      "DeleteBankDetails",
      "User not authenticated"
    );

  // Removes payout details
  const payment = await PaymentModel.findOneAndUpdate(
    { _id: id, userId },
    { $unset: { payoutDetails: "", contactId: "", fundAccountId: "" } },
    { new: true, runValidators: false }
  );
  if (!payment)
    throw new AppError(
      "Payment record not found",
      404,
      "DeleteBankDetails",
      "Payment record does not exist"
    );

  // Logs payout details deletion activity
  await recordActivity({
    userId: userId.toString(),
    action: "DELETED_PAYOUT_DETAILS",
    message: `Deleted payout method`,
  });

  res.status(200).json({ success: true, message: "Payout details deleted" });
});

// Processes bulk RazorpayX payouts
export const bulkPayout = asyncHandler(async (req, res, next) => {
  const { payouts } = req.body;
  const userId = req.user?._id;

  // Validates authentication
  if (!userId)
    throw new AppError(
      "Unauthorized",
      401,
      "BulkPayout",
      "User not authenticated"
    );

  // Validates payouts array
  if (!payouts || !Array.isArray(payouts) || payouts.length === 0)
    throw new AppError(
      "Invalid or empty payouts array",
      400,
      "BulkPayout",
      "Invalid payouts data"
    );

  const results = [];

  for (const payout of payouts) {
    try {
      let {
        name,
        email,
        contact,
        bankAccount,
        cardDetails,
        upiId,
        amount,
        currency = "INR",
        notes,
      } = payout;

      // Validates amount range
      if (!amount || amount < 100 || amount > 1000000)
        throw new AppError(
          "Amount must be between ₹1 and ₹10,000 (in paise: 100–1000000)",
          400,
          "BulkPayout",
          "Invalid amount"
        );

      // Fetches stored payout method if not provided
      if (!bankAccount && !cardDetails && !upiId) {
        const payment = await PaymentModel.findOne({
          userId,
          "payoutDetails.payoutMethod": { $exists: true },
        });
        if (!payment || !payment.payoutDetails)
          throw new AppError(
            "No payout method configured",
            400,
            "BulkPayout",
            "Missing payout method"
          );

        if (payment.payoutDetails.payoutMethod === "bank") {
          bankAccount = {
            name: payment.payoutDetails.bank.bankAccountName,
            account_number: payment.payoutDetails.bank.accountNumber,
            ifsc_code: payment.payoutDetails.bank.ifsc,
          };
          name = name || payment.payoutDetails.bank.name;
          email = email || payment.payoutDetails.bank.email;
          contact = contact || payment.payoutDetails.bank.contact;
        } else if (payment.payoutDetails.payoutMethod === "card") {
          cardDetails = {
            cardName: payment.payoutDetails.card.cardHolderName,
            card_number: `xxxx-xxxx-xxxx-${payment.payoutDetails.card.cardNumberLast4}`,
            expiry: `${payment.payoutDetails.card.expiryMonth}/${payment.payoutDetails.card.expiryYear}`,
            cardType: payment.payoutDetails.card.cardType,
          };
          name = name || payment.payoutDetails.card.cardHolderName;
          email = email || payment.payoutDetails.card.email;
          contact = contact || payment.payoutDetails.card.contact;
        } else if (payment.payoutDetails.payoutMethod === "upi") {
          upiId = payment.payoutDetails.upi.upiId;
          name = name || payment.payoutDetails.upi.name;
          email = email || payment.payoutDetails.upi.email;
          contact = contact || payment.payoutDetails.upi.contact;
        }
      }

      // Validates required fields
      if (
        !name ||
        !email ||
        !contact ||
        (!bankAccount && !cardDetails && !upiId)
      )
        throw new AppError(
          "Missing required payout fields",
          400,
          "BulkPayout",
          "Missing payout details"
        );

      const contactData = await processContact(name, email, contact);
      let fundAccount;

      if (bankAccount) {
        validateBankAccount(bankAccount);
        fundAccount = await createFundAccount(contactData.id, {
          account_type: "bank_account",
          bank_account: bankAccount,
        });
      } else if (cardDetails) {
        validateCardDetails(cardDetails);
        const last4 = cardDetails.card_number.slice(-4);
        fundAccount = {
          id: `mock_card_fa_${Date.now()}`,
          contact_id: contactData.id,
          account_type: "card",
          card: {
            name: cardDetails.cardName,
            card_number: `xxxx-xxxx-xxxx-${last4}`,
            expiry: cardDetails.expiry,
          },
          created_at: Math.floor(Date.now() / 1000),
        };
      } else if (upiId) {
        validateUpiId(upiId);
        fundAccount = {
          id: `mock_upi_fa_${Date.now()}`,
          contact_id: contactData.id,
          account_type: "vpa",
          vpa: { address: upiId },
          created_at: Math.floor(Date.now() / 1000),
        };
      }

      if (isRazorpayXMocked) {
        results.push({
          payout: {
            id: `mock_payout_${Date.now()}`,
            amount: amount * 100,
            currency,
            status: "queued",
            name,
          },
          status: "success",
          message: "Mocked payout",
        });
        continue;
      }

      // Processes payout via RazorpayX
      const payoutResponse = await axiosInstance.post(
        "/payouts",
        {
          account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER || "Unknown",
          fund_account_id: fundAccount.id,
          amount: amount * 100,
          currency,
          mode: "IMPS",
          purpose: "payout",
          queue_if_low_balance: true,
          notes,
        },
        { headers: { "X-Api-Type": "razorpayX" } }
      );

      // Saves payout to database
      await PaymentModel.create({
        userId,
        contactId: contactData.id,
        fundAccountId: fundAccount.id,
        payoutId: payoutResponse.data.id,
        amount: payoutResponse.data.amount,
        currency: payoutResponse.data.currency,
        status:
          payoutResponse.data.status === "processed" ? "processed" : "queued",
        notes,
      });

      // Logs payout processing activity
      await recordActivity({
        userId: userId.toString(),
        action: "PROCESSED_BULK_PAYOUT",
        message: `Processed ${payoutResponse.data.id} of ₹${
          amount / 100
        } ${currency} to ${name}`,
      });

      results.push({ payout: payoutResponse.data, status: "success" });
    } catch (error) {
      results.push({ payout, status: "failed", error: error.message });
    }
  }

  // Logs bulk payout attempt
  await recordActivity({
    userId: userId.toString(),
    action: "ATTEMPTED_BULK_PAYOUT",
    message: `Attempted bulk payout with ${payouts.length} transactions`,
  });

  res.status(200).json({ success: true, results });
});

// Retrieves all payment records
export const getAllPayments = asyncHandler(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  // Fetches payment records with pagination
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

// Handles Razorpay webhook events
// Handles Razorpay webhook events (including invoice email sending)

export const handleRazorpayWebhook = asyncHandler(async (req, res, next) => {
  const signature = req.headers["x-razorpay-signature"];
  const body = req.rawBody || JSON.stringify(req.body); // ensure rawBody middleware is used

  // ✅ Verify Razorpay webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature",
    });
  }

  const data = typeof body === "string" ? JSON.parse(body) : body;
  const event = data.event;
  const payload = data.payload;

  try {
    switch (event) {
      case "payment.captured": {
        const paymentEntity = payload.payment.entity;

        // ✅ Update payment status in DB
        const updatedPayment = await PaymentModel.findOneAndUpdate(
          { paymentId: paymentEntity.id },
          { status: "paid" },
          { new: true }
        );

        // 🧠 Fetch user from DB
        const user = await UserModel.findById(updatedPayment.userId);

        if (user && updatedPayment) {
          const invoiceId =
            "INV-" + updatedPayment._id.toString().slice(-6).toUpperCase();

          // 📧 Generate email options using existing utility
          const emailOptions = createMailOption({
            to: user.email,
            subject: "Your inkshaa Invoice Receipt",
            name: user.name,
            message: `Thank you for your payment. Here are your invoice details:\n\nInvoice ID: ${invoiceId}\nOrder ID: ${
              updatedPayment.orderId
            }\nAmount: ₹${(updatedPayment.amount / 100).toFixed(2)}`,
          });

          // 📤 Send invoice email with retries
          await sendEmailWithRetries(emailOptions, user._id, "subscription");
        }
        break;
      }

      case "payment.failed": {
        await PaymentModel.findOneAndUpdate(
          { orderId: payload.payment.entity.order_id },
          { status: "failed" }
        );
        break;
      }

      case "payout.processed": {
        await PaymentModel.findOneAndUpdate(
          { payoutId: payload.payout.entity.id },
          { status: "processed" }
        );
        break;
      }

      case "payout.queued": {
        await PaymentModel.findOneAndUpdate(
          { payoutId: payload.payout.entity.id },
          { status: "queued" }
        );
        break;
      }

      case "payout.rejected": {
        await PaymentModel.findOneAndUpdate(
          { payoutId: payload.payout.entity.id },
          { status: "rejected" }
        );
        break;
      }

      case "refund.processed": {
        await PaymentModel.findOneAndUpdate(
          { paymentId: payload.refund.entity.payment_id },
          { status: "refunded" }
        );
        break;
      }

      // Add more event types as needed

      default:
        break;
    }

    // 📝 Optional: Log webhook event activity
    await recordActivity({
      userId: user?._id || null,
      action: `RAZORPAY_WEBHOOK_${event}`,
      message: `Webhook event received: ${event}`,
    });

    res
      .status(200)
      .json({ success: true, message: "Webhook handled successfully" });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Webhook processing failed",
            500,
            "HandleRazorpayWebhook",
            "Unhandled Razorpay webhook error"
          )
    );
  }
});
