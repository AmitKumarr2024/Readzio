import mongoose from "mongoose";

const reportedPostSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    details: { type: String },
    isReviewed: { type: Boolean, default: false },
    forwardedToAuthor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("ReportedPost", reportedPostSchema);