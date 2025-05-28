import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // keep user ref
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String },
  signature: { type: String },
  amount: { type: Number, required: true }, // in paise
  currency: { type: String, default: "INR" },
  status: {
    type: String,
    enum: ["created", "paid", "failed", "payout_created", "payout_done", "payout_failed"],
    default: "created",
  },
  receipt: { type: String },
  notes: { type: mongoose.Schema.Types.Mixed }, // optional metadata
  payoutId: { type: String },       // RazorpayX payout id (optional)
  payoutStatus: { type: String },   // payout status (optional)
  createdAt: { type: Date, default: Date.now },
});

const PaymentModel = mongoose.model("Payment", paymentSchema);
export default PaymentModel;
