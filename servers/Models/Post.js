import mongoose from "mongoose";
import slugify from "slugify";

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
    blocked: { type: Boolean, default: false },
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
    question: {
      type: String,
      required: function () {
        return this.type === "poll";
      },
    },
    options: [
      {
        option: {
          type: String,
          required: function () {
            return this.parent().type === "poll";
          },
        },
        votes: { type: Number, default: 0 },
      },
    ],
    votedUserIds: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          votedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    items: { type: [String], default: [] },
    data: { type: [[String]], default: [] },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSubscriberOnly: { type: Boolean, default: false },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    thumbnail: String,
    excerpt: String,
    isPremium: { type: Boolean, default: false },
    readTime: String,
    blocked: { type: Boolean, default: false },
    message: String,
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    sharedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        sharedAt: { type: Date, default: Date.now },
        platform: {
          type: String,
          enum: [
            "copy",
            "whatsapp",
            "telegram",
            "twitter",
            "facebook",
            "linkedin",
            "other",
          ],
        },
      },
    ],
    timeSpent: { type: Number, default: 0 },
    blocks: {
      type: [blockSchema],
      default: [],
      validate: {
        validator: function (v) {
          if (!Array.isArray(v)) {
            console.error("[PostModel] Blocks is not an array:", v);
            return false;
          }
          return v.every((block, index) => {
            if (!block || typeof block !== "object" || !block.type) {
              console.error(`[PostModel] Invalid block at index ${index}:`, block);
              return false;
            }
            if (block.type === "poll" && (!block.question || !Array.isArray(block.options))) {
              console.error(`[PostModel] Invalid poll block at index ${index}:`, block);
              return false;
            }
            return true;
          });
        },
        message: "Blocks must be a valid array with required fields for each block type",
      },
    },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    readingTime: Number,
    language: { type: String, default: "en" },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: { type: [String], default: [] },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bookmarksCount: { type: Number, default: 0 },
    lastEditedAt: Date,
    allowComments: { type: Boolean, default: true },
    canonicalUrl: String,
  },
  {
    timestamps: true,
  }
);

postSchema.virtual("postType").get(function () {
  return this.isPremium || this.isSubscriberOnly ? "premium" : "free";
});

postSchema.set("toObject", { virtuals: true });
postSchema.set("toJSON", { virtuals: true });

postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ slug: 1, isPublished: 1 });
postSchema.index({ title: "text", excerpt: "text", tags: "text" });

postSchema.pre("save", async function (next) {
  if (this.isModified("title") || !this.slug) {
    let baseSlug = slugify(this.title, { lower: true, strict: true }).slice(0, 100);
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Post.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  // Only set isPublished to true if explicitly set or modified
  if (this.isModified("isPublished") && this.isPublished !== false) {
    this.isPublished = true;
  }

  // Ensure blocks is always an array
  if (!Array.isArray(this.blocks)) {
    console.warn("[PostModel] Blocks is not an array, setting to []:", this.blocks);
    this.blocks = [];
  }

  next();
});

const PostModel = mongoose.models.Post || mongoose.model("Post", postSchema);
export default PostModel;