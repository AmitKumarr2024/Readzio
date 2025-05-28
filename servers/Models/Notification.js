import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },      // Who receives the notification (targetUser)
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },    // Who triggered the notification
  type: { type: String, enum: ["like", "comment", "follow"], required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },                      // Optional reference to post
  read: { type: Boolean, default: false },
}, { timestamps: true });

const NotificationModel = mongoose.model("Notification", notificationSchema);

export default NotificationModel;
