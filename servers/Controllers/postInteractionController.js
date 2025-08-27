import PostModel from "../../servers/Models/Post.js";
import UserModel from "../../servers/Models/User.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { createNotification } from "../../servers/Utils/createNotification.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { logMemory } from "../../servers/Utils/memoryLogger.js"; // Import logMemory

// Toggle Like
export const toggleLike = async (req, res, next) => {
  try {
    logMemory("👍 Start toggleLike");
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId || !req.user) {
      throw new AppError("You must be signed in to like a post", 401);
    }
    if (!mongoose.isValidObjectId(postId)) {
      throw new AppError("Invalid post ID", 400);
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId)
      .select("likes author isPublished isSubscriberOnly slug title blocked")
      .lean();
    logMemory("📖 After fetching post");
    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }
    if (!post.author) {
      throw new AppError("Post author not found", 400);
    }
    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    const alreadyLiked = post.likes.includes(userId);
    logMemory("💾 Before updating likes");
    await PostModel.findByIdAndUpdate(postId, {
      [alreadyLiked ? "$pull" : "$addToSet"]: { likes: userId },
    });
    logMemory("💾 After updating likes");

    if (!alreadyLiked && post.author) {
      logMemory("📬 Before creating notification");
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "like",
        post: postId,
      });
      logMemory("📬 After creating notification");

      if (notification) {
        logMemory("📡 Before emitting notification");
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
        logMemory("📡 After emitting notification");
      }
    }

    logMemory("📖 Before fetching updated post");
    const updatedPost = await PostModel.findById(postId).select("likes").lean();
    logMemory("📖 After fetching updated post");

    logMemory("👍 End toggleLike");
    res.status(200).json({
      success: true,
      likesCount: updatedPost.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    logMemory("❌ Error in toggleLike");
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Toggle Bookmark
export const toggleBookmark = async (req, res, next) => {
  try {
    logMemory("📑 Start toggleBookmark");
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId || !req.user) {
      throw new AppError("You must be signed in to bookmark a post", 401);
    }
    if (!mongoose.isValidObjectId(postId)) {
      throw new AppError("Invalid post ID", 400);
    }

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).select("bookmarks").lean();
    logMemory("📖 After fetching user");
    if (!user) throw new AppError("User not found", 404);

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId)
      .select(
        "isPublished isSubscriberOnly author bookmarksCount slug title blocked"
      )
      .lean();
    logMemory("📖 After fetching post");
    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }
    if (!post.author) {
      throw new AppError("Post author not found", 400);
    }
    if (
      post.isSubscriberOnly &&
      !req.user.subscribedAuthors.includes(post.author.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    const isBookmarked = user.bookmarks.includes(postId);

    logMemory("💾 Before updating bookmarks");
    await Promise.all([
      UserModel.findByIdAndUpdate(userId, {
        [isBookmarked ? "$pull" : "$push"]: { bookmarks: postId },
      }),
      PostModel.findByIdAndUpdate(postId, {
        $inc: { bookmarksCount: isBookmarked ? -1 : 1 },
      }),
    ]);
    logMemory("💾 After updating bookmarks");

    if (!isBookmarked && post.author) {
      logMemory("📬 Before creating notification");
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "bookmark",
        post: postId,
      });
      logMemory("📬 After creating notification");

      if (notification) {
        logMemory("📡 Before emitting notification");
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
        logMemory("📡 After emitting notification");
      }
    }

    logMemory("📖 Before fetching updated post");
    const updatedPost = await PostModel.findById(postId)
      .select("bookmarksCount")
      .lean();
    logMemory("📖 After fetching updated post");

    logMemory("📑 End toggleBookmark");
    res.status(200).json({
      success: true,
      bookmarksCount: updatedPost.bookmarksCount,
      bookmarked: !isBookmarked,
    });
  } catch (error) {
    logMemory("❌ Error in toggleBookmark");
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Increment View
export const incrementView = async (req, res, next) => {
  try {
    logMemory("👀 Start incrementView");
    const { slug } = req.params;
    const userId = req.user?._id;

    logMemory("📖 Before fetching post");
    const post = await PostModel.findOne({ slug })
      .select("author views isPublished blocked isSubscriberOnly")
      .lean();
    logMemory("📖 After fetching post");

    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }
    if (!post.author) {
      throw new AppError("Post author not found", 400);
    }
    if (
      post.isSubscriberOnly &&
      userId &&
      !req.user.subscribedAuthors.includes(post.author.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    if (userId && post.author?.toString() === userId.toString()) {
      logMemory("👀 Skipping view increment for author");
      return res.status(200).json({ success: true, views: post.views });
    }

    logMemory("💾 Before updating views");
    const updatedPost = await PostModel.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true, select: "views" }
    ).lean();
    logMemory("💾 After updating views");

    logMemory("👀 End incrementView");
    res.status(200).json({ success: true, views: updatedPost.views });
  } catch (error) {
    logMemory("❌ Error in incrementView");
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Get Bookmarked Posts
export const getBookmarkedPosts = async (req, res, next) => {
  try {
    logMemory("📚 Start getBookmarkedPosts");
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError("You must be signed in to access this feature.", 401);
    }

    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, Math.min(50, parseInt(limit)));

    logMemory("📖 Before fetching user");
    const user = await UserModel.findById(userId).select("bookmarks").lean();
    logMemory("📖 After fetching user");
    if (!user) throw new AppError("User not found", 404);

    logMemory("📖 Before fetching bookmarked posts");
    const posts = await PostModel.find({
      _id: { $in: user.bookmarks },
      isPublished: true,
      blocked: false,
    })
      .select("title slug excerpt thumbnail author views likes createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    logMemory("📖 After fetching bookmarked posts");

    logMemory("📄 Before enriching posts");
    const enrichedPosts = posts.map((post) => {
      logMemory(`📄 Processing post ${post._id}`);
      return {
        ...post,
        likesCount: post.likes.length,
        liked: post.likes.includes(userId),
        bookmarked: true,
      };
    });
    logMemory("📄 After enriching posts");

    logMemory("📖 Before counting total bookmarked posts");
    const total = await PostModel.countDocuments({
      _id: { $in: user.bookmarks },
      isPublished: true,
      blocked: false,
    });
    logMemory("📖 After counting total bookmarked posts");

    logMemory("📚 End getBookmarkedPosts");
    res.status(200).json({ success: true, posts: enrichedPosts, total });
  } catch (error) {
    logMemory("❌ Error in getBookmarkedPosts");
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Get Bookmark + Like Status
export const getBookmarkStatus = async (req, res, next) => {
  try {
    logMemory("🔍 Start getBookmarkStatus");
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      throw new AppError("Invalid post ID", 400);
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId)
      .select(
        "likes bookmarksCount isPublished isSubscriberOnly author blocked"
      )
      .lean();
    logMemory("📖 After fetching post");

    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }
    if (!post.author) {
      throw new AppError("Post author not found", 400);
    }
    if (
      post.isSubscriberOnly &&
      userId &&
      !req.user.subscribedAuthors.includes(post.author.toString())
    ) {
      throw new AppError("Post is for subscribers only", 403);
    }

    let bookmarked = false;
    let likesCount = post.likes?.length || 0;
    let liked = userId ? post.likes?.includes(userId) || false : false;

    if (userId) {
      logMemory("📖 Before fetching user");
      const user = await UserModel.findById(userId).select("bookmarks").lean();
      logMemory("📖 After fetching user");
      if (!user) throw new AppError("User not found", 404);
      bookmarked = user.bookmarks?.includes(postId) || false;
    }

    logMemory("🔍 End getBookmarkStatus");
    res.status(200).json({
      success: true,
      bookmarked,
      bookmarksCount: post.bookmarksCount || 0,
      liked,
      likesCount,
    });
  } catch (error) {
    logMemory("❌ Error in getBookmarkStatus");
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Increment Share
export const incrementShare = async (req, res, next) => {
  try {
    logMemory("📤 Start incrementShare");
    const { postId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError(
        "You must be signed in to access this feature. to share a post",
        401
      );
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId).select(
      "isPublished blocked shareCount author slug title"
    );
    logMemory("📖 After fetching post");
    if (!post || !post.isPublished || post.blocked) {
      throw new AppError("Post not found or unavailable", 404);
    }

    logMemory("💾 Before updating share count");
    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true, select: "shareCount" }
    );
    logMemory("💾 After updating share count");

    if (post.author) {
      logMemory("📬 Before creating notification");
      const notification = await createNotification({
        user: post.author,
        sender: userId,
        type: "share",
        post: postId,
      });
      logMemory("📬 After creating notification");

      if (notification) {
        logMemory("📡 Before emitting notification");
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
        logMemory("📡 After emitting notification");
      }
    }

    logMemory("📤 End incrementShare");
    res.status(200).json({
      success: true,
      shareCount: updatedPost.shareCount,
    });
  } catch (error) {
    logMemory("❌ Error in incrementShare");
    next(error instanceof AppError ? error : new AppError(error.message, 500));
  }
};

// Get Suggested Posts
export const getSuggestedPosts = async (req, res, next) => {
  try {
    logMemory("📜 Start getSuggestedPosts");
    const { category, exclude, limit = 4, page = 1 } = req.query;
    const userId = req.user?._id;

    const query = {
      category,
      isPublished: true,
      blocked: false,
      _id: { $ne: exclude },
    };
    if (userId) {
      query.$or = [
        { isSubscriberOnly: false },
        { author: { $in: req.user.subscribedAuthors } },
      ];
    } else {
      query.isSubscriberOnly = false;
    }

    logMemory("📖 Before fetching suggested posts");
    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select("title slug category thumbnail views createdAt")
      .lean();
    logMemory("📖 After fetching suggested posts");

    const total = await PostModel.countDocuments(query);
    logMemory("📜 End getSuggestedPosts");
    res.status(200).json({ success: true, posts, total });
  } catch (error) {
    logMemory("❌ Error in getSuggestedPosts");
    next(new AppError("Failed to fetch suggested posts", 500));
  }
};

// Toggle Block Inside Post Content
export const toggleBlockInPost = async (req, res, next) => {
  try {
    logMemory("🚫 Start toggleBlockInPost");
    const { postId, blockId } = req.params;
    const { user } = req;

    if (!user || user.role !== "admin") {
      throw new AppError(
        "Admin You must be signed in to access this feature.",
        401
      );
    }

    logMemory("📖 Before fetching post");
    const post = await PostModel.findById(postId);
    logMemory("📖 After fetching post");
    if (!post) throw new AppError("Post not found", 404);

    logMemory("📄 Before finding block");
    const block = post.blocks.find((b) => b.id === blockId);
    if (!block) throw new AppError("Block not found", 404);
    logMemory("📄 After finding block");

    block.blocked = !block.blocked;
    logMemory("💾 Before saving post");
    await post.save();
    logMemory("💾 After saving post");

    logMemory("📝 Before recording activity");
    await recordActivity?.({
      userId: user._id,
      action: block.blocked ? "BLOCK_BLOCKED" : "BLOCK_UNBLOCKED",
      targetPost: post._id,
      message: `${block.blocked ? "Blocked" : "Unblocked"} block in post: ${
        post.title
      }`,
    });
    logMemory("📝 After recording activity");

    logMemory("🚫 End toggleBlockInPost");
    res.status(200).json({
      success: true,
      message: `Block ${block.blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    logMemory("❌ Error in toggleBlockInPost");
    next(
      error instanceof AppError
        ? error
        : new AppError("Failed to toggle block", 500)
    );
  }
};
