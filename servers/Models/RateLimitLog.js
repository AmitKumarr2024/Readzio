import mongoose from "mongoose";

const rateLimitLogSchema = new mongoose.Schema(
  {
    key: {
      type: String, // userId OR IP
      required: true,
      index: true,
    },
    route: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Auto cleanup after reset time
rateLimitLogSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RateLimitLog", rateLimitLogSchema);
