import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "signup",
      "payout",
      "subscription",
      "contact_reply",
      "report",
      "daily_digest",
    ],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  emailStatus: {
    type: String,
    enum: ["pending", "sent", "failed", "bounced", "suppressed"],
    default: "pending",
    index: true,
  },
  emailAttempts: { type: Number, default: 0, min: 0 },
  emailLastError: { type: String, maxlength: 1000 },
  stopEmailAttempts: { type: Boolean, default: false, index: true },

  // ✅ NEW BOUNCE FIELDS
  bounceType: {
    type: String,
    enum: ["hard", "soft", "spam", "reputation", null],
    default: null,
    index: true,
  },
  bounceReason: { type: String, maxlength: 100 },
  bounceCode: { type: String, maxlength: 10 },
  lastBounceAt: { type: Date, index: true },
  bounceCount: { type: Number, default: 0, min: 0 },
  suppressedAt: { type: Date },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Compound indexes for performance
emailLogSchema.index({ email: 1, type: 1, userId: 1 });
emailLogSchema.index({ bounceType: 1, lastBounceAt: 1 });
emailLogSchema.index({ emailStatus: 1, updatedAt: 1 });

// Update timestamp on save
emailLogSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const EmailLog = mongoose.model("EmailLog", emailLogSchema);
export default EmailLog;
