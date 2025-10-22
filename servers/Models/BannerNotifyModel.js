import mongoose from "mongoose";

// Defines schema for banner notifications
const bannerNotificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["info", "warning", "error", "success"],
    default: "info",
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  link: {
    type: String,
    default: "",
  },
  region: {
    type: String,
    default: "global",
    index: true,
  },

  // ✅ Expiration timestamp — MongoDB TTL index
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // <--- THIS is what makes it auto-delete
  },

  dismissedCount: {
    type: Number,
    default: 0,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-fill expiresAt if missing (default 1 day)
bannerNotificationSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

// Compound index for active notification queries
bannerNotificationSchema.index({ isActive: 1, expiresAt: 1, region: 1 });

// Export model
export const BannerNotifyModel =
  mongoose.models.Banner_Notification ||
  mongoose.model("Banner_Notification", bannerNotificationSchema);

export default BannerNotifyModel;
