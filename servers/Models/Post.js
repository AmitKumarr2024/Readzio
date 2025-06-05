import mongoose from "mongoose";
import slugify from "slugify";

// Block Schema — used in post.blocks
const blockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    value: String,
    level: Number,
    text: String,
    code: String,
    caption: String,
    src: String,
    href: String,
    url: String,
    name: String,
    size: Number,
    ordered: Boolean,
    author: String,

    // Poll-specific fields
    question: String,
    options: [
      {
        option: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    votedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],

    // Other structured data support
    items: { type: [String], default: [] },
    data: { type: [[String]], default: [] },
  },
  { _id: false }
);

// Post Schema
const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isSubscriberOnly: { type: Boolean, default: false }, // 👈 NEW FIELD
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    thumbnail: String,
    excerpt: String,

    blocks: {
      type: [blockSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Blocks must be a non-empty array",
      },
    },

    isPublished: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "review", "published", "archived"],
      default: "draft",
    },
    isFeatured: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },

    readingTime: Number,
    language: { type: String, default: "en" },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: { type: [String], default: [] },

    reactions: { type: Map, of: Number, default: () => ({}) },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bookmarksCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    lastEditedAt: Date,
    allowComments: { type: Boolean, default: true },
    canonicalUrl: String,
  },
  { timestamps: true }
);

// Indexes for optimized search
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ title: "text", excerpt: "text", tags: "text" });

// Slug generation
postSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const PostModel = mongoose.models.Post || mongoose.model("Post", postSchema);
export default PostModel;
