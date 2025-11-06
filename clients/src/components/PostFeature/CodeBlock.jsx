import React from "react";
import { IoIosBackspace } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const supportedLanguages = [
  "javascript",
  "python",
  "java",
  "c",
  "cpp",
  "go",
  "typescript",
  "bash",
  "html",
  "css",
  "json",
  "markdown",
  "text", // ✅ added safe fallback
];

// ✅ Normalizer
const getValidLanguage = (lang, code) => {
  const supportedLanguages = [
    "javascript",
    "python",
    "java",
    "c",
    "cpp",
    "go",
    "typescript",
    "bash",
    "html",
    "css",
    "json",
    "markdown",
  ];

  // Detect HTML automatically if code starts with <
  if (!lang || lang === "plaintext") {
    if (code?.trim().startsWith("<")) return "html";
    return "code"; // fallback to real language instead of 'text'
  }

  // Only return supported languages
  return supportedLanguages.includes(lang) ? lang : "code";
};

const CodeBlock = ({ block, index, updateBlock, removeBlock, refProp }) => {
  if (!block || typeof block.code === "undefined") return null;

  const normalizedLang = getValidLanguage(block.language, block.code);

  return (
    <motion.div
      ref={refProp}
      className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-lg border border-gray-700"
      variants={blockVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => updateBlock(index, { ...block, code: "" })}
          className="text-gray-400 hover:text-gray-200 transition"
          aria-label="Clear code"
        >
          <IoIosBackspace size={24} />
        </button>
      </div>

      {/* Language selector */}
      <select
        value={normalizedLang} // ✅ always safe
        onChange={(e) =>
          updateBlock(index, { ...block, language: e.target.value })
        }
        className="mb-4 bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-40"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {lang.charAt(0).toUpperCase() + lang.slice(1)}
          </option>
        ))}
      </select>

      {/* Code editor */}
      <textarea
        value={block.code}
        onChange={(e) => updateBlock(index, { ...block, code: e.target.value })}
        placeholder="Write your code here..."
        rows={6}
        className="w-full bg-gray-800 text-white rounded-lg p-4 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y"
      />

      {/* Preview with syntax highlighting */}
      {block.code && (
        <div className="mt-4 bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <SyntaxHighlighter
            language={normalizedLang} // ✅ safe lang here too
            style={oneDark}
            wrapLongLines
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
        className="w-full mt-4 bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </motion.div>
  );
};

export default CodeBlock;
