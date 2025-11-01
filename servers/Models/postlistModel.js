// servers/models/postlistModel.js

import mongoose from "mongoose";

const postlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "postlist name is required"],
      trim: true,
      maxlength: [100, "postlist name cannot exceed 100 characters"],
      minlength: [1, "postlist name cannot be empty"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    coverImage: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound index for user + name uniqueness
postlistSchema.index({ user: 1, name: 1 }, { unique: true });

// Index for searching public postlists
postlistSchema.index({ isPrivate: 1, createdAt: -1 });

// Text index for search functionality
postlistSchema.index({ name: "text", description: "text" });

// Index for user's postlists query
postlistSchema.index({ user: 1, createdAt: -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for post count
postlistSchema.virtual("postCount").get(function () {
  return this.posts ? this.posts.length : 0;
});

// Virtual for formatted creation date
postlistSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString();
});

// ============================================================================
// METHODS
// ============================================================================

/**
 * Check if a post exists in the postlist
 */
postlistSchema.methods.hasPost = function (postId) {
  return this.posts.some((post) => post.toString() === postId.toString());
};

/**
 * Add a post to the postlist (with duplicate check)
 */
postlistSchema.methods.addPost = async function (postId) {
  if (!this.hasPost(postId)) {
    this.posts.push(postId);
    await this.save();
    return true;
  }
  return false;
};

/**
 * Remove a post from the postlist
 */
postlistSchema.methods.removePost = async function (postId) {
  const initialLength = this.posts.length;
  this.posts = this.posts.filter(
    (post) => post.toString() !== postId.toString()
  );

  if (this.posts.length < initialLength) {
    await this.save();
    return true;
  }
  return false;
};

/**
 * Increment view count
 */
postlistSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
};

/**
 * Toggle like (increment or decrement)
 */
postlistSchema.methods.toggleLike = async function (increment = true) {
  this.likeCount = Math.max(0, this.likeCount + (increment ? 1 : -1));
  await this.save();
};

/**
 * Increment share count
 */
postlistSchema.methods.incrementShares = async function () {
  this.shareCount += 1;
  await this.save();
};

// ============================================================================
// STATICS
// ============================================================================

/**
 * Find all public postlists
 */
postlistSchema.statics.findPublicpostlists = function (options = {}) {
  const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;

  return this.find({ isPrivate: false })
    .populate("user", "name avatar")
    .populate({
      path: "posts",
      select: "title coverImage",
      options: { limit: 3 },
    })
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

/**
 * Find postlists by user with privacy filtering
 */
postlistSchema.statics.findUserpostlists = function (userId, requestingUserId) {
  const query = { user: userId };

  // If requesting user is not the owner, only show public postlists
  if (!requestingUserId || requestingUserId.toString() !== userId.toString()) {
    query.isPrivate = false;
  }

  return this.find(query)
    .populate("user", "name avatar")
    .populate({
      path: "posts",
      select: "title description category coverImage author createdAt",
      populate: {
        path: "author",
        select: "name avatar",
      },
    })
    .sort({ createdAt: -1 });
};

/**
 * Search postlists by query
 */
postlistSchema.statics.searchpostlists = function (searchQuery, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.find({
    isPrivate: false,
    $text: { $search: searchQuery },
  })
    .populate("user", "name avatar")
    .populate({
      path: "posts",
      select: "title coverImage",
      options: { limit: 3 },
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .skip(skip);
};

/**
 * Get postlists containing a specific post
 */
postlistSchema.statics.findByPost = function (postId, userId = null) {
  const query = { posts: postId };

  // If userId provided, filter by user and respect privacy
  if (userId) {
    query.$or = [{ user: userId }, { isPrivate: false }];
  } else {
    query.isPrivate = false;
  }

  return this.find(query)
    .populate("user", "name avatar")
    .select("_id name user isPrivate postCount");
};

/**
 * Get trending postlists (most viewed/liked)
 */
postlistSchema.statics.getTrendingpostlists = function (options = {}) {
  const { limit = 10, days = 30 } = options;
  const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    isPrivate: false,
    createdAt: { $gte: dateThreshold },
  })
    .populate("user", "name avatar")
    .populate({
      path: "posts",
      select: "title coverImage",
      options: { limit: 3 },
    })
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(limit);
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware: Auto-generate cover image from first post
 */
postlistSchema.pre("save", async function (next) {
  try {
    // If no cover image and has posts, use first post's cover
    if (!this.coverImage && this.posts && this.posts.length > 0) {
      const Post = mongoose.model("Post");
      const firstPost = await Post.findById(this.posts[0]).select("coverImage");

      if (firstPost && firstPost.coverImage) {
        this.coverImage = firstPost.coverImage;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-remove middleware: Clean up related data
 */
postlistSchema.pre("remove", async function (next) {
  try {
    console.log(`[postlistModel] Cleaning up postlist: ${this._id}`);

    // Add any cleanup logic here (e.g., remove from user's saved postlists)
    // const User = mongoose.model("User");
    // await User.updateMany(
    //   { savedpostlists: this._id },
    //   { $pull: { savedpostlists: this._id } }
    // );

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Post-save middleware: Log creation/updates
 */
postlistSchema.post("save", function (doc) {
  if (this.isNew) {
    console.log(
      `[postlistModel] New postlist created: ${doc._id} - "${doc.name}"`
    );
  } else {
    console.log(`[postlistModel] postlist updated: ${doc._id} - "${doc.name}"`);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

postlistSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("You already have a postlist with this name"));
  } else {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

const postlist = mongoose.model("postlist", postlistSchema);

export default postlist;
