import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addComment,
  toggleReaction,
  editComment,
  blockComment,
  deleteComment,
} from "../../store/commentSlice";
import TimeAgo from "../../Utils/TimeAgo";
import CommentBox from "./CommentBox";

export default function Comment({ comment, postId, level = 0, postAuthorId }) {
  console.log("[Comment: Render] Rendering", { commentId: comment._id, postId, level, content: comment.content });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const { user } = useSelector((state) => state.auth || {});
  const dispatch = useDispatch();

  const isCommentAuthor = user && comment.user?._id === user._id;
  const isPostAuthor = user && postAuthorId === user._id;
  const canEdit = isCommentAuthor;
  const canBlockOrDelete = isCommentAuthor || isPostAuthor;
  const likeCount = comment.reactions?.like?.length || 0;
  const isLiked = user && comment.reactions?.like?.includes(user._id);

  const handleToggleLike = () => {
    if (!user) {
      console.error("[Comment: handleToggleLike] Not authenticated user");
      return;
    }
    console.log("[Comment: handleToggleLike] Toggling", { commentId: comment._id, reactionType: "like" });
    dispatch(toggleReaction({ commentId: comment._id, reactionType: "like" }));
  };

  const handleEditSubmit = () => {
    if (!editText.trim() || !canEdit) {
      console.error("Invalid post edit:", { editText, canEdit });
      toast.error("Edit text or unauthorized");
      return;
    }
    console.log("Submitting edit:", { commentId: comment._id, content: editText });
    dispatch(editComment({ commentId: comment._id, content: editText.trim() }))
      .unwrap()
      .then(() => {
        console.log("Edit successful");
        setIsEditing(false);
      })
      .catch((err) => {
        console.error("Error editing comment:", err);
        toast.error("Failed to update comment");
      });
  };

  const handleBlock = () => {
    if (!canBlockOrDelete) {
      console.error("Not authorized to block:", { isCommentAuthor, isPostAuthor });
      return;
    }
    console.log("Blocking comment:", { commentId: comment._id });
    dispatch(blockComment(comment._id));
  };

  const handleDelete = () => {
    if (!canBlockOrDelete) {
      console.error("Not authorized to delete:", { isCommentAuthor, isPostAuthor });
      return;
    }
    console.log("Deleting comment:", { commentId: comment._id });
    dispatch(deleteComment(comment._id));
  };

  const handleCommentAdded = () => {
    console.log("Hiding reply box");
    setShowReplyBox(false);
  };

  if (comment.blocked || comment.isBlocked) {
    console.log("Comment blocked:", { commentId: comment._id });
    return <p className="text-gray-500 text-sm ml-4">[Comment removed]</p>;
    
  };

  return (
    <div className={`mt-2 ${level > 0 ? "ml-6 border-l-2 border-gray-200 pl-4" : ""}`}>
      <div className="flex items-start">
        <img
          src={comment.user?.avatar || "https://placehold.co/40x40?text=User"}
          alt={comment.user?.name || "Anonymous"}
          className="w-6 h-6 rounded-full mr-2"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium  text-text-main-light dark:text-text-main-dark">
              {comment.user?.name || "Anonymous"}
            </p>
            <p className="text-xs text-text-main-light dark:text-text-main-dark">
              <TimeAgo date={comment.createdAt} />
              {comment.edited && <span className="ml-1">· edited</span>}
            </p>
          </div>
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEditSubmit}
                  className="px-3 py-1 bg-blue-500 text-text-main-light dark:text-text-main-dark text-sm rounded-full hover:bg-blue-600 disabled:bg-blue-300"
                  disabled={!editText.trim()}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-gray-200 text-text-main-light dark:text-text-main-dark text-sm rounded-full hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-text-main-light dark:text-text-main-dark text-sm mt-1">{comment.content}</p>
          )}
          <div className="flex gap-2 mt-2 text-xs text-text-main-light dark:text-text-main-dark ">
            <button
              onClick={handleToggleLike}
              className={`text-sm ${isLiked ? "text-blue-500" : "hover:text-blue-500"}`}
              disabled={!user}
            >
              Like ({likeCount})
            </button>
            {user && (
              <button
                onClick={() => setShowReplyBox(!showReplyBox)}
                className="text-sm hover:text-blue-500"
              >
                {showReplyBox ? "Cancel" : "Reply"}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm hover:text-blue-500"
              >
                Edit
              </button>
            )}
            {canBlockOrDelete && (
              <>
                <button
                  onClick={handleBlock}
                  className="text-sm hover:text-red-500"
                >
                  Block
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm hover:text-red-500"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showReplyBox && (
        <CommentBox
          postId={postId}
          parentId={comment._id}
          onCommentAdded={handleCommentAdded}
          postAuthorId={postAuthorId}
        />
      )}
      {comment.replies?.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              postId={postId}
              level={level + 1}
              postAuthorId={postAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}