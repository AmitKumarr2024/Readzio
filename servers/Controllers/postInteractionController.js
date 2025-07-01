import PostModel from "../Models/Post.js";
import UserModel from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "../utils/createNotification.js";

export const toggleLike = async (req, res, next) => {

   console.log(`[toggleLike] PostId: ${req.params.postId}`);
  console.log("[Post:toggleLike] Starting", {
    userId: req.user._id,
    postId: req.params.postId,
  });
  try {
    const userId = req.user._id;
    const { postId } = req.params;
    console.log("[Post:toggleLike] Fetching post");
    const post = await PostModel.findById(postId).select(
      "likes author isPublished isSubscriberOnly slug title"
    );
    if (!post || !post.isPublished) {
      console.error("[Post:toggleLike] Post not found");
      throw new AppError("Post not found or unpublished", 404);
    }
    console.log("[Post:toggleLike] Post details:", {
      postId,
      author: post.author,
    });
    console.log("[Post:toggleLike] Checking access:", {
      isSubscriberOnly: post.isSubscriberOnly,
    });
    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author?.toString())
    ) {
      console.error("[Post:toggleLike] Access denied");
      throw new AppError("Post for subscribers only", 403);
    }
    const alreadyLiked = post.likes.includes(userId);
    console.log("[Post:toggleLike] Like status:", { alreadyLiked });
    await PostModel.findByIdAndUpdate(postId, {
      [alreadyLiked ? "$pull" : "$addToSet"]: { likes: userId },
    });
    if (!alreadyLiked && post.author) {
      console.log("[Post:toggleLike] Creating notification");
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "like",
        post: postId,
      });
      if (notification) {
        console.log("[Post:toggleLike] Notification:", {
          notificationId: notification._id,
        });
        console.log("[Post:toggleLike] Emitting to:", post.author.toString());
        req.io.to(post.author.toString()).emit("newNotification", {
          _id: notification._id,
          type: "like",
          post: { _id: postId, slug: post.slug, title: post.title },
          sender: { _id: userId, name: req.user.name, avatar: req.user.avatar },
          read: false,
          createdAt: new Date(),
        });
      } else {
        console.warn("[Post:toggleLike] Notification skipped", { postId });
      }
    } else if (!post.author) {
      console.warn("[Post:toggleLike] Skipping notification: no author", {
        postId,
      });
    }
    console.log("[Post:toggleLike] Fetching updated post");
    const updatedPost = await PostModel.findById(postId).select("likes");
    console.log("[Post:toggleLike] Responding");
    return res.status(200).json({
      success: true,
      likesCount: updatedPost.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error("[Post:toggleLike] Error:", {
      error: error.message,
      stack: error.stack,
    });
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

export const toggleBookmark = async (req, res, next) => {
  console.log(`[toggleBookmark] PostId: ${req.params.postId}`);
  console.log("[Post:toggleBookmark] Starting", {
    userId: req.user._id,
    postId: req.params.postId,
  });
  try {
    const userId = req.user._id;
    const { postId } = req.params;
    console.log("[Post:toggleBookmark] Fetching user");
    const user = await UserModel.findById(userId).select("bookmarks");
    if (!user) {
      console.error("[Post:toggleBookmark] User not found");
      throw new AppError("User not found", 400404);
    }
    console.log("[Post:toggleBookmark] Fetching post");
    const post = await PostModel.findById(postId).select(
      "isPublished isSubscriberOnly author bookmarksCount slug title"
    );
    if (!post || !post.isPublished) {
      console.error("[Post:toggleBookmark] Post not found");
      throw new AppError("Post not found or unpublished", 404);
    }
    console.log("[Post:toggleBookmark] Post details:", {
      postId,
      author: post.author,
    });
    console.log("[Post:toggleBookmark] Checking access:", {
      isSubscriberOnly: post.isSubscriberOnly,
    });
    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author?.toString())
    ) {
      console.error("[Post:toggleBookmark] Access denied");
      throw new AppError("Post for subscribers only", 403);
    }
    const isBookmarked = user.bookmarks.includes(postId);
    console.log("[Post:toggleBookmark] Bookmark status:", { isBookmarked });
    await Promise.all([
      UserModel.findByIdAndUpdate(userId, {
        [isBookmarked ? "$pull" : "$push"]: { bookmarks: postId },
      }),
      PostModel.findByIdAndUpdate(postId, {
        $inc: { bookmarksCount: isBookmarked ? -1 : 1 },
      }),
    ]);
    if (!isBookmarked && post.author) {
      console.log("[Post:toggleBookmark] Creating notification");
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "bookmark",
        post: postId,
      });
      if (notification) {
        console.log("[Post:toggleBookmark] Notification:", {
          notificationId: notification._id,
        });
        console.log(
          "[Post:toggleBookmark] Emitting to:",
          post.author.toString()
        );
        req.io.to(post.author.toString()).emit("newNotification", {
          _id: notification._id,
          type: "bookmark",
          post: { _id: postId, slug: post.slug, title: post.title },
          sender: { _id: userId, name: req.user.name, avatar: req.user.avatar },
          read: false,
          createdAt: new Date(),
        });
      } else {
        console.warn("[Post:toggleBookmark] Notification failed", { postId });
      }
    } else if (!post.author) {
      console.warn("[Post:toggleBookmark] Skipping notification: no author", {
        postId,
      });
    }
    console.log("[Post:toggleBookmark] Fetching updated post");
    const updatedPost = await PostModel.findById(postId).select(
      "bookmarksCount"
    );
    console.log("[Post:toggleBookmark] Responding");
    res.status(200).json({
      success: true,
      bookmarksCount: updatedPost.bookmarksCount,
      bookmarked: !isBookmarked,
    });
  } catch (error) {
    console.error("[Post:toggleBookmark] Error:", {
      error: error.message,
      stack: error.stack,
    });
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

export const incrementView = async (req, res, next) => {
  console.log(`[incrementView] Slug: ${req.params.slug}`); // Debug
  try {
    const { slug } = req.params;
    const userId = req.user?._id;

    const post = await PostModel.findOne({ slug })
      .select("author views isPublished")
      .lean();
    if (!post || !post.isPublished)
      throw new AppError("Post not found or unpublished", 404);

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

export const getBookmarkedPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { page = 1, limit = 10 } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.max(1, Math.min(50, parseInt(limit)));

    const user = await UserModel.findById(userId).select("bookmarks").lean();
    if (!user) throw new AppError("User not found", 404);

    const posts = await PostModel.find({
      _id: { $in: user.bookmarks },
      isPublished: true,
    })
      .select("title slug excerpt thumbnail author views likes createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const enrichedPosts = posts.map((post) => ({
      _id: post._id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      thumbnail: post.thumbnail,
      author: post.author,
      views: post.views,
      createdAt: post.createdAt,
      likesCount: post.likes.length,
      liked: post.likes.includes(userId),
      bookmarked: true,
    }));

    const total = await PostModel.countDocuments({
      _id: { $in: user.bookmarks },
      isPublished: true,
    });

    res.status(200).json({
      success: true,
      posts: enrichedPosts,
      total,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

export const getBookmarkStatus = async (req, res, next) => {
   console.log(`[getBookmarkStatus] PostId: ${req.params.postId}`);
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const user = await UserModel.findById(userId).select("bookmarks").lean();
    if (!user) throw new AppError("User not found", 404);

    const post = await PostModel.findById(postId)
      .select("likes bookmarksCount isPublished isSubscriberOnly author")
      .lean();
    if (!post || !post.isPublished)
      throw new AppError("Post not found or unpublished", 404);
    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author?.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    res.status(200).json({
      success: true,
      bookmarked: user.bookmarks.includes(postId),
      bookmarksCount: post.bookmarksCount,
      liked: post.likes.includes(userId),
      likesCount: post.likes.length,
    });
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

export const getSuggestedPosts = async (req, res, next) => {
  try {
    const { category, exclude, limit = 4 } = req.query;

    const posts = await PostModel.find({
      category,
      isPublished: true,
      _id: { $ne: exclude },
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("title slug category thumbnail views createdAt")
      .lean();

    res.status(200).json({ success: true, posts });
  } catch (error) {
    next(new AppError("Failed to fetch suggested posts", 500));
  }
};
