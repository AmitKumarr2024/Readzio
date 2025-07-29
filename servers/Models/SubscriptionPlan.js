import mongoose from "mongoose";

// Defines schema for subscription plans
const planSchema = new mongoose.Schema({
  // Plan name
  name: {
    type: String,
    required: true,
  },
  // Plan price
  price: {
    type: Number,
    required: true,
  },
  // Plan duration in days
  durationDays: {
    type: Number,
    required: true,
  },
  // Plan type
  type: {
    type: String,
    enum: ["basic", "silver", "gold", "platinum"],
    required: true,
  },
  // Plan billing tier
  tier: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
  },
  // Plan status
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  // Plan author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Timestamp of deletion
  deletedAt: {
    type: Date,
    default: null,
  },
  // Timestamp of creation
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // User associated with the plan
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // Reference to subscription plan
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserSubscriptionPlan",
    default: null,
  },
  // Payment ID for the plan
  paymentId: {
    type: String,
    default: null,
  },
  // Plan expiry date
  expiryDate: {
    type: Date,
    default: null,
  },
  // Amount paid for the plan
  amountPaid: {
    type: Number,
    default: 0,
  },
});

// Creates and exports the SubscriptionPlan model
const SubscriptionPlan =
  mongoose.models.SubscriptionPlan ||
  mongoose.model("SubscriptionPlan", planSchema);
export default SubscriptionPlan;
