import mongoose from "mongoose";

// Defines schema for tracking dismissed banner notifications
const dismissedBannerNotificationSchema = new mongoose.Schema({
  // User who dismissed the notification
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Dismissed notification
  notificationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Banner-Notification", 
    required: true 
  },
  // Timestamp of dismissal
  dismissedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Creates and exports the DismissedBannerNotification model
const DismissedBannerNotification = mongoose.model(
  "DismissedBannerNotification",
  dismissedBannerNotificationSchema
);
export default DismissedBannerNotification;