// servers/Models/EmailLog.js
import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true, // keep inline index
    validate: {
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: "Invalid email format",
    },
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
    sparse: true, // allow null but index non-null
  },
  emailStatus: {
    type: String,
    enum: ["pending", "sent", "failed", "bounced", "suppressed"],
    default: "pending",
    index: true,
  },
  emailAttempts: { type: Number, default: 0, min: 0, max: 10 },
  emailLastError: { type: String, maxlength: 1000, trim: true },
  stopEmailAttempts: { type: Boolean, default: false, index: true },

  bounceType: {
    type: String,
    enum: ["hard", "soft", "spam", "reputation", null],
    default: null,
    index: true,
  },
  bounceReason: { type: String, maxlength: 200, trim: true },
  bounceCode: { type: String, maxlength: 10, trim: true },
  lastBounceAt: { type: Date, index: true },
  bounceCount: { type: Number, default: 0, min: 0, max: 50 },
  suppressedAt: { type: Date }, // ✅ remove inline index

  messageId: { type: String, trim: true },
  sentAt: { type: Date, index: true },
  postSlugs: [{ type: String, trim: true }],

  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: new Map() },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Compound indexes
emailLogSchema.index({ email: 1, type: 1, userId: 1 });
emailLogSchema.index({ bounceType: 1, lastBounceAt: 1 });
emailLogSchema.index({ emailStatus: 1, updatedAt: 1 });
emailLogSchema.index({ type: 1, sentAt: 1 });

// Sparse index for suppressedAt (keep only here)
emailLogSchema.index({ suppressedAt: 1 }, { sparse: true });

// TTL cleanup: remove after 1 year
emailLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Pre-save: update timestamps and handle status changes
emailLogSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  if (
    this.isModified("emailStatus") &&
    this.emailStatus === "sent" &&
    !this.sentAt
  ) {
    this.sentAt = new Date();
  }

  if (
    this.isModified("bounceType") &&
    this.bounceType === "hard" &&
    !this.suppressedAt
  ) {
    this.suppressedAt = new Date();
    this.stopEmailAttempts = true;
  }

  next();
});

emailLogSchema.pre(["findOneAndUpdate", "updateOne"], function () {
  this.set({ updatedAt: new Date() });
});

// Virtual for age in hours
emailLogSchema.virtual("ageInHours").get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Static helpers
emailLogSchema.statics.findSuppressed = function () {
  return this.find({
    $or: [
      { bounceType: "hard" },
      { emailStatus: "suppressed" },
      { suppressedAt: { $exists: true } },
    ],
  });
};

emailLogSchema.statics.findRecentSoftBounces = function (hours = 1) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ bounceType: "soft", lastBounceAt: { $gte: cutoff } });
};

emailLogSchema.statics.getEmailStats = function (email) {
  return this.aggregate([
    { $match: { email: email.toLowerCase() } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: "$emailAttempts" },
        totalBounces: { $sum: "$bounceCount" },
        lastStatus: { $last: "$emailStatus" },
        lastBounceType: { $last: "$bounceType" },
        lastActivity: { $max: "$updatedAt" },
      },
    },
  ]);
};

// Instance helpers
emailLogSchema.methods.isSuppressed = function () {
  return (
    this.bounceType === "hard" ||
    this.emailStatus === "suppressed" ||
    this.suppressedAt
  );
};

emailLogSchema.methods.hasRecentSoftBounce = function (hours = 1) {
  if (this.bounceType !== "soft" || !this.lastBounceAt) return false;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.lastBounceAt >= cutoff;
};

// Handle duplicate key errors
emailLogSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Duplicate email log entry"));
  } else {
    next(error);
  }
});

const EmailLog = mongoose.model("EmailLog", emailLogSchema);
export default EmailLog;
