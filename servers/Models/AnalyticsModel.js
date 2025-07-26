import mongoose from "mongoose";

const AnalyticsSchema = new mongoose.Schema({
  traffic: {
    totalVisits: { type: Number, default: 0 },
    uniqueUsersCount: { type: Number, default: 0 },
    guestUsersCount: { type: Number, default: 0 }, // 🔧 this is what we increment
    uniquePostsCount: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

const AnalyticsModel = mongoose.model("Analytics-Guest", AnalyticsSchema);

export default AnalyticsModel;
