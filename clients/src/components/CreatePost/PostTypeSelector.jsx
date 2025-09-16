import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { BookOpenText, PenLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setPostType } from "../../store/Post/postMetaSlice";
import { updatePost } from "../../store/postSlice";

const PostTypeSelector = ({ onContinue, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { postType } = useSelector((state) => state.postMeta);
  const { currentPost } = useSelector((state) => state.post);
  const [hasSelected, setHasSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = (type) => {
    // console.log(
    //   "[PostTypeSelector] handleSelect called, type:",
    //   type,
    //   "hasSelected:",
    //   hasSelected,
    //   "isLoading:",
    //   isLoading
    // );
    if (hasSelected || isLoading) return;
    if (!["Article", "Blog"].includes(type)) {
      // console.log("[PostTypeSelector] Invalid post type:", type);
      toast.error("Invalid post type selected");
      return;
    }
    setIsLoading(true);
    setHasSelected(true);
    dispatch(setPostType(type));
    localStorage.setItem("postType", type);
    // console.log("[PostTypeSelector] Set postType:", type);
    if (currentPost?.slug) {
      // console.log(
      //   "[PostTypeSelector] Updating post with slug:",
      //   currentPost.slug
      // );
      dispatch(
        updatePost({ slug: currentPost.slug, updateData: { postType: type } })
      )
        .unwrap()
        .then(() => {
          // console.log("[PostTypeSelector] Post type updated successfully");
          toast.success(`Post type updated to ${type}`);
          setIsLoading(false);
          onContinue();
        })
        .catch((error) => {
          console.error(
            "[PostTypeSelector] Failed to update post type:",
            error
          );
          toast.error(`Failed to update post type: ${error.message}`);
          setIsLoading(false);
          setHasSelected(false);
        });
    } else {
      // console.log("[PostTypeSelector] No current post, continuing after delay");
      toast.success(`Post type set to ${type}`);
      setTimeout(() => {
        setIsLoading(false);
        onContinue();
      }, 500);
    }
  };

  const handleClose = () => {
    // console.log("[PostTypeSelector] handleClose called");
    localStorage.removeItem("postType");
    navigate("/");
  };

  // console.log("[PostTypeSelector] Rendering, state:", {
  //   postType,
  //   hasSelected,
  //   isLoading,
  //   currentPostSlug: currentPost?.slug,
  // });

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-md sm:max-w-lg mx-auto"
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-text-main-light dark:text-text-main-dark hover:text-red-500 dark:hover:text-red-400 transition"
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
        Select Post Type
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleSelect("Article")}
          disabled={isLoading}
          className={`flex items-center justify-center gap-3 py-4 px-6 ${
            postType === "Article"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark hover:bg-blue-100 dark:hover:bg-blue-900"
          } rounded-xl shadow-md transition font-semibold text-base sm:text-lg ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading && postType === "Article" ? (
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          ) : (
            <BookOpenText size={24} />
          )}
          Article
        </button>
        <button
          onClick={() => handleSelect("Blog")}
          disabled={isLoading}
          className={`flex items-center justify-center gap-3 py-4 px-6 ${
            postType === "Blog"
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark hover:bg-blue-100 dark:hover:bg-blue-900"
          } rounded-xl shadow-md transition font-semibold text-base sm:text-lg ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading && postType === "Blog" ? (
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          ) : (
            <PenLine size={24} />
          )}
          Blog
        </button>
      </div>
    </motion.div>
  );
};

export default PostTypeSelector;
