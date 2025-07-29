import mongoose from "mongoose";

const AnalyticsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: "guest-analytics", // fixed unique ID
  },
  traffic: {
    totalVisits: { type: Number, default: 0 },
    uniqueUsersCount: { type: Number, default: 0 },
    guestUsersCount: { type: Number, default: 0 }, // 🔧 this is what we increment
    uniquePostsCount: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export const AnalyticsModel =
  mongoose.models.Analytics_Guest ||
  mongoose.model("Analytics_Guest", AnalyticsSchema);

export default AnalyticsModel;
