import mongoose from "mongoose";

// Defines schema for tracking email sending attempts
const EmailLogSchema = new mongoose.Schema(
  {
    // Optional user associated with the email
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Recipient email address
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Type of email sent
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
    // Current status of the email
    emailStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed", "pending", "skipped"], // Added "skipped"
      default: "not_sent",
    },
    // Number of send attempts
    emailAttempts: {
      type: Number,
      default: 0,
    },
    // Last error message if send failed
    emailLastError: String,
    // Flag to stop further send attempts
    stopEmailAttempts: {
      type: Boolean,
      default: false,
    },
    // Slugs of posts included in daily digest
    postSlugs: [
      {
        type: String,
      },
    ],
    // Timestamp of successful send
    sentAt: {
      type: Date,
      default: null,
    },
    // Creation and update timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Automatically updates createdAt and updatedAt
);

// Indexes for efficient querying
EmailLogSchema.index({ email: 1, type: 1 }); // For email-type specific queries
EmailLogSchema.index({ type: 1 }); // For type-based queries
EmailLogSchema.index({ emailStatus: 1, stopEmailAttempts: 1 }); // For status-based queries
EmailLogSchema.index({ sentAt: -1 }); // For sorting by send time

// Creates and exports the EmailLog model
const EmailLogModel =
  mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);

export default EmailLogModel;
