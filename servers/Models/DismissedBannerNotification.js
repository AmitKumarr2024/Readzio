import mongoose from "mongoose";

// Defines schema for tracking dismissed banner notifications
const dismissedBannerNotificationSchema = new mongoose.Schema({
  // User who dismissed the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // Notification that was dismissed
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Banner_Notification",
    required: true,
    index: true,
  },
  // Timestamp when notification was dismissed
  dismissedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
dismissedBannerNotificationSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true }
);

// Creates and exports the Dismissed Banner Notification model
export const DismissedBannerNotificationModel =
  mongoose.models.Dismissed_Banner_Notification ||
  mongoose.model(
    "Dismissed_Banner_Notification",
    dismissedBannerNotificationSchema
  );

export default DismissedBannerNotificationModel;
