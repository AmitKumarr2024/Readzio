import mongoose from 'mongoose';
import slugify from 'slugify';

const blockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "image",
        "code",
        "video",
        "quote",
        "list",
        "heading",
        "table",
        "link",
        "hr",
        "file",
        "poll",
      ],
    },
    status: {
      type: String,
      enum: ["draft", "review", "published", "archived"],
      default: "draft",
      required: true,
    },
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
    question: String,
    options: [
      {
        option: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    votedUserIds: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    items: { type: [String], default: [] },
    data: { type: [[String]], default: [] },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isSubscriberOnly: { type: Boolean, default: false },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    thumbnail: String,
    excerpt: String,
    timeSpent: { type: Number, default: 0 },
    blocks: {
      type: [blockSchema],
      validate: {
        validator: function (v) {
          if (!Array.isArray(v)) {
            console.error("[DEBUG] Blocks is not an array:", v);
            return false;
          }
          if (this.status !== "draft" && v.length === 0) {
            console.error("[DEBUG] Non-draft post has no blocks");
            return false;
          }
          return v.every((block, index) => {
            if (!block || typeof block !== "object" || !block.type || !block.status) {
              console.error(`[DEBUG] Invalid block at index ${index}:`, block);
              return false;
            }
            return true;
          });
        },
        message: "Blocks must be a valid non-empty array with type and status for non-draft posts",
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

// Indexes
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ views: -1 });
postSchema.index({ isPublished: 1, category: 1 });
postSchema.index({ title: "text", excerpt: "text", tags: "text" });

postSchema.pre("save", async function (next) {
  if (this.isModified("title") || !this.slug) {
    let baseSlug = slugify(this.title, { lower: true, strict: true }).slice(0, 100);
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Post.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  next();
});

const PostModel = mongoose.models.Post || mongoose.model("Post", postSchema);
export default PostModel;