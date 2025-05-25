import React from "react";
import { MdDeleteForever } from "react-icons/md";
import { FiUpload } from "react-icons/fi";
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
}) => (
  <motion.div
    ref={refProp}
    key={index}
    className="relative bg-white p-6 pr-12 rounded-2xl shadow-md border border-gray-200"
    variants={blockVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    layout
  >
    <button
      onClick={() => removeBlock(index)}
      className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition"
      aria-label="Remove image block"
    >
      <MdDeleteForever size={28} />
    </button>

    <input
      type="text"
      placeholder="Image URL (or upload below)"
      value={block.src.startsWith("data:") ? "" : block.src}
      onChange={(e) => updateBlock(index, { ...block, src: e.target.value })}
      className="w-full border border-gray-300 rounded-md px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
    />

    <label className="mb-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition duration-300">
      <FiUpload className="w-5 h-5 mr-2" />
      <span>Choose Image</span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.type.startsWith("image/")) {
            handleImageUpload(file, index);
          } else {
            alert("Please select a valid image file.");
          }
        }}
        className="hidden"
      />
    </label>

    <input
      placeholder="Caption (optional)"
      value={block.caption}
      onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })}
      className="w-full border border-gray-300 rounded-md px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
    />

    {block.src && (
      <img
        src={block.src}
        alt={block.caption || "Uploaded"}
        className="rounded-lg max-w-full max-h-96 object-contain border border-gray-300"
      />
    )}
  </motion.div>
);

export default PostImageBlock;
