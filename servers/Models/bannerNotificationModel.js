import mongoose from "mongoose";

// Defines schema for banner notifications
const bannerNotificationSchema = new mongoose.Schema({
  // Notification message content
  message: { 
    type: String, 
    required: true 
  },
  // Notification title
  title: { 
    type: String, 
    required: true 
  },
  // Type of notification (info, warning, error)
  type: { 
    type: String, 
    enum: ["info", "warning", "error"], 
    default: "info" 
  },
  // Indicates if the notification is active
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Optional link for notification action
  link: { 
    type: String, 
    default: "" 
  },
  // Target region for the notification
  region: { 
    type: String, 
    default: "global" 
  },
  // Optional expiration date for the notification
  expiresAt: { 
    type: Date 
  },
  // User who created the notification
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Users who dismissed the notification
  dismissedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  // Timestamp of notification creation
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Creates and exports the Banner-Notification model
const BannerNotifyModel = mongoose.model("Banner-Notification", bannerNotificationSchema);
export default BannerNotifyModel;