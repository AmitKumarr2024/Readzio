import mongoose from "mongoose";

// Content block schema used inside posts
const blockSchema = new mongoose.Schema({
  id: { type: String, required: true },  // UUID
  type: { type: String, required: true }, // e.g. text, image, code, etc.
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
  items: [String],
  ordered: { type: Boolean },
  question: { type: String },
  options: [String],
  author: { type: String },
  data: [[String]],
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
  tags: [String],
  thumbnail: { type: String },
  excerpt: { type: String },
  blocks: {
    type: [blockSchema],
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
  isPublished: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
}, { timestamps: true });

const PostModel = mongoose.model("Post", postSchema);
export default PostModel;
