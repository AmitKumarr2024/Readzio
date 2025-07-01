import CommentModel from "../Models/CommentModel.js";
import PostModel from "../Models/Post.js";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";
import Notification from "../Models/Notification.js";

export const addComment = async (req, res, next) => {
  console.log('[Comment:addComment] Starting', { postId: req.params.postId, userId: req.user._id });
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user._id;
    console.log('[Comment:addComment] Fetching post');
    const post = await PostModel.findById(postId).select('author slug title');
    if (!post) {
      console.error('[Comment:addComment] Post not found');
      throw new AppError('Post not found', 404);
    }
    console.log('[Comment:addComment] Creating comment');
    const newComment = await CommentModel.create({
      post: postId,
      user: userId,
      content,
      parent: parentId || null,
    });
    console.log('[Comment:addComment] Comment created:', { commentId: newComment._id });
    console.log('[Comment:addComment] Creating notification');
    const notification = await Notification.create({
      user: parentId ? (await CommentModel.findById(parentId))?.user || post.author : post.author,
      sender: userId,
      type: parentId ? 'reply' : 'comment',
      post: postId,
      commentId: newComment._id,
    });
    console.log('[Comment:addComment] Notification created:', { notificationId: notification._id });
    const targetUserId = parentId
      ? (await CommentModel.findById(parentId))?.user.toString() || post.author.toString()
      : post.author.toString();
    console.log('[Comment:addComment] Emitting to:', { targetUserId });
    req.io.to(targetUserId).emit('newNotification', {
      _id: notification._id,
      type: parentId ? 'reply' : 'comment',
      post: { _id: postId, slug: post.slug, title: post.title },
      commentId: newComment._id,
      sender: { _id: userId, name: req.user.name, avatar: req.user.avatar },
      read: false,
      createdAt: newComment.createdAt,
    });
    console.log('[Comment:addComment] Responding');
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('[Comment:addComment] Error:', { error: error.message, stack: error.stack });
    next(error);
  }
};

// Other controller functions (unchanged)
export const getPostComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    console.log('[Comment:getPostComments] Fetching for:', { postId });
    const topComments = await CommentModel.find({
      post: postId,
      parent: null,
      $or: [{ blocked: false }, { blocked: { $exists: false } }],
    })
      .populate("user", "name avatar _id")
      .sort({ createdAt: -1 });
    console.log('[Comment:getPostComments] Top comments:', { count: topComments.length });
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
    console.log('[Comment:getPostComments] Success:', { totalComments: commentsWithReplies.length });
    res.status(200).json({ success: true, comments: commentsWithReplies });
  } catch (err) {
    console.error('[Comment:getPostComments] Error:', { error: err.message });
    next(err);
  }
};

export const toggleCommentReaction = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { reactionType } = req.body;
    const userId = req.user._id;
    console.log('[Comment:toggleCommentReaction] Starting:', { commentId, reactionType, userId });
    const comment = await CommentModel.findById(commentId);
    if (!comment || comment.blocked) throw new AppError("Comment not found", 404);
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
    console.log('[Comment:toggleCommentReaction] Success:', { reactions: comment.reactions });
    res.status(200).json({ success: true, reactions: comment.reactions });
  } catch (err) {
    console.error('[Comment:toggleCommentReaction] Error:', { error: err.message });
    next(err);
  }
};
export const editComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    console.log('[Comment:editComment] Starting:', { commentId, content, userId });
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);
    if (comment.user.toString() !== userId.toString()) {
      throw new AppError("Unauthorized", 403);
    }
    comment.content = content;
    comment.edited = true;
    await comment.save();
    console.log('[Comment:editComment] Success:', { commentId });
    res.status(200).json({ success: true, comment });
  } catch (err) {
    console.error('[Comment:editComment] Error:', { error: err.message });
    next(err);
  }
};
export const blockComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    console.log('[Comment:blockComment] Starting:', { commentId, userId });
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);
    const post = await PostModel.findById(comment.post);
    if (!post) throw new AppError("Post not found", 404);
    const isOwner = comment.user.toString() === userId.toString();
    const isPostAuthor = post.author.toString() === userId.toString();
    if (!isOwner && !isPostAuthor) {
      throw new AppError("Not authorized to block this comment", 403);
    }
    comment.blocked = true;
    await comment.save();
    console.log('[Comment:blockComment] Success:', { commentId });
    res.status(200).json({ success: true, message: "Comment blocked" });
  } catch (err) {
    console.error('[Comment:blockComment] Error:', { error: err.message });
    next(err);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin";
    console.log('[Comment:deleteComment] Starting:', { commentId, userId, isAdmin });
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);
    const post = await PostModel.findById(comment.post);
    const isOwner = comment.user.toString() === userId.toString();
    const isPostAuthor = post && post.author.toString() === userId.toString();
    if (!isOwner && !isPostAuthor && !isAdmin) {
      throw new AppError("Not authorized to delete this comment", 403);
    }
    await CommentModel.findByIdAndDelete(commentId);
    console.log('[Comment:deleteComment] Success:', { commentId });
    res.status(200).json({ success: true, message: "Comment deleted permanently", postId: comment.post });
  } catch (err) {
    console.error('[Comment:deleteComment] Error:', { error: err.message });
    next(err);
  }
};
