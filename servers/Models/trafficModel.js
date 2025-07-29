import mongoose from "mongoose";

// Defines schema for tracking web traffic
const trafficSchema = new mongoose.Schema({
  // Visitor's IP address
  ip: String,
  // Visitor's user agent
  userAgent: String,
  // Requested route
  route: String,
  // HTTP method
  method: String,
  // Timestamp of request
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Optional user associated with the request
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Optional post associated with the request
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
  // Time spent on the page (in seconds)
  timeSpent: {
    type: Number,
    default: 0,
  },
});

// Creates and exports the Traffic model
const TrafficModel =
  mongoose.models.Traffic || mongoose.model("Traffic", trafficSchema);
export default TrafficModel;
