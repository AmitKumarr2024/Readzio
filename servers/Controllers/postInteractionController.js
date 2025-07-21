import PostModel from "../Models/Post.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "../utils/createNotification.js";
import { recordActivity } from "../helpers/activityHelper.js";

// Toggle Like
export const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new AppError("You must be signed in to access this feature. to like a post", 401);
    }

    const post = await PostModel.findById(postId).select("likes author isPublished isSubscriberOnly slug title blocked");
    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }

    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author?.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    const alreadyLiked = post.likes.includes(userId);
    await PostModel.findByIdAndUpdate(postId, {
      [alreadyLiked ? "$pull" : "$addToSet"]: { likes: userId },
    });

    if (!alreadyLiked && post.author) {
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "like",
        post: postId,
      });

      if (notification) {
        req.io.to(post.author.toString()).emit("newNotification", {
          _id: notification._id,
          type: "like",
          post: { _id: postId, slug: post.slug, title: post.title },
          sender: {
            _id: userId,
            name: req.user.name,
            avatar: req.user.avatar,
          },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    const updatedPost = await PostModel.findById(postId).select("likes");

    res.status(200).json({
      success: true,
      likesCount: updatedPost.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Toggle Bookmark
export const toggleBookmark = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new AppError("You must be signed in to access this feature. to bookmark a post", 401);
    }

    const user = await UserModel.findById(userId).select("bookmarks");
    if (!user) throw new AppError("User not found", 404);

    const post = await PostModel.findById(postId).select("isPublished isSubscriberOnly author bookmarksCount slug title blocked");
    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }

    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author?.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    const isBookmarked = user.bookmarks.includes(postId);

    await Promise.all([
      UserModel.findByIdAndUpdate(userId, {
        [isBookmarked ? "$pull" : "$push"]: { bookmarks: postId },
      }),
      PostModel.findByIdAndUpdate(postId, {
        $inc: { bookmarksCount: isBookmarked ? -1 : 1 },
      }),
    ]);

    if (!isBookmarked && post.author) {
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "bookmark",
        post: postId,
      });

      if (notification) {
        req.io.to(post.author.toString()).emit("newNotification", {
          _id: notification._id,
          type: "bookmark",
          post: { _id: postId, slug: post.slug, title: post.title },
          sender: {
            _id: userId,
            name: req.user.name,
            avatar: req.user.avatar,
          },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    const updatedPost = await PostModel.findById(postId).select("bookmarksCount");

    res.status(200).json({
      success: true,
      bookmarksCount: updatedPost.bookmarksCount,
      bookmarked: !isBookmarked,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Increment View
export const incrementView = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id;

    const post = await PostModel.findOne({ slug })
      .select("author views isPublished blocked")
      .lean();

    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }

    if (userId && post.author?.toString() === userId.toString()) {
      return res.status(200).json({ success: true, views: post.views });
    }

    const updatedPost = await PostModel.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true, select: "views" }
    );

    res.status(200).json({ success: true, views: updatedPost.views });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Get Bookmarked Posts
export const getBookmarkedPosts = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError("You must be signed in to access this feature.", 401);
    }

    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, Math.min(50, parseInt(limit)));

    const user = await UserModel.findById(userId).select("bookmarks").lean();
    if (!user) throw new AppError("User not found", 404);

    const posts = await PostModel.find({
      _id: { $in: user.bookmarks },
      isPublished: true,
      blocked: false,
    })
      .select("title slug excerpt thumbnail author views likes createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const enrichedPosts = posts.map((post) => ({
      ...post,
      likesCount: post.likes.length,
      liked: post.likes.includes(userId),
      bookmarked: true,
    }));

    const total = await PostModel.countDocuments({
      _id: { $in: user.bookmarks },
      isPublished: true,
      blocked: false,
    });

    res.status(200).json({ success: true, posts: enrichedPosts, total });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Get Bookmark + Like Status
export const getBookmarkStatus = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;

    const post = await PostModel.findById(postId)
      .select("likes bookmarksCount isPublished isSubscriberOnly author blocked")
      .lean();

    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }

    if (
      post.isSubscriberOnly &&
      userId &&
      !req.user.subscribedAuthors.includes(post.author?.toString() || "")
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    let bookmarked = false;
    let likesCount = post.likes?.length || 0;
    let liked = userId ? post.likes?.includes(userId) || false : false;

    if (userId) {
      const user = await UserModel.findById(userId).select("bookmarks").lean();
      if (!user) throw new AppError("User not found", 404);
      bookmarked = user.bookmarks?.includes(postId) || false;
    }

    res.status(200).json({
      success: true,
      bookmarked,
      bookmarksCount: post.bookmarksCount || 0,
      liked,
      likesCount,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Increment Share
export const incrementShare = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError("You must be signed in to access this feature. to share a post", 401);
    }

    const post = await PostModel.findById(postId).select("isPublished blocked shareCount author slug title");
    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true, select: "shareCount" }
    );

    if (post.author) {
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "share",
        post: postId,
      });

      if (notification) {
        req.io.to(post.author.toString()).emit("newNotification", {
          _id: notification._id,
          type: "share",
          post: { _id: postId, slug: post.slug, title: post.title },
          sender: {
            _id: userId,
            name: req.user.name,
            avatar: req.user.avatar,
          },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    res.status(200).json({
      success: true,
      shareCount: updatedPost.shareCount,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Get Suggested Posts
export const getSuggestedPosts = async (req, res, next) => {
  try {
    const { category, exclude, limit = 4 } = req.query;

    const posts = await PostModel.find({
      category,
      isPublished: true,
      blocked: false,
      _id: { $ne: exclude },
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select("title slug category thumbnail views createdAt")
      .lean();

    res.status(200).json({ success: true, posts });
  } catch (error) {
    next(new AppError("Failed to fetch suggested posts", 500));
  }
};

// Toggle Block Inside Post Content
export const toggleBlockInPost = async (req, res, next) => {
  try {
    const { postId, blockId } = req.params;
    const { user } = req;

    if (!user || user.role !== "admin") {
      throw new AppError("Admin You must be signed in to access this feature.", 401);
    }

    const post = await PostModel.findById(postId);
    if (!post) throw new AppError("Post not found", 404);

    const block = post.blocks.find((b) => b.id === blockId);
    if (!block) throw new AppError("Block not found", 404);

    block.blocked = !block.blocked;
    await post.save();

    await recordActivity?.({
      userId: user._id,
      action: block.blocked ? "BLOCK_BLOCKED" : "BLOCK_UNBLOCKED",
      targetPost: post._id,
      message: `${block.blocked ? "Blocked" : "Unblocked"} block in post: ${post.title}`,
    });

    res.status(200).json({
      success: true,
      message: `Block ${block.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("Failed to toggle block", 500));
  }
};