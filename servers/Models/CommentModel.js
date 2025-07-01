import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    // 🔗 Post the comment belongs to
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true, // 🔍 for faster lookups
    },

    // 👤 Author of the comment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 🔍 helpful for user comment history
    },

    // 📝 Main comment content
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },

    // 🧵 Parent comment for replies (null if top-level)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true, // 🔍 optimize threaded replies
    },

    // 💬 Number of direct replies (for pagination/perf)
    repliesCount: {
      type: Number,
      default: 0,
    },

    // 😍 Reactions: like, heart, laugh, etc.
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: () => ({}),
    },

    // 🛡️ Soft delete/moderation flags
    deleted: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },

    // 🛑 Optional: for moderation tools
    isFlagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🧵 Virtual replies (not stored directly, but populated)
commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parent",
});

// 🌐 Enable virtuals in JSON responses
commentSchema.set("toObject", { virtuals: true });
commentSchema.set("toJSON", { virtuals: true });

const CommentModel = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
export default CommentModel;
