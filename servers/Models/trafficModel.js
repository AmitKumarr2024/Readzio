import mongoose from "mongoose";

const trafficSchema = new mongoose.Schema({
  ip: String,
  userAgent: String,
  route: String,
  method: String,
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  timeSpent: { type: Number, default: 0 }, // in seconds
});

const TrafficModel = mongoose.model("Traffic", trafficSchema);
export default TrafficModel;
