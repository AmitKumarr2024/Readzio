import mongoose from "mongoose";

// Defines schema for post comments
const commentSchema = new mongoose.Schema(
  {
    // References the post the comment belongs to
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true, // Optimizes post comment queries
    },
    // References the comment author
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimizes user comment history queries
    },
    // Comment content
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    // References parent comment for replies (null for top-level)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true, // Optimizes threaded reply queries
    },
    // Tracks number of direct replies
    repliesCount: {
      type: Number,
      default: 0,
    },
    // Stores reactions (e.g., like, heart) with user IDs
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: () => ({}),
    },
    // Soft delete flag
    deleted: {
      type: Boolean,
      default: false,
    },
    // Indicates if comment was edited
    edited: {
      type: Boolean,
      default: false,
    },
    // Moderation flag for reported comments
    isFlagged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Defines virtual field for comment replies
commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parent",
});

// Enables virtuals in JSON and object output
commentSchema.set("toObject", { virtuals: true });
commentSchema.set("toJSON", { virtuals: true });

// Creates and exports the Comment model
const CommentModel =
  mongoose.models.Comment || mongoose.model("Comment", commentSchema);

export default CommentModel;
