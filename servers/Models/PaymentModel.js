import mongoose from "mongoose";

// Defines schema for payment transactions
const paymentSchema = new mongoose.Schema(
  {
    // Optional user associated with the payment
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Unique order ID
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    // Optional payment ID from payment gateway
    paymentId: {
      type: String,
    },
    // Optional payment signature
    signature: {
      type: String,
    },
    // Type of payment (impression or click)
    type: {
      type: String,
      enum: ["impression", "click"],
      default: "impression",
    },
    // Payment amount
    amount: {
      type: Number,
      required: true,
    },
    // Currency code
    currency: {
      type: String,
      default: "INR",
    },
    // Payment status
    status: {
      type: String,
      enum: [
        "created",
        "paid",
        "failed",
        "payout_created",
        "payout_done",
        "payout_failed",
        "queued",
        "processed",
        "rejected",
        "refunded",
      ],
      default: "created",
    },
    // Optional receipt identifier
    receipt: {
      type: String,
    },
    // Flexible notes field
    notes: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Optional payout ID
    payoutId: {
      type: String,
    },
    // Optional contact ID
    contactId: {
      type: String,
      trim: true,
    },
    // Optional fund account ID
    fundAccountId: {
      type: String,
      trim: true,
    },
    // Payout method and details
    payoutDetails: {
      // Payment method (bank, card, upi)
      payoutMethod: {
        type: String,
        enum: ["bank", "card", "upi"],
        required: false,
      },
      // Bank payment details
      bank: {
        bankName: { type: String, trim: true },
        branch: { type: String, trim: true },
        ifsc: {
          type: String,
          trim: true,
          match: /^[A-Z]{4}0[A-Z0-9]{6}$/,
        },
        accountNumber: { type: String, trim: true },
        bankAccountName: { type: String, trim: true },
        email: { type: String, trim: true },
        contact: { type: String, trim: true },
        name: { type: String, trim: true },
        bankMeta: {
          bank: { type: String, trim: true },
          branch: { type: String, trim: true },
          address: { type: String, trim: true },
        },
      },
      // Card payment details
      card: {
        cardHolderName: { type: String, trim: true },
        cardNumberLast4: {
          type: String,
          trim: true,
          match: /^\d{4}$/,
        },
        cardType: {
          type: String,
          enum: ["Visa", "MasterCard", "Amex", "Discover"],
        },
        expiryMonth: {
          type: String,
          trim: true,
          match: /^(0[1-9]|1[0-2])$/,
        },
        expiryYear: {
          type: String,
          trim: true,
          match: /^\d{4}$/,
        },
        contact: { type: String, trim: true },
        email: { type: String, trim: true },
      },
      // UPI payment details
      upi: {
        upiId: {
          type: String,
          trim: true,
          match: /^[\w\.\-_]+@[\w]+$/,
        },
        name: { type: String, trim: true },
        contact: { type: String, trim: true },
        email: { type: String, trim: true },
      },
    },
    // Timestamp of payment creation
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for efficient querying
paymentSchema.index({ userId: 1, status: 1 }); // For user payment status queries
paymentSchema.index({ paymentId: 1 }); // For payment lookup
paymentSchema.index({ payoutId: 1 }); // For payout lookup
paymentSchema.index({ "payoutDetails.payoutMethod": 1 }); // For payout method queries

// Creates and exports the Payment model
const PaymentModel = mongoose.model("Payment", paymentSchema);
export default PaymentModel;