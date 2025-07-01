import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Receiver
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Admin/sender
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'admin', 'post', 'message', 'reply', 'admin_reply'],
      required: true,
    },
    navigateTo: { type: String, default: null },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    content: { type: String },
    read: { type: Boolean, default: false },
    parentNotification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },
  },
  { timestamps: true }
);

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;