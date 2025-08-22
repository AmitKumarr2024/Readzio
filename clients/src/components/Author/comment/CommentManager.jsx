import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCommentsAndCount,
  editComment,
  deleteComment,
  blockComment,
} from "../../../store/commentSlice";
import { debounce } from "lodash";
import { Trash2, Edit, Lock, Unlock } from "lucide-react";
import { Button } from "../../../Utils/Button";
import { motion, AnimatePresence } from "framer-motion";
import { FaSpinner } from "react-icons/fa";

const CommentManager = ({ userId }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("view");
  const comments = useSelector((state) => state.comment.comments);
  const posts = useSelector((state) => state.post.posts); // Fetch user posts
  const loading = useSelector((state) => state.comment.loading);
  const error = useSelector((state) => state.comment.error);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");

  // Debounced batch fetch for comments
  const debouncedFetchComments = useMemo(
    () =>
      debounce((postIds) => {
        if (postIds.length && !loading) {
          postIds.forEach((postId) => {
            dispatch(fetchCommentsAndCount(postId));
          });
        }
      }, 1000),
    [dispatch, loading]
  );

  useEffect(() => {
    const userPosts = posts.filter((post) => post.author._id === userId);
    const postIds = userPosts.map((post) => post._id);
    if (postIds.length) {
      debouncedFetchComments(postIds);
    }
    return () => debouncedFetchComments.cancel();
  }, [dispatch, userId, posts, debouncedFetchComments]);

  const handleEdit = (comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = (commentId) => {
    dispatch(editComment({ commentId, content: editContent }));
    setEditingComment(null);
    setEditContent("");
  };

  const handleDelete = (commentId) => {
    if (window.confirm("Delete this comment?")) {
      dispatch(deleteComment(commentId));
    }
  };

  const handleBlockToggle = (commentId, blocked) => {
    if (
      window.confirm(blocked ? "Unblock this comment?" : "Block this comment?")
    ) {
      dispatch(blockComment(commentId));
    }
  };

  const renderComment = (comment, level = 0) => {
    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`ml-${
          level * 6
        } p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border-l-4 border-blue-100 mb-3 hover:shadow-md transition-shadow duration-300`}
      >
        {editingComment === comment.id ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none text-gray-800"
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleSaveEdit(comment.id)}
                className="bg-blue-600 text-text-main-light dark:text-text-main-dark px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </Button>
              <Button
                onClick={() => setEditingComment(null)}
                className="bg-gray-200 text-text-main-light dark:text-text-main-dark px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-text-main-light dark:text-text-main-dark text-base font-medium">
              {comment.content}
            </p>
            <p className="text-sm text-text-main-light dark:text-text-main-dark mt-1">
              By{" "}
              <span className="font-semibold">
                {comment.user?.name || "Unknown User"}
              </span>{" "}
              on{" "}
              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="flex gap-3 mt-3">
              <Button
                onClick={() => handleEdit(comment)}
                className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                title="Edit Comment"
              >
                <Edit size={18} />
              </Button>
              <Button
                onClick={() => handleDelete(comment.id)}
                className="text-red-600 hover:text-red-800 p-1 transition-colors"
                title="Delete Comment"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </div>
        )}
        {comment.replies?.length > 0 &&
          comment.replies.map((reply) => renderComment(reply, level + 1))}
      </motion.div>
    );
  };

  const renderBlockTab = () => (
    <div className="p-4">
      <AnimatePresence>
        {comments.filter((c) => c.isFlagged || c.blocked).length > 0 ? (
          comments
            .filter((c) => c.isFlagged || c.blocked)
            .map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border-l-4 border-red-100 mb-3 flex justify-between items-center hover:shadow-md transition-shadow duration-300"
              >
                <div>
                  <p className="text-text-main-light dark:text-text-main-dark text-base font-medium">
                    {comment.content}
                  </p>
                  <p className="text-sm text-text-main-light dark:text-text-main-dark">
                    By{" "}
                    <span className="font-semibold">
                      {comment.user?.name || "Unknown User"}
                    </span>
                  </p>
                </div>
                <Button
                  onClick={() => handleBlockToggle(comment.id, comment.blocked)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    comment.blocked
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {comment.blocked ? <Unlock size={16} /> : <Lock size={16} />}
                  {comment.blocked ? "Unblock" : "Block"}
                </Button>
              </motion.div>
            ))
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500 text-lg"
          >
            No blocked or flagged comments.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setActiveTab("view")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === "view"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            View Comments
          </Button>
          <Button
            onClick={() => setActiveTab("block")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === "block"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            Block/Unblock Comments
          </Button>
        </div>

        {loading && (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">
                Loading...
              </p>
            </motion.div>
          </div>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-red-600 text-lg"
          >
            {error}
          </motion.p>
        )}
        {!loading && !error && comments.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-text-main-light dark:text-text-main-dark text-lg"
          >
            No comments found for your posts.
          </motion.p>
        )}

        <AnimatePresence>
          {activeTab === "view" && comments.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {comments.map((comment) => renderComment(comment))}
            </motion.div>
          )}
          {activeTab === "block" && renderBlockTab()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CommentManager;
