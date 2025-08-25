import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Quote,
  Code,
  Palette,
  Type,
  Smile,
  X,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
} from "lucide-react";

// Emoji options with categories
const emojiCategories = {
  smileys: [
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
    "🥳",
    "😘",
  ],
  gestures: ["👍", "👎", "👏", "🙏", "💪", "✌️", "👌", "🤝"],
  symbols: ["❤️", "💔", "💕", "💖", "💙", "💚", "💛", "🧡", "💜"],
  objects: ["📌", "📎", "📚", "🧠", "💡", "⚡", "🔥", "🎉", "✨", "💯", "🎂"],
  nature: ["🌟", "🌈", "☀️", "🌙", "⭐", "🌸", "🌺", "🌻", "🍀"],
};

const EditorTextBlock = ({
  value = "",
  onUpdate,
  placeholder = "Start typing...",
}) => {
  const contentRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("smileys");
  const [activeCommands, setActiveCommands] = useState({});
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Toast notification system (simple implementation)
  const showToast = useCallback((message, type = "info") => {
    // Simple toast - in real app you'd use a proper toast library
    console.log(`${type.toUpperCase()}: ${message}`);
  }, []);

  // Initialize content
  useEffect(() => {
    if (contentRef.current && value !== contentRef.current.innerHTML) {
      contentRef.current.innerHTML = value || `<p>${placeholder}</p>`;
      updateCounts();
    }
  }, [value, placeholder]);

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

  // Update word and character counts
  const updateCounts = useCallback(() => {
    if (!contentRef.current) return;

    const text = contentRef.current.innerText || "";
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;

    setWordCount(words);
    setCharCount(chars);
  }, []);

  // Check which formatting commands are active
  const checkActiveCommands = useCallback(() => {
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
  }, []);

  // Execute formatting commands with better error handling
  const execCommand = useCallback(
    (command, value = null) => {
      try {
        const selection = window.getSelection();

        // Special handling for commands that need selection
        if (["removeFormat", "createLink"].includes(command)) {
          if (
            !selection ||
            selection.isCollapsed ||
            !selection.toString().trim()
          ) {
            showToast("Please select text first.", "error");
            return;
          }
        }

        // Handle list commands with better logic
        if (
          command === "insertOrderedList" ||
          command === "insertUnorderedList"
        ) {
          const isInList = document.queryCommandState(command);
          if (isInList) {
            document.execCommand("outdent", false, null);
          } else {
            document.execCommand(command, false, null);
          }
        } else {
          document.execCommand(command, false, value);
        }

        handleContentChange();
        contentRef.current?.focus();
      } catch (error) {
        console.error(`Error executing ${command}:`, error);
        showToast(`Error executing ${command}`, "error");
      }
    },
    [showToast]
  );

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!contentRef.current) return;

    const html = contentRef.current.innerHTML;
    onUpdate(html);
    updateCounts();
    checkActiveCommands();
  }, [onUpdate, updateCounts, checkActiveCommands]);

  // Clear all content
  const clearContent = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = `<p>${placeholder}</p>`;
      handleContentChange();
      showToast("Content cleared", "success");
      contentRef.current.focus();
    }
  }, [placeholder, handleContentChange, showToast]);

  // Insert link
  const insertLink = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.toString().trim()) {
      showToast("Please select text to create a link.", "error");
      return;
    }

    const url = prompt("Enter the URL:");
    if (!url) return;

    try {
      const range = selection.getRangeAt(0);
      const link = document.createElement("a");
      link.href = url.startsWith("http") ? url : `https://${url}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = selection.toString();
      link.className =
        "text-blue-600 hover:text-blue-800 underline transition-colors";

      range.deleteContents();
      range.insertNode(link);
      range.setStartAfter(link);

      selection.removeAllRanges();
      selection.addRange(range);

      handleContentChange();
      showToast("Link created successfully", "success");
    } catch (error) {
      showToast("Error creating link", "error");
    }
  }, [handleContentChange, showToast]);

  // Insert emoji
  const insertEmoji = useCallback(
    (emoji) => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const emojiNode = document.createTextNode(emoji);
      range.deleteContents();
      range.insertNode(emojiNode);
      range.setStartAfter(emojiNode);

      selection.removeAllRanges();
      selection.addRange(range);

      handleContentChange();
      setEmojiPickerOpen(false);
      contentRef.current?.focus();
    },
    [handleContentChange]
  );

  // Insert blockquote
  const insertBlockquote = useCallback(() => {
    execCommand("formatBlock", "blockquote");
  }, [execCommand]);

  // Insert code block
  const insertCodeBlock = useCallback(() => {
    execCommand("formatBlock", "pre");
  }, [execCommand]);

  // Copy content to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      await navigator.clipboard.writeText(contentRef.current.innerText);
      showToast("Content copied to clipboard", "success");
    } catch (error) {
      showToast("Failed to copy content", "error");
    }
  }, [showToast]);

  // Handle paste with formatting cleanup
  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      handleContentChange();
    },
    [handleContentChange]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            execCommand("bold");
            break;
          case "i":
            e.preventDefault();
            execCommand("italic");
            break;
          case "u":
            e.preventDefault();
            execCommand("underline");
            break;
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              execCommand("redo");
            } else {
              execCommand("undo");
            }
            break;
        }
      }
    },
    [execCommand]
  );

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: "Bold (Ctrl+B)", shortcut: "Ctrl+B" },
    {
      icon: Italic,
      command: "italic",
      title: "Italic (Ctrl+I)",
      shortcut: "Ctrl+I",
    },
    {
      icon: Underline,
      command: "underline",
      title: "Underline (Ctrl+U)",
      shortcut: "Ctrl+U",
    },
    { icon: Strikethrough, command: "strikeThrough", title: "Strikethrough" },
    { type: "divider" },
    { icon: AlignLeft, command: "justifyLeft", title: "Align Left" },
    { icon: AlignCenter, command: "justifyCenter", title: "Align Center" },
    { icon: AlignRight, command: "justifyRight", title: "Align Right" },
    { type: "divider" },
    { icon: List, command: "insertUnorderedList", title: "Bullet List" },
    { icon: ListOrdered, command: "insertOrderedList", title: "Numbered List" },
    { icon: Quote, command: insertBlockquote, title: "Quote" },
    { icon: Code, command: insertCodeBlock, title: "Code Block" },
    { type: "divider" },
    { icon: Link, command: insertLink, title: "Insert Link" },
    { icon: Undo2, command: "undo", title: "Undo (Ctrl+Z)" },
    { icon: Redo2, command: "redo", title: "Redo (Ctrl+Shift+Z)" },
    { type: "divider" },
    { icon: Copy, command: copyToClipboard, title: "Copy Text" },
    { text: "🚫", command: "removeFormat", title: "Remove Formatting" },
  ];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-lg transition-all hover:shadow-xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
        {toolbarButtons.map((button, index) => {
          if (button.type === "divider") {
            return (
              <div
                key={index}
                className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"
              />
            );
          }

          const Icon = button.icon;
          const isActive = activeCommands[button.command];

          return (
            <button
              key={index}
              onClick={() =>
                typeof button.command === "function"
                  ? button.command()
                  : execCommand(button.command)
              }
              title={button.title}
              className={`
                p-2 rounded-lg transition-all duration-200 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  isActive
                    ? "bg-blue-500 text-white shadow-md transform scale-105"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }
              `}
              aria-pressed={isActive}
              aria-label={button.title}
            >
              {Icon ? <Icon size={16} /> : button.text}
            </button>
          );
        })}

        {/* Text Color Picker */}
        <div className="relative">
          <input
            type="color"
            onChange={(e) => execCommand("foreColor", e.target.value)}
            defaultValue="#000000"
            title="Text Color"
            className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
            aria-label="Text color picker"
          />
          <Palette
            size={12}
            className="absolute bottom-0 right-0 text-gray-500 pointer-events-none"
          />
        </div>

        {/* Font Size Selector */}
        <select
          onChange={(e) => execCommand("fontSize", e.target.value)}
          defaultValue="3"
          title="Font Size"
          className="ml-2 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm"
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
        <div className="relative ml-2" ref={emojiPickerRef}>
          <button
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            title="Insert Emoji"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Toggle emoji picker"
            aria-expanded={emojiPickerOpen}
          >
            <Smile size={16} />
          </button>

          {emojiPickerOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl">
              {/* Emoji Category Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 p-2">
                {Object.keys(emojiCategories).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveEmojiCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      activeEmojiCategory === category
                        ? "bg-blue-500 text-white"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
                <button
                  onClick={() => setEmojiPickerOpen(false)}
                  className="ml-auto p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Emoji Grid */}
              <div className="grid grid-cols-8 gap-1 p-3 max-h-48 overflow-y-auto">
                {emojiCategories[activeEmojiCategory].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 text-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Insert ${emoji} emoji`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Content Button */}
        <button
          onClick={clearContent}
          title="Clear All Content"
          className="ml-auto p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Clear all content"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Editor Content */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onClick={checkActiveCommands}
        onKeyUp={checkActiveCommands}
        onMouseUp={checkActiveCommands}
        className="
          min-h-[200px] p-4 text-gray-900 dark:text-gray-100 
          focus:outline-none 
          prose prose-gray dark:prose-invert max-w-none
          [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:my-2
          [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:my-2
          [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:dark:text-gray-400
          [&>pre]:bg-gray-100 [&>pre]:dark:bg-gray-800 [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:font-mono [&>pre]:text-sm [&>pre]:overflow-x-auto
          [&_a]:text-blue-600 [&_a]:hover:text-blue-800 [&_a]:underline [&_a]:transition-colors
        "
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
      />

      {/* Footer with stats */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-b-xl text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="text-xs">Use Ctrl+B/I/U for quick formatting</div>
      </div>
    </div>
  );
};

export default EditorTextBlock;
