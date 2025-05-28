import PostModel from "../Models/Post.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "../Utils/createNotification.js";

/**
 * @desc Like or Unlike a post
 */

export const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const post = await PostModel.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "toggleLike Controller");

    let likesArray = Array.isArray(post.likes) ? post.likes : [];

    const alreadyLiked = likesArray.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // Unlike
      post.likes = likesArray.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Like
      post.likes = [...likesArray, userId];

      // Create notification for post author
      await createNotification({
        user: userId,
        targetUser: post.author,
        type: "like",
        postId: post._id,
      });
    }

    await post.save();

    res.status(200).json({
      success: true,
      likesCount: post.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "toggleLike Controller")
    );
  }
};



/**
 * @desc Bookmark or remove bookmark of a post for user
 */
export const toggleBookmark = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    // Assuming user model has bookmarks array of postIds
    const user = await UserModel.findById(userId);
    if (!user)
      throw new AppError("User not found", 404, "toggleBookmark Controller");

    const index = user.bookmarks.indexOf(postId);
    if (index === -1) {
      user.bookmarks.push(postId); // Add bookmark
    } else {
      user.bookmarks.splice(index, 1); // Remove bookmark
    }

    await user.save();

    res.status(200).json({
      success: true,
      bookmarksCount: user.bookmarks.length,
      bookmarked: index === -1,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "toggleBookmark Controller")
    );
  }
};

/**
 * @desc Increment post view count
 */
export const incrementView = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await PostModel.findById(postId);
    if (!post)
      throw new AppError("Post not found", 404, "incrementView Controller");

    post.views = (post.views || 0) + 1;
    await post.save();

    res.status(200).json({
      success: true,
      views: post.views,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "incrementView Controller")
    );
  }
};
