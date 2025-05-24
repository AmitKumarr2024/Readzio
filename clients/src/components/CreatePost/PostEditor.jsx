import React, { useRef, useEffect } from "react";
import TextBlock from "../../Utils/TextBlock";
import { MdDeleteForever, MdClear } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiUpload } from "react-icons/fi";
import { IoIosBackspace } from "react-icons/io";



const PostEditor = ({ title, setTitle, blocks, setBlocks, size }) => {
  const blockRefs = useRef([]);

  const addBlock = (type) => {
    const newBlock =
      type === "text"
        ? { type, value: "<p></p>" }
        : type === "code"
        ? { type, code: "", caption: "" }
        : { type, src: "", caption: "" };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index, newData) => {
    const updated = [...blocks];
    updated[index] = newData;
    setBlocks(updated);
  };

  const removeBlock = (index) => {
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
  };

  const handleImageUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(index, { ...blocks[index], src: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (blockRefs.current.length > 0) {
      const lastBlock = blockRefs.current[blockRefs.current.length - 1];
      if (lastBlock) {
        lastBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [blocks]);

  // Animation variants for blocks
  const blockVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  // Animation variants for buttons
  const buttonHover = {
    scale: 1.05,
    boxShadow: "0 0 8px rgba(0,0,0,0.2)",
  };
  const sizeToWidthClass = (size) => {
    const widthMap = {
      25: "md:w-1/4", // 25%
      50: "md:w-1/2", // 50%
      60: "md:w-[60%]",
      75: "md:w-3/4", // 75%
      100: "md:w-full", // 100%
    };
    return widthMap[size] || "md:w-full"; // Fallback to w-full if size isn’t mapped
  };

  return (
    <div
      className={`w-full ${sizeToWidthClass(
        size
      )} h-screen bg-gray-50 flex flex-col p-6 rounded-2xl shadow-lg`}
    >
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-6 tracking-wide">
        Create Content
      </h1>

      {/* Title Input */}
      <section className="mb-6">
        <label className="block mb-3 font-semibold text-gray-700 text-3xl">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Write your post title here..."
          className="w-full border border-gray-300 rounded-lg px-5 py-3 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </section>

      {/* Content Blocks */}
      <div className="flex flex-col overflow-y-auto mb-6 w-full space-y-6 pr-3">
        <AnimatePresence>
          {blocks.map((block, index) => {
            if (block.type === "text") {
              return (
                <motion.div
                  key={index}
                  ref={(el) => (blockRefs.current[index] = el)}
                  className="relative bg-white w-full pr-10 p-6 rounded-2xl shadow-md border border-gray-200"
                  variants={blockVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <button
                    onClick={() => removeBlock(index)}
                    className="absolute top-1 right-0 text-red-500 hover:text-red-700 transition"
                    aria-label="Remove text block"
                  >
                    <MdDeleteForever size={28} />
                  </button>
                  <TextBlock
                    value={block.value}
                    onUpdate={(val) =>
                      updateBlock(index, { ...block, value: val })
                    }
                  />
                </motion.div>
              );
            } else if (block.type === "image") {
              return (
                <motion.div
                  key={index}
                  ref={(el) => (blockRefs.current[index] = el)}
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
                    onChange={(e) =>
                      updateBlock(index, { ...block, src: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  />

                  <label className="mb-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition duration-300">
                    <FiUpload className="w-5 h-5 mr-2" />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, index)}
                      className="hidden"
                    />
                  </label>

                  <input
                    placeholder="Caption (optional)"
                    value={block.caption}
                    onChange={(e) =>
                      updateBlock(index, { ...block, caption: e.target.value })
                    }
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
            } else if (block.type === "code") {
              return (
                <motion.div
                  key={index}
                  ref={(el) => (blockRefs.current[index] = el)}
                  className="relative bg-gray-900 p-6 pt-10 pr-10 rounded-2xl shadow-md border border-gray-700 text-white font-mono"
                  variants={blockVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  {/* Buttons */}
                  <button
                    onClick={() => removeBlock(index)}
                    className="absolute top-1 right-2 text-red-400 hover:text-red-600 transition"
                    aria-label="Remove code block"
                  >
                    <MdDeleteForever size={28} />
                  </button>

                  <button
                    onClick={() => updateBlock(index, { ...block, code: "" })}
                    className="absolute top-1 right-12 text-gray-500 hover:text-gray-700 hover: font-bold transition flex items-center gap-1 px-2 mt-1 rounded-md bg-gray-100"
                    aria-label="Clear code"
                    title="Clear code"
                  >
                    <IoIosBackspace size={20} />
                    ClearCode
                  </button>

                  {/* Textarea for editing code */}
                  <textarea
                    value={block.code}
                    onChange={(e) =>
                      updateBlock(index, { ...block, code: e.target.value })
                    }
                    placeholder="Write your code here..."
                    rows={6}
                    className="w-full bg-gray-800 rounded-md p-4 resize-none border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600 transition text-white"
                  />

                  {/* Live preview with syntax highlighting */}
                  {block.code && (
                    <div className="mt-4 overflow-x-auto max-w-full bg-gray-800 rounded-md p-4">
                      <SyntaxHighlighter
                        language="javascript"
                        style={oneDark}
                        wrapLongLines={true}
                      >
                        {block.code}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {/* Optional caption */}
                  <input
                    placeholder="Caption (optional)"
                    value={block.caption}
                    onChange={(e) =>
                      updateBlock(index, { ...block, caption: e.target.value })
                    }
                    className="w-full mt-4 rounded-md px-4 py-3 text-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  />
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>
      </div>

      {/* Add New Blocks Buttons */}
      <div className="flex gap-5 justify-center">
        <motion.button
          onClick={() => addBlock("text")}
          className="bg-indigo-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
          whileHover={buttonHover}
          transition={{ type: "spring", stiffness: 300 }}
        >
          + Text
        </motion.button>
        <motion.button
          onClick={() => addBlock("image")}
          className="bg-green-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
          whileHover={buttonHover}
          transition={{ type: "spring", stiffness: 300 }}
        >
          + Image
        </motion.button>
        <motion.button
          onClick={() => addBlock("code")}
          className="bg-purple-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg"
          whileHover={buttonHover}
          transition={{ type: "spring", stiffness: 300 }}
        >
          + Code
        </motion.button>
      </div>
    </div>
  );
};

export default PostEditor;
