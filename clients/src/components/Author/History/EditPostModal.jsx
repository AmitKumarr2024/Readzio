import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updatePost } from "../../../store/postSlice";
import { Button } from "../../../Utils/Button";

function EditPostModal({ post, isOpen, onClose, onSave }) {
  const dispatch = useDispatch();
  const [editTitle, setEditTitle] = useState(post?.title || "");
  const [editContent, setEditContent] = useState(post?.content || "");
  const [editStatus, setEditStatus] = useState(post?.status || "draft");
  const [editIsFeatured, setEditIsFeatured] = useState(
    post?.isFeatured || false
  );
  const [editIsPinned, setEditIsPinned] = useState(post?.isPinned || false);
  const [editIsPublished, setEditIsPublished] = useState(
    post?.isPublished || false
  );
  const [editAllowComments, setEditAllowComments] = useState(
    post?.allowComments || false
  );
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
      await dispatch(
        updatePost({
          postId: post._id,
          updateData,
        })
      ).unwrap();
      onSave();
      onClose();
    } catch (error) {
      setUpdateError(error.message || "Failed to update post");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4 sm:p-6">
      <div className="bg-background rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4 text-foreground">
          Edit Post
        </h3>
        {updateError && <p className="text-destructive mb-4">{updateError}</p>}
        <div className="space-y-4">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full p-2 border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Post title"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Post content"
            rows="4"
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full p-2 border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsFeatured}
                onChange={(e) => setEditIsFeatured(e.target.checked)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm text-foreground select-none">
                Featured
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsPinned}
                onChange={(e) => setEditIsPinned(e.target.checked)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm text-foreground select-none">
                Pinned
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsPublished}
                onChange={(e) => setEditIsPublished(e.target.checked)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm text-foreground select-none">
                Published
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editAllowComments}
                onChange={(e) => setEditAllowComments(e.target.checked)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm text-foreground select-none">
                Allow Comments
              </span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {editTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-primary text-primary-foreground rounded-full text-sm hover:bg-primary/90 transition cursor-default select-none"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-primary-foreground hover:text-destructive focus:outline-none"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Type a tag and press{" "}
              <kbd className="px-1 py-0.5 font-mono text-xs bg-gray-200 rounded">
                Enter
              </kbd>{" "}
              to add it. Click the{" "}
              <span aria-label="remove tag" role="img">
                ×
              </span>{" "}
              on a tag to remove it.
            </p>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full p-2 border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Add a tag and press Enter"
              aria-label="Add new tag"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSave}
              disabled={updateLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {updateLoading ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="flex-1 px-4 py-2 text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPostModal;
