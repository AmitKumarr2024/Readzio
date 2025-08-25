import React from "react";
import { FiUpload } from "react-icons/fi";
import { MdDeleteForever } from "react-icons/md";
import { motion } from "framer-motion";

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const PostImageBlock = ({
  block,
  index,
  updateBlock,
  removeBlock,
  handleImageUpload,
  refProp,
}) => {
  // Format file size for display (e.g., KB, MB)
  const formatFileSize = (size) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Debug: Log block to check if size exists
  console.log(`Block ${index}:`, block);

  return (
    <motion.div
      ref={refProp}
      className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-md border border-gray-200"
      variants={blockVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      {/* File size display in top-right corner */}
      <span
        className="absolute top-1 right-12 text-sm text-gray-500 dark:text-gray-400"
        style={{ backgroundColor: block.size ? "transparent" : "yellow" }} // Highlight if no size
      >
        {block.size ? formatFileSize(block.size) : "No size"}
      </span>
      <button
        onClick={() => removeBlock(index)}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition"
        aria-label="Remove image"
      >
        <MdDeleteForever size={24} />
      </button>
      <input
        type="text"
        placeholder="Image URL (or upload below)"
        value={block.src.startsWith("data:") ? "" : block.src}
        onChange={(e) => updateBlock(index, { ...block, src: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <label className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition mb-4">
        <FiUpload className="w-5 h-5 mr-2" />
        Choose Image
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.type.startsWith("image/")) {
              handleImageUpload(file, index);
            } else {
              alert("Please select a valid image.");
            }
          }}
          className="hidden"
        />
      </label>
      <input
        placeholder="Caption (optional)"
        value={block.caption || ""}
        onChange={(e) =>
          updateBlock(index, { ...block, caption: e.target.value })
        }
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {block.src && (
        <img
          src={block.src}
          alt={block.caption || "Uploaded"}
          className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
        />
      )}
    </motion.div>
  );
};

export default PostImageBlock;
