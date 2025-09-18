import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
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
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "bounced", "suppressed"],
      default: "pending",
    },
    emailAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    emailLastError: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    stopEmailAttempts: {
      type: Boolean,
      default: false,
    },
    bounceType: {
      type: String,
      enum: ["hard", "soft", "spam", "reputation", null],
      default: null,
    },
    bounceReason: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    bounceCode: {
      type: String,
      maxlength: 10,
      trim: true,
    },
    lastBounceAt: {
      type: Date,
    },
    bounceCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 50,
    },
    suppressedAt: {
      type: Date,
    },
    messageId: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
    },
    postSlugs: [
      {
        type: String,
        trim: true,
      },
    ],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Define indexes explicitly (no duplicates)
emailLogSchema.index({ userId: 1 }, { sparse: true });
emailLogSchema.index({ type: 1 });
emailLogSchema.index({ emailStatus: 1 });
emailLogSchema.index({ createdAt: -1 }); // For sorting queries
emailLogSchema.index({ suppressedAt: 1 }, { sparse: true });
emailLogSchema.index({ email: 1, type: 1, userId: 1 }, { unique: false });
emailLogSchema.index({ bounceType: 1, lastBounceAt: 1 }, { sparse: true });
emailLogSchema.index({ emailStatus: 1, updatedAt: 1 });
emailLogSchema.index({ type: 1, sentAt: 1 }, { sparse: true });

// TTL index for cleanup (1 year)
emailLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Update timestamps and status
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

// Virtual for age calculation
emailLogSchema.virtual("ageInHours").get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Static methods
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
  return this.find({
    bounceType: "soft",
    lastBounceAt: { $gte: cutoff },
  });
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

// Instance methods
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

// Error handling
emailLogSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Duplicate email log entry"));
  } else {
    next(error);
  }
});

const EmailLog = mongoose.model("EmailLog", emailLogSchema);
export default EmailLog;
