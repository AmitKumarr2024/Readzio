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

  const handleInput = () => {
    let html = contentRef.current?.innerHTML || "";
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

  const clearContent = () => {
    if (contentRef.current) {
      contentRef.current.innerHTML = "<p></p>";
      onUpdate("<p></p>");
      toast.success("Block content cleared");
      contentRef.current.focus();
    }
  };

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
    link.className =
      "text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200";
    range.deleteContents();
    range.insertNode(link);
    range.setStartAfter(link);
    selection.removeAllRanges();
    selection.addRange(range);
    onUpdate(contentRef.current?.innerHTML || "");
    checkActiveCommands();
  };

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
    <div className="mb-8 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
      {/* Modern Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
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
            icon: <FaLink className="text-blue-500" />,
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
            className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 ${
              activeCommands[command]
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
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
          className="w-9 h-9 sm:w-10 sm:h-10 p-1 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          aria-label="Text color picker"
        />

        {/* Font Size Selector */}
        <select
          onChange={(e) => execCommand("fontSize", e.target.value)}
          defaultValue="4"
          title="Font Size"
          className="border-2 border-gray-200 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer"
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
            className="p-2 sm:p-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
            aria-label="Toggle emoji picker"
            aria-expanded={emojiPickerOpen}
          >
            😀
          </button>
          {emojiPickerOpen && (
            <div className="absolute right-0 z-20 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto w-72 sm:w-80">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="w-10 h-10 text-2xl flex items-center justify-center hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
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
          className="p-2 sm:p-2.5 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-red-500 focus:outline-none transition-all duration-200"
          aria-label="Clear text block content"
        >
          <FaBackspace className="text-red-500" size={18} />
        </button>
      </div>

      {/* Modern Editable Area with Newspaper-style Typography */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={checkActiveCommands}
        onKeyUp={checkActiveCommands}
        onMouseUp={checkActiveCommands}
        className="
          min-h-[200px] sm:min-h-[250px] p-6 sm:p-8 lg:p-10
          bg-white dark:bg-gray-800
          text-gray-800 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
          
          text-base sm:text-lg lg:text-xl
          leading-relaxed sm:leading-loose
          font-serif
          
          [&>p]:mb-5 [&>p]:leading-relaxed [&>p]:sm:leading-loose
          [&>h1]:text-3xl [&>h1]:sm:text-4xl [&>h1]:font-bold [&>h1]:mb-6 [&>h1]:mt-8
          [&>h2]:text-2xl [&>h2]:sm:text-3xl [&>h2]:font-bold [&>h2]:mb-5 [&>h2]:mt-7
          [&>h3]:text-xl [&>h3]:sm:text-2xl [&>h3]:font-semibold [&>h3]:mb-4 [&>h3]:mt-6
          
          [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:sm:pl-8 [&>ul]:space-y-2 [&>ul]:my-5
          [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:sm:pl-8 [&>ol]:space-y-2 [&>ol]:my-5
          [&>ul>li]:mb-2 [&>ol>li]:mb-2
          
          [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-6 
          [&>blockquote]:italic [&>blockquote]:my-6 [&>blockquote]:text-gray-600 
          [&>blockquote]:dark:text-gray-400
          
          [&_a]:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:underline 
          [&_a]:hover:text-blue-700 [&_a]:dark:hover:text-blue-300
          [&_a]:transition-colors [&_a]:duration-200
          
          [&_strong]:font-bold [&_em]:italic [&_u]:underline
        "
        role="textbox"
        aria-multiline="true"
        aria-label="Text editor with newspaper-style formatting"
        style={{
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      />
    </div>
  );
};

export default EditorTextBlock;
