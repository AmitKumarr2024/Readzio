import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: String },
  level: { type: Number },
  text: { type: String },
  code: { type: String },
  caption: { type: String },
  src: { type: String },
  href: { type: String },
  url: { type: String },
  name: { type: String },
  size: { type: Number },
  items: { type: [String], default: [] },
  ordered: { type: Boolean },
  question: { type: String },
  options: { type: [String], default: [] },
  author: { type: String },
  data: { type: [[String]], default: [] },
}, { _id: false });

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  category: { type: String, required: true },
  tags: { type: [String], default: [] },
  thumbnail: { type: String },
  excerpt: { type: String },
  blocks: {
    type: [blockSchema],
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
  isPublished: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false }, // ✅ Added this line
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft',
  },
  isFeatured: { type: Boolean, default: false },
  readingTime: { type: Number },
  language: { type: String, default: 'en' },
  metaTitle: { type: String },
  metaDescription: { type: String },
  metaKeywords: { type: [String], default: [] },
  reactions: {
    type: Map,
    of: Number,
    default: {},
  },
  views: { type: Number, default: 0 },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  bookmarksCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  lastEditedAt: { type: Date },
  allowComments: { type: Boolean, default: true },
  canonicalUrl: { type: String },
}, { timestamps: true });

postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });

const PostModel = mongoose.model("Post", postSchema);
export default PostModel;
