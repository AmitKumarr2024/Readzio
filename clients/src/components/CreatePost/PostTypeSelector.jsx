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
  const [hasSelected, setHasSelected] = useState(false);
  const dispatch = useDispatch();
  const { postType } = useSelector((state) => state.postMeta);
  const { currentPost } = useSelector((state) => state.post);

  const handleSelect = (type) => {
    if (hasSelected) return;
    if (!["Article", "Blog"].includes(type)) {
      toast.error("Invalid post type selected");
      return;
    }
    setHasSelected(true);

    if (currentPost?.slug) {
      dispatch(
        updatePost({
          slug: currentPost.slug,
          updateData: { postType: type },
        })
      )
        .unwrap()
        .then(() => {
          toast.success(`Post type updated to ${type}`);
          onContinue();
        })
        .catch((error) => {
          toast.error(`Failed to update post type: ${error.message}`);
          setHasSelected(false); // Allow retry on failure
        });
    } else {
      dispatch(setPostType(type));
      toast.success(`Post type set to ${type}`);
      onContinue();
    }
  };

  const handleClose = () => {
    navigate("/");
  };

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
          className={`flex items-center justify-center gap-3 py-4 px-6 ${
            postType === "Article"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark hover:bg-blue-100 dark:hover:bg-blue-900"
          } rounded-xl shadow-md transition font-semibold text-base sm:text-lg`}
        >
          <BookOpenText size={24} />
          Article
        </button>

        <button
          onClick={() => handleSelect("Blog")}
          className={`flex items-center justify-center gap-3 py-4 px-6 ${
            postType === "Blog"
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark hover:bg-blue-100 dark:hover:bg-blue-900"
          } rounded-xl shadow-md transition font-semibold text-base sm:text-lg`}
        >
          <PenLine size={24} />
          Blog
        </button>
      </div>
    </motion.div>
  );
};

export default PostTypeSelector;
