import mongoose from "mongoose";

// Defines schema for banner notifications
const bannerNotificationSchema = new mongoose.Schema({
  // Notification message content
  message: {
    type: String,
    required: true,
  },
  // Notification title
  title: {
    type: String,
    required: true,
  },
  // Type of notification (info, warning, error)
  type: {
    type: String,
    enum: ["info", "warning", "error", "success"],
    default: "info",
  },
  // Indicates if the notification is active
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Optional link for notification action
  link: {
    type: String,
    default: "",
  },
  // Target region for the notification
  region: {
    type: String,
    default: "global",
    index: true,
  },
  // Optional expiration date for the notification
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
  // Number of users who dismissed the notification
  dismissedCount: {
    type: Number,
    default: 0,
    index: true,
  },
  // User who created the notification
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Timestamp of notification creation
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient active notification queries
bannerNotificationSchema.index({ isActive: 1, expiresAt: 1, region: 1 });
bannerNotificationSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // default 1 day
  }
  next();
});

// Creates and exports the Banner-Notification model
export const BannerNotifyModel =
  mongoose.models.Banner_Notification ||
  mongoose.model("Banner_Notification", bannerNotificationSchema);

export default BannerNotifyModel;
