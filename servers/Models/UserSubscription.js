import mongoose from "mongoose";

// Defines schema for user subscriptions
const userSubscriptionSchema = new mongoose.Schema({
  // Subscribed user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Subscription plan
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserSubscriptionPlan",
    required: true,
  },
  // Payment ID for the subscription
  paymentId: {
    type: String,
    required: true,
  },
  // Subscription expiry date
  expiryDate: {
    type: Date,
    required: true,
  },
  // Subscription status
  status: {
    type: String,
    enum: ["active", "cancelled", "refunded"],
    default: "active",
  },
  // Amount paid for the subscription
  amountPaid: {
    type: Number,
    required: true,
  },
  // Timestamp of creation
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Timestamp of last update
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Timestamp of last reminder sent
  lastReminderSent: {
    type: Date,
    default: null,
  },
});

// Updates updatedAt before saving
userSubscriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Creates and exports the UserSubscription model
const UserSubscription =
  mongoose.models.UserSubscription ||
  mongoose.model("UserSubscription", userSubscriptionSchema);
export default UserSubscription;
