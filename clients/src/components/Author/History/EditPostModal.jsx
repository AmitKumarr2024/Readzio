import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updatePost } from "../../../store/postSlice";
import { Button } from "../../../Utils/Button";
import { motion } from "framer-motion";
import { FaTag } from "react-icons/fa";

function EditPostModal({ post, isOpen, onClose, onSave }) {
  const dispatch = useDispatch();
  const [editTitle, setEditTitle] = useState(post?.title || "");
  const [editContent, setEditContent] = useState(post?.content || "");
  const [editStatus, setEditStatus] = useState(post?.status || "draft");
  const [editIsFeatured, setEditIsFeatured] = useState(post?.isFeatured || false);
  const [editIsPinned, setEditIsPinned] = useState(post?.isPinned || false);
  const [editIsPublished, setEditIsPublished] = useState(post?.isPublished || false);
  const [editAllowComments, setEditAllowComments] = useState(post?.allowComments || false);
  const [editTags, setEditTags] = useState(post?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  useEffect(() => {
    if (post) {
      setEditTitle(post.title || "");
      setEditContent(post.content || "");
      setEditStatus(post.status || "draft");
      setEditIsFeatured(post.isFeatured || false);
      setEditIsPinned(post.isPinned || false);
      setEditIsPublished(post.isPublished || false);
      setEditAllowComments(post.allowComments || false);
      setEditTags(post.tags || []);
      setNewTag("");
      setUpdateError(null);
    }
  }, [post]);

  const handleAddTag = (e) => {
    if (e.key === "Enter" && newTag.trim()) {
      setEditTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!post?._id) {
      setUpdateError("Invalid post ID");
      return;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      const updateData = {
        title: editTitle,
        content: editContent,
        status: editStatus,
        isFeatured: editIsFeatured,
        isPinned: editIsPinned,
        isPublished: editIsPublished,
        allowComments: editAllowComments,
        tags: editTags,
      };
      await dispatch(updatePost({ postId: post._id, updateData })).unwrap();
      onSave();
      onClose();
    } catch (error) {
      setUpdateError(error.message || "Failed to update post");
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-sm p-4 sm:p-6"
    >
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <h3 className="text-2xl font-bold  text-text-main-light dark:text-text-main-dark mb-4">Edit Post</h3>
        {updateError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 bg-background-light dark:bg-background-dark  p-2 rounded-lg mb-4 text-center"
          >
            {updateError}
          </motion.p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Post title"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1">Content</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-700"
              placeholder="Post content"
              rows="4"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="space-y-2">
            {[
              { label: "Featured", checked: editIsFeatured, onChange: setEditIsFeatured },
              { label: "Pinned", checked: editIsPinned, onChange: setEditIsPinned },
              { label: "Published", checked: editIsPublished, onChange: setEditIsPublished },
              { label: "Allow Comments", checked: editAllowComments, onChange: setEditAllowComments },
            ].map(({ label, checked, onChange }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-text-main-light dark:text-text-main-dark">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {editTags.map((tag) => (
                <motion.span
                  key={tag}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center px-2 py-1 bg-indigo-600 text-text-main-light dark:text-text-main-dark rounded-full text-sm font-medium"
                >
                  <FaTag className="mr-1" />
                  {tag}
                  <motion.button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-text-main-light dark:text-text-main-dark hover:text-red-300"
                    whileHover={{ scale: 1.2 }}
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </motion.button>
                </motion.span>
              ))}
            </div>
            <p className="text-sm text-text-main-light dark:text-text-main-dark mb-2">
              Type a tag and press <kbd className="px-1 py-0.5 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark rounded">Enter</kbd> to add.
            </p>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add a tag and press Enter"
              aria-label="Add new tag"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <motion.button
              onClick={handleSave}
              disabled={updateLoading}
              className={`flex-1 py-3 rounded-full text-text-main-light dark:text-text-main-dark bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 ${updateLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {updateLoading ? "Saving..." : "Save"}
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex-1 py-3 rounded-full bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark hover:bg-gray-300 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default EditPostModal;