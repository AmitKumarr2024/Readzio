// servers/models/PlaylistModel.js

import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Playlist name is required"],
      trim: true,
      maxlength: [100, "Playlist name cannot exceed 100 characters"],
      minlength: [1, "Playlist name cannot be empty"],
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
playlistSchema.index({ user: 1, name: 1 }, { unique: true });

// Index for searching public playlists
playlistSchema.index({ isPrivate: 1, createdAt: -1 });

// Text index for search functionality
playlistSchema.index({ name: "text", description: "text" });

// Index for user's playlists query
playlistSchema.index({ user: 1, createdAt: -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for post count
playlistSchema.virtual("postCount").get(function () {
  return this.posts ? this.posts.length : 0;
});

// Virtual for formatted creation date
playlistSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString();
});

// ============================================================================
// METHODS
// ============================================================================

/**
 * Check if a post exists in the playlist
 */
playlistSchema.methods.hasPost = function (postId) {
  return this.posts.some((post) => post.toString() === postId.toString());
};

/**
 * Add a post to the playlist (with duplicate check)
 */
playlistSchema.methods.addPost = async function (postId) {
  if (!this.hasPost(postId)) {
    this.posts.push(postId);
    await this.save();
    return true;
  }
  return false;
};

/**
 * Remove a post from the playlist
 */
playlistSchema.methods.removePost = async function (postId) {
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
playlistSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
};

/**
 * Toggle like (increment or decrement)
 */
playlistSchema.methods.toggleLike = async function (increment = true) {
  this.likeCount = Math.max(0, this.likeCount + (increment ? 1 : -1));
  await this.save();
};

/**
 * Increment share count
 */
playlistSchema.methods.incrementShares = async function () {
  this.shareCount += 1;
  await this.save();
};

// ============================================================================
// STATICS
// ============================================================================

/**
 * Find all public playlists
 */
playlistSchema.statics.findPublicPlaylists = function (options = {}) {
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
 * Find playlists by user with privacy filtering
 */
playlistSchema.statics.findUserPlaylists = function (userId, requestingUserId) {
  const query = { user: userId };

  // If requesting user is not the owner, only show public playlists
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
 * Search playlists by query
 */
playlistSchema.statics.searchPlaylists = function (searchQuery, options = {}) {
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
 * Get playlists containing a specific post
 */
playlistSchema.statics.findByPost = function (postId, userId = null) {
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
 * Get trending playlists (most viewed/liked)
 */
playlistSchema.statics.getTrendingPlaylists = function (options = {}) {
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
playlistSchema.pre("save", async function (next) {
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
playlistSchema.pre("remove", async function (next) {
  try {
    console.log(`[PlaylistModel] Cleaning up playlist: ${this._id}`);

    // Add any cleanup logic here (e.g., remove from user's saved playlists)
    // const User = mongoose.model("User");
    // await User.updateMany(
    //   { savedPlaylists: this._id },
    //   { $pull: { savedPlaylists: this._id } }
    // );

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Post-save middleware: Log creation/updates
 */
playlistSchema.post("save", function (doc) {
  if (this.isNew) {
    console.log(
      `[PlaylistModel] New playlist created: ${doc._id} - "${doc.name}"`
    );
  } else {
    console.log(`[PlaylistModel] Playlist updated: ${doc._id} - "${doc.name}"`);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

playlistSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("You already have a playlist with this name"));
  } else {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

const Playlist = mongoose.model("Playlist", playlistSchema);

export default Playlist;
