import mongoose from "mongoose";

const EmailLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "signup",
        "payout",
        "subscription",
        "contact_reply",
        "report",
        "daily_digest", // ✅ New type added
      ],
    },
    emailStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed", "pending"],
      default: "not_sent",
    },
    emailAttempts: { type: Number, default: 0 },
    emailLastError: String,
    stopEmailAttempts: { type: Boolean, default: false },

    // ✅ New fields for digest-specific tracking
    postSlugs: [{ type: String }], // Which posts were sent in the email
    sentAt: { type: Date, default: null }, // When it was sent

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for efficient queries
EmailLogSchema.index({ email: 1, type: 1 });
EmailLogSchema.index({ type: 1 });
EmailLogSchema.index({ emailStatus: 1, stopEmailAttempts: 1 });
EmailLogSchema.index({ sentAt: -1 });

export default mongoose.model("EmailLog", EmailLogSchema);
