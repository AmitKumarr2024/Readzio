import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan",
    required: true,
  },
  paymentId: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["active", "cancelled", "refunded"],
    default: "active",
  },
  createdAt: { type: Date, default: Date.now },
});

const UserSubscriptionModel = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema
);
export default UserSubscriptionModel;
