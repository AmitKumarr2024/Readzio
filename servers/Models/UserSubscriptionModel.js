import mongoose from "mongoose";

// Defines schema for user-created subscription plans
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
    enum: ["basic", "silver", "gold", "platinum", "custom"],
    required: true,
  },
  // Plan billing tier
  tier: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly",
  },
  // Plan status
  status: {
    type: String,
    enum: ["active", "pending", "not_confirmed", "suspended", "deleted"],
    default: "not_confirmed",
  },
  // Plan author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Posts included in the plan
  postIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  // Plan description
  description: {
    type: String,
    default: "",
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
  // Timestamp of last update
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Updates updatedAt before saving
planSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Creates and exports the UserSubscriptionPlan model
const UserSubscriptionPlan =
  mongoose.models.UserSubscriptionPlan ||
  mongoose.model("UserSubscriptionPlan", planSchema);
export default UserSubscriptionPlan;
