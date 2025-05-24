import React, { useState } from "react";

const Comment = ({ comment, addReply }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReplySubmit = () => {
    if (replyText.trim()) {
      addReply(comment.id, replyText.trim());
      setReplyText("");
      setShowReply(false);
    }
  };

  return (
    <div className={`ml-${comment.parentId ? "8" : "0"} mt-4`}>
      <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
        <p className="text-gray-800 mb-2">{comment.text}</p>

        <button
          onClick={() => setShowReply(!showReply)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showReply ? "Cancel" : "Reply"}
        </button>

        {showReply && (
          <div className="mt-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              rows={3}
              className="w-full rounded-md border border-gray-300 p-3 resize-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleReplySubmit}
              className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700"
              disabled={!replyText.trim()}
            >
              Submit
            </button>
          </div>
        )}
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-4 border-l-2 border-gray-300 pl-4">
          {comment.replies.map((reply) => (
            <Comment key={reply.id} comment={reply} addReply={addReply} />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentBox = () => {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const commentsPerPage = 5;

  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const paginatedComments = comments.slice(
    startIndex,
    startIndex + commentsPerPage
  );

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now(),
      text: commentText.trim(),
      replies: [],
      parentId: null,
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
    setCurrentPage(1); // Go back to first page on new comment
  };

  const addReply = (parentId, text) => {
    const addReplyRecursive = (commentsList) => {
      return commentsList.map((comment) => {
        if (comment.id === parentId) {
          const newReply = {
            id: Date.now(),
            text,
            replies: [],
            parentId,
          };
          return { ...comment, replies: [...comment.replies, newReply] };
        } else if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyRecursive(comment.replies),
          };
        }
        return comment;
      });
    };
    setComments((prevComments) => addReplyRecursive(prevComments));
  };

  return (
    <div className="w-full mx-auto p-6 bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Comments</h2>

      <div className="flex flex-col gap-3 mb-6">
        <textarea
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={addComment}
          disabled={!commentText.trim()}
          className={`px-5 py-2 rounded-md text-white ${
            commentText.trim()
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-300 cursor-not-allowed"
          } transition`}
        >
          Add Comment
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="text-gray-500">No comments yet. Be the first to comment!</p>
      ) : (
        <>
          {paginatedComments.map((comment) => (
            <Comment key={comment.id} comment={comment} addReply={addReply} />
          ))}

          {/* Pagination Controls */}
          <div className="flex justify-center mt-6 gap-2">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === index + 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CommentBox;
