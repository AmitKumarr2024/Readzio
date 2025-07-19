import mongoose from "mongoose";

// Defines schema for subscription configuration
const configSchema = new mongoose.Schema({
  // Unique configuration key
  key: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // Minimum followers for eligibility
  minFollowers: { 
    type: Number, 
    default: 10000 
  },
  // Minimum posts for eligibility
  minPosts: { 
    type: Number, 
    default: 30 
  },
  // Minimum engagement rate for eligibility
  minEngagementRate: { 
    type: Number, 
    default: 0.05 
  },
  // Minimum account age in days for eligibility
  minAccountAgeDays: { 
    type: Number, 
    default: 30 
  },
  // Timestamp of last update
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Updates updatedAt before saving
configSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Creates and exports the SubscriptionConfig model
const SubscriptionConfig = mongoose.model("SubscriptionConfig", configSchema);
export default SubscriptionConfig;