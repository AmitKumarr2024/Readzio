import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  type: {
    type: String,
    enum: [
      "welcome",
      "reset_password",
      "verification", // ✅ added for verification/OTP emails
      "test",
      "daily_digest",
      "reset",
      "direct",
    ],
    required: true,
  },
  emailStatus: {
    type: String,
    enum: ["sent", "failed", "bounced"],
    required: true,
  },
  emailAttempts: {
    type: Number,
    default: 1,
  },
  messageId: {
    type: String,
    default: null,
  },
  emailLastError: {
    type: String,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  subject: {
    type: String,
    required: false,
    trim: true,
  },
  from: {
    type: String,
    required: false,
    trim: true,
  },
  to: {
    type: String,
    required: false,
    trim: true,
  },
});

export default mongoose.models.EmailLog ||
  mongoose.model("EmailLog", emailLogSchema);
