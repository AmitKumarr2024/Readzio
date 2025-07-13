import mongoose from "mongoose";

const guestVisitSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    ip: String,
    userAgent: String,
    visitedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const GuestVisitModel = mongoose.model("GuestVisit", guestVisitSchema);
export default GuestVisitModel;
