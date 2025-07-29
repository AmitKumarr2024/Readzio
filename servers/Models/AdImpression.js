import mongoose from "mongoose";

// Defines schema for tracking ad impressions
const adImpressionSchema = new mongoose.Schema({
  // References the post where the ad was displayed
  postId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Post", 
    required: true 
  },
  // Optional reference to the user who viewed the ad
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  // Identifies the ad slot (e.g., banner, sidebar)
  adSlot: String,
  // Duration of user interaction with the ad (in seconds)
  timeSpent: Number,
  // Timestamp of when the impression occurred
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Creates and exports the AdImpression model
const AdImpressionModel = mongoose.models.AdImpression || mongoose.model("AdImpression", adImpressionSchema);

export default AdImpressionModel;