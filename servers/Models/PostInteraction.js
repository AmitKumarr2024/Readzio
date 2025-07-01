import mongoose from "mongoose";

const postInteractionSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timeSpent: { type: Number, default: 0 }, // In seconds
    lastInteractedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure one user interacts per post (upsert will work reliably)
postInteractionSchema.index({ postId: 1, userId: 1 }, { unique: true });

const PostInteraction =
  mongoose.models.PostInteraction ||
  mongoose.model("PostInteraction", postInteractionSchema);

export default PostInteraction;
