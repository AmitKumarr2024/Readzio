import mongoose from "mongoose";
import slugify from "slugify";

// Defines schema for content blocks within a post
const blockSchema = new mongoose.Schema(
  {
    // Unique block identifier
    id: { type: String, required: true },
    // Type of content block
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
    // Indicates if block is blocked
    blocked: { type: Boolean, default: false },
    // Generic value field
    value: String,
    // Heading level for heading blocks
    level: Number,
    // Text content
    text: String,
    // Code content
    code: String,
    // Caption for media blocks
    caption: String,
    // Source URL for media
    src: String,
    // Hyperlink URL
    href: String,
    // URL alias
    url: String,
    // File name
    name: String,
    // File size
    size: Number,
    // Indicates if list is ordered
    ordered: Boolean,
    // Author of quote
    author: String,
    // Poll question
    question: {
      type: String,
      required: function () {
        return this.type === "poll";
      },
    },
    // Poll options with vote counts
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
    // Users who voted in the poll
    votedUserIds: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          votedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // List items
    items: { type: [String], default: [] },
    // Table data
    data: { type: [[String]], default: [] },
  },
  { _id: false } // No separate _id for subdocuments
);

// Defines schema for posts
const postSchema = new mongoose.Schema(
  {
    // Post title
    title: { type: String, required: true },
    // Unique URL-friendly slug
    slug: { type: String, required: true, unique: true },
    // Post author
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Indicates if post is subscriber-only
    isSubscriberOnly: { type: Boolean, default: false },
    // Post category
    category: { type: String, required: true },
    // Post tags
    tags: { type: [String], default: [] },
    // Thumbnail image URL
    thumbnail: String,
    // Post excerpt
    excerpt: String,
    // Indicates if post is premium
    isPremium: { type: Boolean, default: false },
    // Estimated reading time
    readTime: String,
    // Indicates if post is blocked
    blocked: { type: Boolean, default: false },
    // Moderation message
    message: String,
    // Number of views
    viewsCount: { type: Number, default: 0 },
    // Number of likes
    likesCount: { type: Number, default: 0 },
    // Number of comments
    commentsCount: { type: Number, default: 0 },
    // Number of shares
    shareCount: { type: Number, default: 0 },
    // Users who shared the post
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
    // Total time spent on post
    timeSpent: { type: Number, default: 0 },
    // Content blocks
    blocks: {
      type: [blockSchema],
      default: [],
      validate: {
        validator: function (v) {
          if (!Array.isArray(v)) {
            return false;
          }
          return v.every((block, index) => {
            if (!block || typeof block !== "object" || !block.type) {
              return false;
            }
            if (block.type === "poll" && (!block.question || !Array.isArray(block.options))) {
              return false;
            }
            return true;
          });
        },
        message: "Blocks must be a valid array with required fields for each block type",
      },
    },
    // Indicates if post is published
    isPublished: { type: Boolean, default: false },
    // Indicates if post is featured
    isFeatured: { type: Boolean, default: false },
    // Indicates if post is pinned
    isPinned: { type: Boolean, default: false },
    // Reading time in minutes
    readingTime: Number,
    // Post language
    language: { type: String, default: "en" },
    // SEO meta title
    metaTitle: String,
    // SEO meta description
    metaDescription: String,
    // SEO meta keywords
    metaKeywords: { type: [String], default: [] },
    // Users who liked the post
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Number of bookmarks
    bookmarksCount: { type: Number, default: 0 },
    // Timestamp of last edit
    lastEditedAt: Date,
    // Indicates if comments are allowed
    allowComments: { type: Boolean, default: true },
    // Canonical URL for SEO
    canonicalUrl: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Virtual field for post type (premium or free)
postSchema.virtual("postType").get(function () {
  return this.isPremium || this.isSubscriberOnly ? "premium" : "free";
});

// Enables virtuals in JSON and object output
postSchema.set("toObject", { virtuals: true });
postSchema.set("toJSON", { virtuals: true });

// Indexes for efficient querying
postSchema.index({ author: 1 }); // For author-based queries
postSchema.index({ category: 1 }); // For category-based queries
postSchema.index({ slug: 1, isPublished: 1 }); // For published post lookups
postSchema.index({ title: "text", excerpt: "text", tags: "text" }); // For full-text search

// Pre-save hook to generate unique slug and ensure valid blocks
postSchema.pre("save", async function (next) {
  // Generates unique slug from title
  if (this.isModified("title") || !this.slug) {
    let baseSlug = slugify(this.title, { lower: true, strict: true }).slice(0, 100);
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Post.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  // Ensures isPublished is set correctly
  if (this.isModified("isPublished") && this.isPublished !== false) {
    this.isPublished = true;
  }

  // Ensures blocks is an array
  if (!Array.isArray(this.blocks)) {
    this.blocks = [];
  }

  next();
});

// Creates and exports the Post model
const PostModel = mongoose.models.Post || mongoose.model("Post", postSchema);
export default PostModel;