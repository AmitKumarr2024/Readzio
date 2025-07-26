import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, unique: true },
    ip: String,
    userAgent: String,
    visitCount: { type: Number, default: 1 },
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const GuestModel = mongoose.model("Guest", guestSchema);
export default GuestModel;
