import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const emojiOptions = [
  "😀", "😂", "😊", "😍", "😎", "😢", "😡", "😴", "🤔", "😭",
  "👍", "👎", "👏", "🙏", "💪", "🔥", "🎉", "✨", "💯", "🎂",
  "❤️", "💔", "💕", "💖", "💙", "📌", "📎", "📚", "🧠", "💡",
  "⚡", "🌟", "🌈", "☀️", "🌙",
];

const EmojiBlock = React.forwardRef(({ block, index, removeBlock, updateBlock }, ref) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-3 w-full max-w-xs p-3 bg-white rounded-xl shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div ref={dropdownRef} className="relative flex-grow">
        <button
          onClick={() => setOpen(!open)}
          className="w-full text-4xl bg-gray-100 rounded-lg p-2 hover:bg-gray-200 transition"
          aria-label="Select emoji"
        >
          {block.emoji || "😀"}
        </button>
        {open && (
          <div className="absolute z-20 mt-2 w-64 max-h-48 overflow-y-auto bg-white rounded-lg shadow-lg p-3 grid grid-cols-6 gap-2">
            {emojiOptions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  updateBlock(index, { ...block, emoji });
                  setOpen(false);
                }}
                className={`text-2xl p-1 rounded hover:bg-indigo-100 ${block.emoji === emoji ? "bg-indigo-200" : ""}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => removeBlock(index)}
        className="text-red-500 hover:text-red-700 transition"
        aria-label="Remove emoji"
      >
        ✕
      </button>
    </motion.div>
  );
});

export default EmojiBlock;