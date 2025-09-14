import mongoose from "mongoose";
import slugify from "slugify";

// -----------------------
// Block Schema
// -----------------------
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

    // Common fields
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

    // Poll-specific
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

    // List-specific
    items: { type: [String], default: [] },

    // Table-specific
    data: {
      type: [[String]],
      default: [],
      validate: {
        validator: function (v) {
          if (this.type === "table") {
            return (
              Array.isArray(v) &&
              v.length > 0 &&
              v.every((row) => Array.isArray(row) && row.length > 0)
            );
          }
          return true;
        },
        message:
          "Table block data must be a non-empty array of non-empty arrays",
      },
    },
  },
  { _id: false }
);

// -----------------------
// Post Schema
// -----------------------
const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postType: {
      type: String,
      enum: ["Article", "Blog"],
      default: "Blog",
    },

    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    thumbnail: String,
    excerpt: String,

    // Access / Monetization
    isSubscriberOnly: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },

    // Engagement
    readTime: String,
    readingTime: Number,
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    bookmarksCount: { type: Number, default: 0 },
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

    // Moderation
    blocked: { type: Boolean, default: false },
    message: String,
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    blockedAt: Date,

    // Content blocks
    blocks: {
      type: [blockSchema],
      default: [],
      validate: {
        validator: function (v) {
          if (!Array.isArray(v)) return false;
          return v.every((block) => {
            if (!block || typeof block !== "object" || !block.type) {
              return false;
            }
            if (
              block.type === "poll" &&
              (!block.question || !Array.isArray(block.options))
            ) {
              return false;
            }
            return true;
          });
        },
        message:
          "Blocks must be a valid array with required fields for each block type",
      },
    },

    // Publication flags
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },

    // SEO
    language: { type: String, default: "en" },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: { type: [String], default: [] },
    canonicalUrl: String,
    ogImage: String,

    // Misc
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    timeSpent: { type: Number, default: 0 },
    lastEditedAt: Date,
  },
  { timestamps: true }
);

// -----------------------
// Indexes
// -----------------------
postSchema.set("toObject", { virtuals: true });
postSchema.set("toJSON", { virtuals: true });

postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ slug: 1, isPublished: 1 });
postSchema.index({ title: "text", excerpt: "text", tags: "text" });
postSchema.index({ isPublished: 1, createdAt: -1 }); // For feed queries

// -----------------------
// Pre-Save Hooks
// -----------------------
postSchema.pre("save", async function (next) {
  // Generate slug only on creation
  if (this.isNew || (this.isModified("title") && !this.slug)) {
    let baseSlug = slugify(this.title, { lower: true, strict: true }).slice(
      0,
      100
    );
    let slug = baseSlug;
    let counter = 1;

    while (
      await mongoose.models.Post.findOne({ slug, _id: { $ne: this._id } })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  // Normalize isPublished
  if (this.isModified("isPublished")) {
    this.isPublished = !!this.isPublished;
  }

  // Ensure blocks array
  if (!Array.isArray(this.blocks)) {
    this.blocks = [];
  }

  // Ensure default postType
  if (!this.postType) {
    this.postType = "Blog";
  }

  next();
});

const PostModel = mongoose.models.Post || mongoose.model("Post", postSchema);
export default PostModel;
