import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    subscriber: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    paymentId: { type: String, required: true }, // Matches paymentId in Payment model
    subscribedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const subscriptionPlanSchema = new mongoose.Schema({
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true 
  },
  planType: { 
    type: String, 
    enum: ["free", "paid"], 
    required: true 
  },
  amount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  posts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Post" 
  }],
  bankAccountDetails: {
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
  },
  subscribers: [subscriberSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);