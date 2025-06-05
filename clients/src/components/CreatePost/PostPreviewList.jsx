import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import FileBlock from "../PostFeature/FileBlock";
import ListBlock from "../PostFeature/ListBlock";
import VideoBlock from "../PostFeature/VideoBlock";
import PostView from "./PostView";

import { createPosts, getSinglePost, deletePost } from "../../store/postSlice";
import ConfirmPostModal from "./ConfirmPostModal";
import {
  setIsFeatured,
  setIsPinned,
  setIsPublished,
  setLanguage,
  setStatus,
  resetPostMeta,
} from "../../store/Post/postMetaSlice"; // Corrected import path

const PostPreviewList = ({
  currentDraftPost,
  onUpdateDraft,
  postType,
  category,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPostConfirmed, setIsPostConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [postData, setPostData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Local state for post metadata with non-default values
  const [isFeatured, setIsFeaturedLocal] = useState(true);
  const [isPinned, setIsPinnedLocal] = useState(true);
  const [isPublished, setIsPublishedLocal] = useState(true);
  const [language, setLanguageLocal] = useState("es");
  const [status, setStatusLocal] = useState("published");

  const modalRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { posts: allPosts, singlePost, singlePostStatus } = useSelector(
    (state) => state.post
  );

  useEffect(() => {
    if (singlePost) setIsModalOpen(true);
  }, [singlePost]);

  useEffect(() => {
    if (modalRef.current && isModalOpen) {
      requestAnimationFrame(() => {
        modalRef.current.scrollTop = modalRef.current.scrollHeight;
      });
    }
    setZoomLevel(1);
  }, [isModalOpen]);

  useEffect(() => {
    let timer;
    if (isPostConfirmed && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (isPostConfirmed && countdown === 0) {
      handleConfirmPublish();
    }
    return () => clearTimeout(timer);
  }, [isPostConfirmed, countdown]);

  const closeModal = () => {
    setIsModalOpen(false);
    setZoomLevel(1);
    dispatch({ type: "post/clearSinglePost" });
  };

  const handleCopyCode = (code, i) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const createPost = () => {
    if (!currentDraftPost?.title) return toast.error("Please enter a title");
    if (!currentDraftPost?.blocks?.length)
      return toast.error("Please add content blocks");
    if (!postType) return toast.error("Please select a post type");
    if (!category) return toast.error("Please select a category");
    if (!language.match(/^[a-z]{2}$/i))
      return toast.error("Please enter a valid two-letter language code (e.g., 'en')");
    if (!["draft", "review", "published", "archived"].includes(status))
      return toast.error("Please select a valid status");

    // Prevent submission with all default metadata
    if (
      !isFeatured &&
      !isPinned &&
      !isPublished &&
      language === "en" &&
      status === "draft"
    ) {
      toast.error(
        "Please set at least one metadata field (e.g., feature, pin, publish, language, or status)"
      );
      return;
    }

    console.log("[DEBUG] createPost metadata:", {
      isFeatured,
      isPinned,
      isPublished,
      language,
      status,
    });

    setShowConfirmModal(true);
  };

  const handleModalConfirm = ({ tags, thumbnail }) => {
    console.log("[DEBUG] Tags received from ConfirmPostModal:", tags);
    const newPostData = { tags, thumbnail, isFeatured, isPinned, isPublished, language, status };
    console.log("[DEBUG] postData set:", newPostData);
    setShowConfirmModal(false);
    setPostData(newPostData);
    setIsPostConfirmed(true);
    setCountdown(5);

    dispatch(setIsFeatured(isFeatured));
    dispatch(setIsPinned(isPinned));
    dispatch(setIsPublished(isPublished));
    dispatch(setLanguage(language));
    dispatch(setStatus(status));
  };

  const handleConfirmPublish = () => {
    setIsPostConfirmed(false);

    const payload = {
      postType,
      category,
      title: currentDraftPost.title,
      blocks: currentDraftPost.blocks,
      tags: postData?.tags ?? [], // Ensure tags are included
      thumbnail: postData?.thumbnail ?? "",
      isFeatured: postData?.isFeatured ?? false,
      isPinned: postData?.isPinned ?? false,
      isPublished: postData?.isPublished ?? false,
      language: postData?.language ?? "es",
      status: postData?.status ?? "published",
    };

    console.log("[DEBUG] Payload sent to createPosts:", payload);

    // Validate tags
    if (!payload.tags || !Array.isArray(payload.tags) || payload.tags.length === 0) {
      toast.error("Please provide at least one tag");
      setPostData(null);
      setIsPostConfirmed(false);
      setCountdown(5);
      return;
    }

    dispatch(createPosts(payload)).then((result) => {
      if (createPosts.fulfilled.match(result)) {
        toast.success("Post created successfully!");
        if (onUpdateDraft) onUpdateDraft({ title: "", blocks: [] });
        dispatch(resetPostMeta());
        setIsFeaturedLocal(true);
        setIsPinnedLocal(true);
        setIsPublishedLocal(true);
        setLanguageLocal("es");
        setStatusLocal("published");
        navigate("/");
      } else {
        toast.error(
          "Failed to create post: " + (result.error?.message || "Unknown error")
        );
      }
    });
  };

  const handleCancelPublish = () => {
    setShowConfirmModal(false);
    setIsPostConfirmed(false);
    setPostData(null);
    setCountdown(5);
    toast("Post publishing cancelled.");
  };

  const deleteBlock = (index) => {
    if (!onUpdateDraft) {
      console.warn("No onUpdateDraft function provided");
      return;
    }
    const updatedBlocks = currentDraftPost.blocks.filter((_, i) => i !== index);
    onUpdateDraft({
      ...currentDraftPost,
      blocks: updatedBlocks,
    });
    toast.success("Block deleted");
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      dispatch(deletePost(postId))
        .unwrap()
        .then(() => toast.success("Post deleted successfully"))
        .catch((err) =>
          toast.error("Failed to delete post: " + (err.message || err))
        );
    }
  };

  const renderBlock = (block, i) => {
    const blockProps = {
      block,
      index: i,
      zoomLevel,
      copiedIndex,
      handleCopyCode,
      deleteBlock,
      className: "relative my-4",
    };

    switch (block.type) {
      case "code":
        return (
          <div key={i} className="relative my-4">
            <SyntaxHighlighter
              language={block.language || "javascript"}
              style={tomorrow}
              showLineNumbers
              wrapLines
            >
              {block.value}
            </SyntaxHighlighter>
            <button
              onClick={() => handleCopyCode(block.value, i)}
              className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-sm"
            >
              {copiedIndex === i ? "Copied!" : "Copy"}
            </button>
          </div>
        );
      case "file":
        return <FileBlock key={i} {...blockProps} />;
      case "list":
        return <ListBlock key={i} {...blockProps} />;
      case "video":
        return <VideoBlock key={i} {...blockProps} />;
      default:
        return (
          <div
            key={i}
            className="relative my-4"
            dangerouslySetInnerHTML={{ __html: block.value }}
          />
        );
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-2 sm:px-6 mt-6">
        {currentDraftPost && (
          <>
            <h2 className="text-5xl text-center font-extrabold text-orange-400 mb-4">
              Draft Preview Live
            </h2>
            <h1 className="text-4xl capitalize font-bold mb-4">
              Title: {currentDraftPost.title}
            </h1>
            <div className="border border-gray-300 rounded-lg p-4 mb-12 shadow-lg bg-white">
              {currentDraftPost.blocks.length === 0 ? (
                <p className="text-gray-400 italic">
                  No content blocks added yet.
                </p>
              ) : (
                currentDraftPost.blocks.map((block, i) => renderBlock(block, i))
              )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={() => {
                    const newValue = !isFeatured;
                    setIsFeaturedLocal(newValue);
                    console.log("[DEBUG] isFeatured set to:", newValue);
                  }}
                />
                <span>Feature this post</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={() => {
                    const newValue = !isPinned;
                    setIsPinnedLocal(newValue);
                    console.log("[DEBUG] isPinned set to:", newValue);
                  }}
                />
                <span>Pin this post</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={() => {
                    const newValue = !isPublished;
                    setIsPublishedLocal(newValue);
                    console.log("[DEBUG] isPublished set to:", newValue);
                  }}
                />
                <span>Mark as Published</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-red-500">Language (required)</span>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setLanguageLocal(newValue);
                    console.log("[DEBUG] language set to:", newValue);
                  }}
                  placeholder="e.g., en"
                  className="border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-red-500">Status (required)</span>
                <select
                  value={status}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setStatusLocal(newValue);
                    console.log("[DEBUG] status set to:", newValue);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <button
              onClick={createPost}
              className="bg-blue-600 text-white px-4 py-2 text-3xl my-6 w-full rounded mt-6"
            >
              Create Post
            </button>
          </>
        )}

        {allPosts.length === 0 ? (
          <p className="text-center text-gray-500 mt-16">
            No posts available yet.
          </p>
        ) : (
          <div className="grid gap-6 mt-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {allPosts.map((post) => {
              const firstBlock = post.blocks.find((b) =>
                ["image", "text", "file", "heading"].includes(b.type)
              );

              return (
                <motion.div
                  key={post._id}
                  layout
                  initial={{ opacity: 0.2, y: 20 }}
                  animate={{ opacity: 0.9, y: 0 }}
                  exit={{ opacity: 0.5, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post._id);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition"
                    aria-label="Delete post"
                    title="Delete post"
                  >
                    🗑
                  </button>
                  <div
                    onClick={() => dispatch(getSinglePost(post.slug))}
                    className="cursor-pointer"
                  >
                    {firstBlock?.type === "image" ? (
                      <img
                        src={firstBlock.src}
                        alt={firstBlock.caption || "Post Image"}
                        className="w-full h-48 object-cover rounded-t-lg hover:scale-105 transition-transform duration-200"
                        onError={(e) => (e.target.style.display = "none")}
                        loading="lazy"
                      />
                    ) : firstBlock?.type === "text" ? (
                      <div
                        className="p-6 text-gray-700 line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: firstBlock.value }}
                      />
                    ) : (
                      <div className="p-6 text-gray-500 italic">
                        No preview available
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {showConfirmModal && (
            <ConfirmPostModal
              onConfirm={handleModalConfirm}
              onCancel={handleCancelPublish}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPostConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="fixed top-28 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded shadow-lg px-6 py-4 flex items-center space-x-4 z-50"
            >
              <p>Publishing post in {countdown} seconds...</p>
              <button
                onClick={handleConfirmPublish}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Publish Now
              </button>
              <button
                onClick={handleCancelPublish}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isModalOpen && singlePost && (
            <motion.div
              ref={modalRef}
              key="modal"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-start p-4 pt-20"
              onClick={closeModal}
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                layout
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg max-w-4xl w-full p-6 shadow-lg max-h-[80vh] overflow-y-auto"
              >
                <PostView post={singlePost} />
                <button
                  onClick={closeModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PostPreviewList;