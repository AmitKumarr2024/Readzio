import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String }, // Optional URL to relevant resource
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model('Notification', notificationSchema);

export default NotificationModel;
