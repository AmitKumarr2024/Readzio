import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import { MdDeleteForever } from "react-icons/md";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

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
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
  const [fileSizeText, setFileSizeText] = useState(""); // State to store file size text

  const validateImage = (file) => {
    if (!file) {
      toast.error("No file selected.", { position: "top-right" });
      return false;
    }
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error("Invalid image format. Please use JPEG, PNG, or WebP.", {
        position: "top-right",
      });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        "Image size exceeds 5MB limit. Please use an image smaller than 5MB.",
        { position: "top-right" }
      );
      return false;
    }
    return true;
  };

  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes >= 1024 * 1024) {
      return `Size: ${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `Size: ${(sizeInBytes / 1024).toFixed(0)} KB`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateImage(file)) {
      setFileSizeText(formatFileSize(file.size)); // Set file size text
      handleImageUpload(file, index);
    } else {
      setFileSizeText(""); // Clear file size if invalid
    }
  };

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
      {fileSizeText && block.src && (
        <div className="absolute top-0 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          {fileSizeText}
        </div>
      )}
      <button
        onClick={() => {
          removeBlock(index);
          setFileSizeText(""); // Clear file size on remove
        }}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition"
        aria-label="Remove image"
      >
        <MdDeleteForever size={24} />
      </button>
      <input
        type="text"
        placeholder="Image URL (or upload below)"
        value={block.src.startsWith("data:") ? "" : block.src}
        onChange={(e) => {
          updateBlock(index, { ...block, src: e.target.value });
          setFileSizeText(""); // Clear file size if URL is used
        }}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <label className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition mb-4">
        <FiUpload className="w-5 h-5 mr-2" />
        Choose Image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      <input
        placeholder="Caption (optional)"
        value={block.caption}
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
          loading="lazy"
        />
      )}
    </motion.div>
  );
};

export default PostImageBlock;
