import mongoose from "mongoose";

const bannerNotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ["info", "warning", "error"], default: "info" },
  isActive: { type: Boolean, default: true },
  link: { type: String, default: "" },
  region: { type: String, default: "global" },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const BannerNotifyModel = mongoose.model(
  "Banner-Notification",
  bannerNotificationSchema
);

export default BannerNotifyModel;