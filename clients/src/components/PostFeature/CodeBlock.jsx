import React from "react";
import { MdDeleteForever } from "react-icons/md";
import { IoIosBackspace } from "react-icons/io";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

// List of supported languages
const supportedLanguages = [
  "javascript", "python", "java", "c", "cpp", "go", "typescript", "bash", "html", "css", "json", "markdown"
];

const CodeBlock = ({ block, index, updateBlock, removeBlock, refProp }) => {
  if (!block || typeof block.code === "undefined") return null;

  return (
    <motion.div
      ref={refProp}
      key={index}
      className="relative bg-gray-900 p-6 pt-10 pr-10 rounded-2xl shadow-md border border-gray-700 text-white font-mono"
      variants={blockVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <button
        onClick={() => removeBlock(index)}
        className="absolute top-1 right-2 text-red-400 hover:text-red-600 transition"
        aria-label="Remove code block"
      >
        <MdDeleteForever size={28} />
      </button>

      <button
        onClick={() => updateBlock(index, { ...block, code: "" })}
        className="absolute top-1 right-12 text-gray-500 hover:text-gray-700 font-bold transition flex items-center gap-1 px-2 mt-1 rounded-md bg-gray-100"
        aria-label="Clear code"
        title="Clear code"
      >
        <IoIosBackspace size={20} />
        ClearCode
      </button>

      {/* Language Dropdown */}
      <select
        value={block.language || "javascript"}
        onChange={(e) => updateBlock(index, { ...block, language: e.target.value })}
        className="absolute top-1 left-4 text-black text-sm px-2 py-1 rounded bg-white border border-gray-300 focus:outline-none"
        aria-label="Select programming language"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>

      <textarea
        value={block.code}
        onChange={(e) => updateBlock(index, { ...block, code: e.target.value })}
        placeholder="Write your code here..."
        rows={6}
        className="w-full bg-gray-800 rounded-md p-4 mt-4 resize-none border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600 transition text-white"
      />

      {block.code && (
        <div className="mt-4 overflow-x-auto max-w-full bg-gray-800 rounded-md p-4">
          <SyntaxHighlighter
            language={block.language || "javascript"}
            style={oneDark}
            wrapLongLines={true}
          >
            {block.code}
          </SyntaxHighlighter>
        </div>
      )}

      <input
        placeholder="Caption (optional)"
        value={block.caption}
        onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })}
        className="w-full mt-4 rounded-md px-4 py-3 text-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
      />
    </motion.div>
  );
};

export default CodeBlock;
