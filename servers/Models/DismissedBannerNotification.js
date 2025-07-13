import mongoose from "mongoose";

const dismissedBannerNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Banner-Notification", required: true },
  dismissedAt: { type: Date, default: Date.now },
});

const DismissedBannerNotification = mongoose.model(
  "DismissedBannerNotification",
  dismissedBannerNotificationSchema
);

export default DismissedBannerNotification;