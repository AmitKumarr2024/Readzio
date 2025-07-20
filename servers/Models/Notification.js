import mongoose from "mongoose";

// Defines schema for user notifications
const notificationSchema = new mongoose.Schema(
  {
    // Recipient user
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    // User who triggered the notification
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    // Type of notification
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "admin",
        "post",
        "message",
        "reply",
        "admin_reply",
        "subscription",
      ],
      required: true,
    },
    // Optional frontend route for navigation
    navigateTo: { 
      type: String, 
      default: null 
    },
    // Optional reference to related post
    post: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post" 
    },
    // Optional reference to subscription plan
    plan: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "UserSubscriptionPlan" 
    },
    // Optional notification message
    content: { 
      type: String 
    },
    // Indicates if notification is read
    read: { 
      type: Boolean, 
      default: false 
    },
    // Optional parent notification for threaded notifications
    parentNotification: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Notification" 
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Creates and exports the Notification model
const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification;