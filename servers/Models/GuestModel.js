import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, unique: true },
    fingerprint: { type: String, unique: true, sparse: true }, // Added for fallback tracking
    ip: String,
    userAgent: String,
    visitCount: { type: Number, default: 1 },
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const GuestModel =
  mongoose.models.Guest || mongoose.model("Guest", guestSchema);
export default GuestModel;
