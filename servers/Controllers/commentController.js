import CommentModel from "../Models/CommentModel.js";
import PostModel from "../Models/Post.js";
import mongoose from "mongoose";
import { AppError } from "../../servers/Utils/AppError.js";
import Notification from "../Models/Notification.js";

// Adds a new comment or reply to a post
export const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user._id;

    // Validates post existence
    const post = await PostModel.findById(postId).select('author slug title');
    if (!post)
      throw new AppError("Post not found", 404, "AddComment", "Post does not exist");

    // Creates new comment
    const newComment = await CommentModel.create({
      post: postId,
      user: userId,
      content,
      parent: parentId || null,
    });

    // Creates notification for comment or reply
    const notification = await Notification.create({
      user: parentId ? (await CommentModel.findById(parentId))?.user || post.author : post.author,
      sender: userId,
      type: parentId ? 'reply' : 'comment',
      post: postId,
      commentId: newComment._id,
    });

    // Determines target user for notification
    const targetUserId = parentId
      ? (await CommentModel.findById(parentId))?.user.toString() || post.author.toString()
      : post.author.toString();

    // Emits notification to target user
    req.io.to(targetUserId).emit('newNotification', {
      _id: notification._id,
      type: parentId ? 'reply' : 'comment',
      post: { _id: postId, slug: post.slug, title: post.title },
      commentId: newComment._id,
      sender: { _id: userId, name: req.user.name, avatar: req.user.avatar },
      read: false,
      createdAt: newComment.createdAt,
    });

    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    // AppError with context for adding comment
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "AddComment", "Failed to add comment")
    );
  }
};

// Fetches all top-level comments and their replies for a post
export const getPostComments = async (req, res, next) => {
  try {
    const { postId } = req.params;

    // Fetches top-level comments
    const topComments = await CommentModel.find({
      post: postId,
      parent: null,
      $or: [{ blocked: false }, { blocked: { $exists: false } }],
    })
      .populate("user", "name avatar _id")
      .sort({ createdAt: -1 });

    // Fetches replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      topComments.map(async (comment) => {
        const replies = await CommentModel.find({
          parent: comment._id,
          $or: [{ blocked: false }, { blocked: { $exists: false } }],
        })
          .populate("user", "name avatar _id")
          .sort({ createdAt: 1 });
        return { ...comment.toObject(), replies };
      })
    );

    res.status(200).json({ success: true, comments: commentsWithReplies });
  } catch (error) {
    // AppError with context for fetching comments
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetPostComments", "Failed to fetch comments")
    );
  }
};

// Toggles a reaction on a comment
export const toggleCommentReaction = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { reactionType } = req.body;
    const userId = req.user._id;

    // Validates comment existence and status
    const comment = await CommentModel.findById(commentId);
    if (!comment || comment.blocked)
      throw new AppError("Comment not found", 404, "ToggleCommentReaction", "Comment does not exist or is blocked");

    // Toggles reaction
    const users = comment.reactions.get(reactionType) || [];
    const reacted = users.includes(userId.toString());
    if (reacted) {
      comment.reactions.set(
        reactionType,
        users.filter((id) => id.toString() !== userId.toString())
      );
    } else {
      comment.reactions.set(reactionType, [...users, userId]);
    }
    await comment.save();

    res.status(200).json({ success: true, reactions: comment.reactions });
  } catch (error) {
    // AppError with context for toggling reaction
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleCommentReaction", "Failed to toggle reaction")
    );
  }
};

// Edits a comment
export const editComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validates comment existence
    const comment = await CommentModel.findById(commentId);
    if (!comment)
      throw new AppError("Comment not found", 404, "EditComment", "Comment does not exist");

    // Checks user authorization
    if (comment.user.toString() !== userId.toString())
      throw new AppError("Unauthorized", 403, "EditComment", "User not authorized to edit this comment");

    // Updates comment content
    comment.content = content;
    comment.edited = true;
    await comment.save();

    res.status(200).json({ success: true, comment });
  } catch (error) {
    // AppError with context for editing comment
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "EditComment", "Failed to edit comment")
    );
  }
};

// Blocks a comment
export const blockComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    // Validates comment existence
    const comment = await CommentModel.findById(commentId);
    if (!comment)
      throw new AppError("Comment not found", 404, "BlockComment", "Comment does not exist");

    // Validates post existence
    const post = await PostModel.findById(comment.post);
    if (!post)
      throw new AppError("Post not found", 404, "BlockComment", "Post does not exist");

    // Checks user authorization
    const isOwner = comment.user.toString() === userId.toString();
    const isPostAuthor = post.author.toString() === userId.toString();
    if (!isOwner && !isPostAuthor)
      throw new AppError("Not authorized to block this comment", 403, "BlockComment", "User not authorized");

    // Blocks comment
    comment.blocked = true;
    await comment.save();

    res.status(200).json({ success: true, message: "Comment blocked" });
  } catch (error) {
    // AppError with context for blocking comment
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "BlockComment", "Failed to block comment")
    );
  }
};

// Deletes a comment
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin";

    // Validates comment existence
    const comment = await CommentModel.findById(commentId);
    if (!comment)
      throw new AppError("Comment not found", 404, "DeleteComment", "Comment does not exist");

    // Validates post existence
    const post = await PostModel.findById(comment.post);
    const isOwner = comment.user.toString() === userId.toString();
    const isPostAuthor = post && post.author.toString() === userId.toString();

    // Checks user authorization
    if (!isOwner && !isPostAuthor && !isAdmin)
      throw new AppError("Not authorized to delete this comment", 403, "DeleteComment", "User not authorized");

    // Deletes comment
    await CommentModel.findByIdAndDelete(commentId);

    res.status(200).json({ success: true, message: "Comment deleted permanently", postId: comment.post });
  } catch (error) {
    // AppError with context for deleting comment
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "DeleteComment", "Failed to delete comment")
    );
  }
};