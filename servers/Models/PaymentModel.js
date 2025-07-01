// Models/PaymentModel.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
    },
    signature: {
      type: String,
    },
    type: {
      type: String,
      enum: ["impression", "click"],
      default: "impression",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
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
    receipt: {
      type: String,
    },
    notes: {
      type: mongoose.Schema.Types.Mixed,
    },
    payoutId: {
      type: String,
    },
    contactId: {
      type: String,
      trim: true,
    },
    fundAccountId: {
      type: String,
      trim: true,
    },
    payoutDetails: {
      payoutMethod: {
        type: String,
        enum: ["bank", "card", "upi"],
        required: false, // Make optional
      },
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ payoutId: 1 });
paymentSchema.index({ "payoutDetails.payoutMethod": 1 });

const PaymentModel = mongoose.model("Payment", paymentSchema);
export default PaymentModel;
