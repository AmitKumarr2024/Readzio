import React, { useEffect, useRef, useState } from "react";
import {
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaRedo,
  FaUndo,
  FaBackspace,
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaLink,
} from "react-icons/fa";
import { toast } from "react-hot-toast";

// Emoji options
const emojiOptions = [
  "😀",
  "😂",
  "😊",
  "😍",
  "😎",
  "😢",
  "😡",
  "😴",
  "🤔",
  "😭",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "🎉",
  "✨",
  "💯",
  "🎂",
  "❤️",
  "💔",
  "💕",
  "💖",
  "💙",
  "📌",
  "📎",
  "📚",
  "🧠",
  "💡",
  "⚡",
  "🌟",
  "🌈",
  "☀️",
  "🌙",
];

const EditorTextBlock = ({ value, onUpdate }) => {
  const contentRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeCommands, setActiveCommands] = useState({});

  // Load initial content
  useEffect(() => {
    if (contentRef.current && value !== contentRef.current.innerHTML) {
      contentRef.current.innerHTML = value || "<p></p>";
    }
  }, [value]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check which buttons are active
  const checkActiveCommands = () => {
    const commands = [
      "bold",
      "italic",
      "underline",
      "strikeThrough",
      "justifyLeft",
      "justifyCenter",
      "justifyRight",
      "insertOrderedList",
      "insertUnorderedList",
    ];
    const newActiveCommands = {};
    commands.forEach((cmd) => {
      try {
        newActiveCommands[cmd] = document.queryCommandState(cmd);
      } catch {
        newActiveCommands[cmd] = false;
      }
    });
    setActiveCommands(newActiveCommands);
  };

  // Execute formatting commands

  const execCommand = (command, val = null) => {
    try {
      const selection = window.getSelection();
      if (
        command === "removeFormat" &&
        (!selection || selection.isCollapsed || !selection.toString().trim())
      ) {
        toast.error("Please select text to remove formatting.");
        return;
      }

      // For lists, ensure proper nesting and cleanup
      if (
        command === "insertOrderedList" ||
        command === "insertUnorderedList"
      ) {
        const range = selection.getRangeAt(0);
        const parent = range.commonAncestorContainer.parentElement;
        if (
          parent.tagName === "UL" ||
          parent.tagName === "OL" ||
          parent.closest("ul, ol")
        ) {
          // Toggle off if already in a list
          document.execCommand("outdent", false, null);
        } else {
          document.execCommand(command, false, null);
        }
      } else {
        document.execCommand(command, false, val);
      }

      onUpdate(contentRef.current?.innerHTML || "");
      checkActiveCommands();
      contentRef.current?.focus();
    } catch (e) {
      console.error(`[EditorTextBlock] Error executing ${command}:`, e);
      toast.error(`Error executing ${command}`);
    }
  };

  // Handle content change
  const handleInput = () => {
    let html = contentRef.current?.innerHTML || "";
    // Convert <font size="x"> to <span style="font-size: ...px">
    html = html.replace(
      /<font size="1">(.*?)<\/font>/gi,
      '<span style="font-size:10px">$1</span>'
    );
    html = html.replace(
      /<font size="2">(.*?)<\/font>/gi,
      '<span style="font-size:13px">$1</span>'
    );
    html = html.replace(
      /<font size="3">(.*?)<\/font>/gi,
      '<span style="font-size:16px">$1</span>'
    );
    html = html.replace(
      /<font size="4">(.*?)<\/font>/gi,
      '<span style="font-size:18px">$1</span>'
    );
    html = html.replace(
      /<font size="5">(.*?)<\/font>/gi,
      '<span style="font-size:24px">$1</span>'
    );
    html = html.replace(
      /<font size="6">(.*?)<\/font>/gi,
      '<span style="font-size:32px">$1</span>'
    );
    html = html.replace(
      /<font size="7">(.*?)<\/font>/gi,
      '<span style="font-size:48px">$1</span>'
    );

    onUpdate(html);
    checkActiveCommands();
  };

  // Clear entire editor
  const clearContent = () => {
    if (contentRef.current) {
      contentRef.current.innerHTML = "<p></p>";
      onUpdate("<p></p>");
      toast.success("Block content cleared");
      contentRef.current.focus();
    }
  };

  // Insert link around selected text
  const insertLink = () => {
    const url = prompt("Enter the URL:");
    if (!url) return;
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.toString()) {
      toast.error("Please select text to link.");
      return;
    }
    const range = selection.getRangeAt(0);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = selection.toString();
    link.className = "text-indigo-600 underline hover:text-indigo-800";
    range.deleteContents();
    range.insertNode(link);
    range.setStartAfter(link);
    selection.removeAllRanges();
    selection.addRange(range);
    onUpdate(contentRef.current?.innerHTML || "");
    checkActiveCommands();
  };

  // Insert emoji at cursor
  const insertEmoji = (emoji) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(emoji));
    range.setStartAfter(range.endContainer);
    sel.removeAllRanges();
    sel.addRange(range);
    onUpdate(contentRef.current?.innerHTML || "");
    setEmojiPickerOpen(false);
    contentRef.current?.focus();
    checkActiveCommands();
  };

  return (
    <div className="mb-4 border rounded-xl p-3 sm:p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md transition-shadow hover:shadow-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 p-2 sm:p-3 rounded-lg">
        {[
          { icon: <FaBold />, command: "bold", title: "Bold" },
          { icon: <FaItalic />, command: "italic", title: "Italic" },
          { icon: <FaUnderline />, command: "underline", title: "Underline" },
          {
            icon: <FaStrikethrough />,
            command: "strikeThrough",
            title: "Strikethrough",
          },
          {
            icon: <FaAlignLeft />,
            command: "justifyLeft",
            title: "Align Left",
          },
          {
            icon: <FaAlignCenter />,
            command: "justifyCenter",
            title: "Align Center",
          },
          {
            icon: <FaAlignRight />,
            command: "justifyRight",
            title: "Align Right",
          },
          { icon: "1.", command: "insertOrderedList", title: "Ordered List" },
          { icon: "•", command: "insertUnorderedList", title: "Bullet List" },
          {
            icon: <FaLink className="text-indigo-500" />,
            command: insertLink,
            title: "Insert Link",
          },
          { icon: <FaUndo />, command: "undo", title: "Undo" },
          { icon: <FaRedo />, command: "redo", title: "Redo" },
          { icon: "🚫", command: "removeFormat", title: "Remove Format" },
        ].map(({ icon, command, title }, i) => (
          <button
            key={i}
            onClick={() =>
              typeof command === "function" ? command() : execCommand(command)
            }
            title={title}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              activeCommands[command]
                ? "bg-indigo-500 text-white"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            } focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
            aria-pressed={activeCommands[command] || false}
            aria-label={title}
          >
            {icon}
          </button>
        ))}

        {/* Text Color Picker */}
        <input
          type="color"
          onChange={(e) => execCommand("foreColor", e.target.value)}
          defaultValue="#000000"
          title="Text Color"
          className="w-6 h-6 sm:w-8 sm:h-8 p-1 rounded-lg border focus:ring-2 focus:ring-indigo-500"
          aria-label="Text color picker"
        />

        {/* Font Size Selector */}

        <select
          onChange={(e) => execCommand("fontSize", e.target.value)}
          defaultValue="4"
          title="Font Size"
          className="border rounded-lg px-1 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
          aria-label="Font size selector"
        >
          <option value="1">10px</option>
          <option value="2">13px</option>
          <option value="3">16px</option>
          <option value="4">18px</option>
          <option value="5">24px</option>
          <option value="6">32px</option>
          <option value="7">48px</option>
        </select>

        {/* Emoji Picker */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            title="Insert Emoji"
            className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            aria-label="Toggle emoji picker"
            aria-expanded={emojiPickerOpen}
          >
            😀
          </button>
          {emojiPickerOpen && (
            <div className="absolute right-0 z-20 mt-2 p-2 sm:p-3 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark border rounded-lg shadow-xl grid grid-cols-5 sm:grid-cols-6 gap-1 sm:gap-2 max-h-40 sm:max-h-48 overflow-y-auto w-64 sm:w-72">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 sm:w-10 sm:h-10 text-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  aria-label={`Insert ${emoji} emoji`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Content Button */}
        <button
          onClick={clearContent}
          title="Clear Block Content"
          className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          aria-label="Clear text block content"
        >
          <FaBackspace className="text-red-500" size={16} />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={checkActiveCommands}
        onKeyUp={checkActiveCommands}
        onMouseUp={checkActiveCommands}
        className="
  min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 rounded-lg
  bg-background-light dark:bg-background-dark
  text-text-main-light dark:text-text-main-dark
  border border-gray-200 dark:border-gray-800
  focus:outline-none focus:ring-2 focus:ring-indigo-500
  text-lg leading-relaxed
  [&>ul]:list-disc [&>ul]:pl-5
  [&>ol]:list-decimal [&>ol]:pl-5
  [&>ul]:space-y-1 [&>ol]:space-y-1
"
        role="textbox"
        aria-multiline="true"
        aria-label="Text editor"
      />
    </div>
  );
};

export default EditorTextBlock;
