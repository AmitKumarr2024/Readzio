import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";
import {
  addComment,
  fetchCommentsAndCount,
  optimisticAddComment,
  clearError,
} from "../../store/commentSlice";
import Comment from "./Comment";

export default function CommentBox({
  postId,
  parentId = null,
  postAuthorId,
  onCommentAdded,
}) {
  const dispatch = useDispatch();
  const { comments, loading, error, commentCounts } = useSelector(
    (state) => state.comment || {}
  );
  const { user } = useSelector((state) => state.auth || {});
  const [content, setContent] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const commentsPerPage = 5;

  // Debounced fetch for comments
  const debouncedFetchComments = useMemo(
    () =>
      debounce((postId) => {
        if (postId && !loading) {
          dispatch(fetchCommentsAndCount(postId));
        }
      }, 1000),
    [dispatch, loading]
  );

  useEffect(() => {
    if (postId && !parentId) {
      debouncedFetchComments(postId);
    }
    return () => debouncedFetchComments.cancel();
  }, [postId, parentId, debouncedFetchComments]);

  const topLevelComments = parentId ? [] : comments.filter((c) => !c.parent);
  const paginatedComments = topLevelComments.slice(
    (currentPage - 1) * commentsPerPage,
    currentPage * commentsPerPage
  );
  const totalPages = Math.ceil(topLevelComments.length / commentsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      console.error("[CommentBox:handleSubmit] Empty comment");
      dispatch(clearError());
      return;
    }
    if (!user) {
      console.error("[CommentBox:handleSubmit] Not authenticated");
      alert("Please login to comment");
      return;
    }
    try {
      const tempId = `temp-${Date.now()}`;
      dispatch(
        optimisticAddComment({ tempId, postId, content, parentId, user })
      );
      const result = await dispatch(
        addComment({ postId, content, parentId, tempId })
      );
      if (addComment.fulfilled.match(result)) {
        setContent("");
        dispatch(clearError());
        if (!parentId) {
          dispatch(fetchCommentsAndCount(postId));
        }
        if (onCommentAdded) {
          onCommentAdded();
        }
      } else {
        throw new Error(result.payload?.message || "Failed to add comment");
      }
    } catch (err) {
      console.error("[CommentBox:handleSubmit] Error:", { error: err.message });
      alert(`Failed to add comment: ${err.message}`);
    }
  };

  return (
    <div className="w-full mx-auto p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-md">
      {!parentId && (
        <h2 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark mb-4">
          Comments ({commentCounts[postId] || 0})
        </h2>
      )}

      {loading && (
        <p className="text-text-main-light dark:text-text-main-dark text-sm">
          Loading comments...
        </p>
      )}
      {error && (
        <p className="text-red-500 text-sm mb-4">
          Error: {error}
          {error.includes("login") && (
            <a href="/login" className="text-blue-500 hover:underline ml-1">
              Login
            </a>
          )}
        </p>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) dispatch(clearError());
            }}
            placeholder={parentId ? "Write a reply..." : "Write a comment..."}
            className="w-full rounded-md border border-gray-300 p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className={`mt-2 px-4 py-1.5 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 disabled:bg-blue-300 transition`}
          >
            {loading ? "Submitting..." : parentId ? "Reply" : "Comment"}
          </button>
        </form>
      ) : (
        <p className="text-text-main-light dark:text-text-main-dark text-sm mb-4">
          Please{" "}
          <a href="/login" className="text-blue-500 hover:underline">
            log in
          </a>{" "}
          to {parentId ? "reply" : "comment"}.
        </p>
      )}

      {!parentId && topLevelComments.length === 0 && !loading ? (
        <p className="text-text-main-light dark:text-text-main-dark text-sm">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        !parentId && (
          <>
            <div className="space-y-2">
              {paginatedComments.map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  currentUser={user}
                  dispatch={dispatch}
                  postAuthorId={postAuthorId}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentPage(index + 1);
                    }}
                    className={`px-3 py-1 text-sm rounded-full ${
                      currentPage === index + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
