import mongoose from "mongoose";

// Defines schema for tracking user interactions with posts
const postInteractionSchema = new mongoose.Schema(
  {
    // Post being interacted with
    postId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post", 
      required: true 
    },
    // User performing the interaction
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    // Time spent on the post (in seconds)
    timeSpent: { 
      type: Number, 
      default: 0 
    },
    // Timestamp of last interaction
    lastInteractedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Ensures one interaction per user per post
postInteractionSchema.index({ postId: 1, userId: 1 }, { unique: true });

// Creates and exports the PostInteraction model
const PostInteraction =
  mongoose.models.PostInteraction ||
  mongoose.model("PostInteraction", postInteractionSchema);
export default PostInteraction;