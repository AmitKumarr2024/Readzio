import mongoose from "mongoose";

// Defines schema for reported posts
const reportedPostSchema = new mongoose.Schema(
  {
    // Reported post
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    // User who reported the post
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Reason for reporting
    reason: {
      type: String,
      required: true,
    },
    // Additional details for the report
    details: {
      type: String,
    },
    // Indicates if report has been reviewed
    isReviewed: {
      type: Boolean,
      default: false,
    },
    // Indicates if report was forwarded to author
    forwardedToAuthor: {
      type: Boolean,
      default: false,
    },
    // Indicates if report was acknowledged
    isAcknowledged: {
      type: Boolean,
      default: false,
    },
    // Timestamp of report creation
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Creates and exports the ReportedPost model
const ReportedPostModel =
  mongoose.models.ReportedPost ||
  mongoose.model("ReportedPost", reportedPostSchema);

  export default ReportedPostModel;