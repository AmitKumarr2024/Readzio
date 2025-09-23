// models/EmailLog.js
import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: [true, "Recipient email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    from: {
      type: String,
      required: [true, "Sender email is required"],
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: [true, "Email subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    type: {
      type: String,
      required: [true, "Email type is required"],
      enum: {
        values: [
          "verification",
          "welcome",
          "reset_password",
          "invoice",
          "daily_report",
          "notification",
          "bulk",
          "custom",
        ],
        message: "Invalid email type: {VALUE}",
      },
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "sent", "failed", "bounced", "delivered", "opened"],
        message: "Invalid status: {VALUE}",
      },
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    messageId: {
      type: String,
      default: null,
      sparse: true,
    },
    templateData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    htmlContent: {
      type: String,
      default: null,
    },
    textContent: {
      type: String,
      default: null,
    },
    attachments: [
      {
        filename: String,
        path: String,
        size: Number,
        mimetype: String,
      },
    ],
    error: {
      message: {
        type: String,
        default: null,
      },
      code: {
        type: String,
        default: null,
      },
      stack: {
        type: String,
        default: null,
      },
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
    bouncedAt: {
      type: Date,
      default: null,
    },
    tracking: {
      userAgent: String,
      ipAddress: String,
      location: {
        country: String,
        region: String,
        city: String,
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailCampaign",
      default: null,
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledEmail",
      default: null,
    },
    analytics: {
      opens: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      lastOpened: Date,
      lastClicked: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ to: 1, type: 1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, status: 1 });
emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ campaignId: 1, status: 1 });
emailLogSchema.index({ nextRetryAt: 1 }, { sparse: true });
emailLogSchema.index({ tags: 1 });

// Virtual properties
emailLogSchema.virtual("isDelivered").get(function () {
  return this.status === "delivered" || this.status === "sent";
});

emailLogSchema.virtual("isFailed").get(function () {
  return this.status === "failed" || this.status === "bounced";
});

emailLogSchema.virtual("canRetry").get(function () {
  return this.isFailed && this.retryCount < this.maxRetries;
});

emailLogSchema.virtual("timeSinceSent").get(function () {
  if (!this.sentAt) return null;
  return Date.now() - this.sentAt.getTime();
});

// Instance methods
emailLogSchema.methods.markAsSent = function (messageId, sentAt = new Date()) {
  this.status = "sent";
  this.messageId = messageId;
  this.sentAt = sentAt;
  this.error = { message: null, code: null, stack: null };
  return this.save();
};

emailLogSchema.methods.markAsDelivered = function (deliveredAt = new Date()) {
  this.status = "delivered";
  this.deliveredAt = deliveredAt;
  return this.save();
};

emailLogSchema.methods.markAsFailed = function (error, shouldRetry = true) {
  this.status = "failed";
  this.error = {
    message: error.message || error,
    code: error.code || null,
    stack: error.stack || null,
  };

  if (shouldRetry && this.canRetry) {
    this.retryCount += 1;
    const backoffMinutes = Math.pow(2, this.retryCount) * 5;
    this.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
  }

  return this.save();
};

emailLogSchema.methods.markAsOpened = function (
  openedAt = new Date(),
  trackingData = {}
) {
  this.status = "opened";
  this.openedAt = openedAt;
  this.analytics.opens += 1;
  this.analytics.lastOpened = openedAt;

  if (trackingData) {
    this.tracking = { ...this.tracking, ...trackingData };
  }

  return this.save();
};

emailLogSchema.methods.markAsClicked = function (clickedAt = new Date()) {
  this.clickedAt = clickedAt;
  this.analytics.clicks += 1;
  this.analytics.lastClicked = clickedAt;
  return this.save();
};

emailLogSchema.methods.markAsBounced = function (
  bounceReason,
  bouncedAt = new Date()
) {
  this.status = "bounced";
  this.bouncedAt = bouncedAt;
  this.error = {
    ...this.error,
    message: bounceReason,
  };
  return this.save();
};

// Static methods
emailLogSchema.statics.getEmailStats = function (
  startDate,
  endDate,
  filters = {}
) {
  const matchQuery = {
    createdAt: {
      $gte: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      $lte: endDate || new Date(),
    },
    ...filters,
  };

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgRetryCount: { $avg: "$retryCount" },
        totalRetries: { $sum: "$retryCount" },
      },
    },
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            status: "$_id",
            count: "$count",
            avgRetryCount: "$avgRetryCount",
            totalRetries: "$totalRetries",
          },
        },
        total: { $sum: "$count" },
      },
    },
  ]);
};

emailLogSchema.statics.getTypeStats = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          $lte: endDate || new Date(),
        },
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        delivered: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        opened: { $sum: { $cond: [{ $eq: ["$status", "opened"] }, 1, 0] } },
        successRate: {
          $multiply: [
            {
              $divide: [
                {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["sent", "delivered", "opened"]] },
                      1,
                      0,
                    ],
                  },
                },
                "$count",
              ],
            },
            100,
          ],
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

emailLogSchema.statics.getFailedEmails = function (limit = 100) {
  return this.find({
    status: "failed",
    $expr: { $lt: ["$retryCount", "$maxRetries"] },
  })
    .sort({ nextRetryAt: 1 })
    .limit(limit);
};

emailLogSchema.statics.getPendingRetries = function () {
  return this.find({
    status: "failed",
    nextRetryAt: { $lte: new Date() },
    $expr: { $lt: ["$retryCount", "$maxRetries"] },
  });
};

// Pre-save middleware
emailLogSchema.pre("save", function (next) {
  if (this.isModified("to")) {
    this.to = this.to.toLowerCase();
  }
  if (this.isModified("from")) {
    this.from = this.from.toLowerCase();
  }

  next();
});

// Post-save middleware
emailLogSchema.post("save", function (doc) {
  if (doc.status === "sent") {
    console.log(`✅ Email sent successfully: ${doc._id} to ${doc.to}`);
  } else if (doc.status === "failed") {
    console.log(
      `❌ Email failed: ${doc._id} to ${doc.to} - ${doc.error.message}`
    );
  }
});

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

export default EmailLog;
