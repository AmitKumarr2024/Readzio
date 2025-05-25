import React, { useState, useRef, useEffect } from "react";

const emojiOptions = [
  "😀", "😂", "😊", "😍", "😎", "😢", "😡", "😴", "🤔", "😭",
  "👍", "👎", "👏", "🙏", "💪",
  "🔥", "🎉", "✨", "💯", "🎂",
  "❤️", "💔", "💕", "💖", "💙",
  "📌", "📎", "📚", "🧠", "💡",
  "⚡", "🌟", "🌈", "☀️", "🌙"
];

const EmojiBlock = React.forwardRef(({ block, index, removeBlock, updateBlock }, ref) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  const toggleOpen = () => setOpen(!open);

  const selectEmoji = (emoji) => {
    updateBlock(index, { ...block, emoji });
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={ref}
      className="flex items-center justify-between gap-4 w-72 px-4 py-3 bg-white rounded-xl shadow relative"
    >
      <div ref={dropdownRef} className="relative flex-grow">
        <button
          type="button"
          onClick={toggleOpen}
          className="w-full text-4xl text-left bg-gray-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-200 focus:outline-none"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {block.emoji || "😀"}
        </button>

        {open && (
          <div
            role="listbox"
            tabIndex={-1}
            className="absolute z-10 mt-1 max-h-48 min-w-[450px] p-4 overflow-y-auto rounded-lg bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            style={{ maxWidth: "100%" }}
          >
            <div className="grid grid-cols-6 gap-4 px-2">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => selectEmoji(emoji)}
                  className={`text-3xl rounded hover:bg-blue-100 ${
                    block.emoji === emoji ? "bg-blue-200" : ""
                  }`}
                  aria-selected={block.emoji === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => removeBlock(index)}
        className="text-red-500 hover:text-red-700 text-2xl font-bold"
        aria-label="Remove emoji block"
        type="button"
      >
        ✕
      </button>
    </div>
  );
});

export default EmojiBlock;
