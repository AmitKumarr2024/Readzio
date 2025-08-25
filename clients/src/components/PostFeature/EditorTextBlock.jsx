import React, { useEffect, useRef, useState, useCallback } from "react";

// Icon components (simplified for demo - replace with your preferred icons)
const Bold = ({ size = 16 }) => (
  <strong style={{ fontSize: `${size}px` }}>B</strong>
);
const Italic = ({ size = 16 }) => <em style={{ fontSize: `${size}px` }}>I</em>;
const Underline = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px`, textDecoration: "underline" }}>U</span>
);
const Strikethrough = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px`, textDecoration: "line-through" }}>
    S
  </span>
);
const AlignLeft = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>⬅</span>
);
const AlignCenter = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>⬇</span>
);
const AlignRight = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>➡</span>
);
const List = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>•</span>
);
const ListOrdered = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>1.</span>
);
const Quote = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>"</span>
);
const Code = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>{"<>"}</span>
);
const Link = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>🔗</span>
);
const Undo2 = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>↶</span>
);
const Redo2 = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>↷</span>
);
const Copy = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>📋</span>
);
const Palette = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>🎨</span>
);
const Smile = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>😊</span>
);
const X = ({ size = 16 }) => <span style={{ fontSize: `${size}px` }}>✕</span>;
const Trash2 = ({ size = 16 }) => (
  <span style={{ fontSize: `${size}px` }}>🗑</span>
);

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

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("smileys");
  const [activeCommands, setActiveCommands] = useState({});
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Toast notification system (simple implementation)
  const showToast = useCallback((message, type = "info") => {
    console.log(`${type.toUpperCase()}: ${message}`);
  }, []);

  // Initialize content
  useEffect(() => {
    if (contentRef.current && value !== contentRef.current.innerHTML) {
      contentRef.current.innerHTML = value || `<p><br></p>`;
      updateCounts();
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
      if (!contentRef.current) return;

      // Ensure the editor has focus before executing commands
      contentRef.current.focus();

      try {
        const selection = window.getSelection();

        // For commands that need text selection, check if we have a valid selection
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

        // For basic formatting commands, ensure we have a proper selection context
        if (
          ["bold", "italic", "underline", "strikeThrough"].includes(command)
        ) {
          // If no selection exists, create a collapsed range at the current cursor position
          if (
            !selection.rangeCount ||
            !contentRef.current.contains(selection.focusNode)
          ) {
            const range = document.createRange();
            range.selectNodeContents(contentRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
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
          // Execute the command
          const success = document.execCommand(command, false, value);
          if (!success && !["undo", "redo"].includes(command)) {
            console.warn(
              `Command ${command} may not have executed successfully`
            );
          }
        }

        // Delay content update to allow command to fully execute
        requestAnimationFrame(() => {
          handleContentChange();
          if (contentRef.current) {
            contentRef.current.focus();
          }
        });
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

    let html = contentRef.current.innerHTML;

    // Prevent completely empty content
    if (html.trim() === "" || html === "<br>" || html === "<div><br></div>") {
      html = "<p><br></p>";
      contentRef.current.innerHTML = html;
    }

    if (onUpdate) {
      onUpdate(html);
    }
    updateCounts();
    checkActiveCommands();
  }, [onUpdate, updateCounts, checkActiveCommands]);

  // Clear all content
  const clearContent = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = `<p><br></p>`;
      handleContentChange();
      showToast("Content cleared", "success");
      contentRef.current.focus();

      // Place cursor at the beginning
      const range = document.createRange();
      const selection = window.getSelection();
      range.setStart(contentRef.current.firstChild, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [handleContentChange, showToast]);

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
      link.style.color = "#2563eb";
      link.style.textDecoration = "underline";

      range.deleteContents();
      range.insertNode(link);

      // Move cursor after the link
      range.setStartAfter(link);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      handleContentChange();
      showToast("Link created successfully", "success");
    } catch (error) {
      console.error("Error creating link:", error);
      showToast("Error creating link", "error");
    }
  }, [handleContentChange, showToast]);

  // Insert emoji
  const insertEmoji = useCallback(
    (emoji) => {
      if (!contentRef.current) return;

      contentRef.current.focus();

      try {
        const selection = window.getSelection();
        let range;

        if (
          selection.rangeCount > 0 &&
          contentRef.current.contains(selection.focusNode)
        ) {
          range = selection.getRangeAt(0);
        } else {
          // Create a range at the end if no valid selection
          range = document.createRange();
          range.selectNodeContents(contentRef.current);
          range.collapse(false);
        }

        const emojiNode = document.createTextNode(emoji);
        range.deleteContents();
        range.insertNode(emojiNode);

        // Move cursor after the emoji
        range.setStartAfter(emojiNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        handleContentChange();
        setEmojiPickerOpen(false);
      } catch (error) {
        console.error("Error inserting emoji:", error);
        showToast("Error inserting emoji", "error");
      }
    },
    [handleContentChange, showToast]
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

      try {
        const text = e.clipboardData.getData("text/plain");
        const selection = window.getSelection();

        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);

          // Move cursor after inserted text
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        handleContentChange();
      } catch (error) {
        console.error("Error handling paste:", error);
        showToast("Error pasting content", "error");
      }
    },
    [handleContentChange, showToast]
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

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    // Small delay to ensure selection has stabilized
    setTimeout(checkActiveCommands, 10);
  }, [checkActiveCommands]);

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: "Bold (Ctrl+B)" },
    { icon: Italic, command: "italic", title: "Italic (Ctrl+I)" },
    { icon: Underline, command: "underline", title: "Underline (Ctrl+U)" },
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
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "12px",
        backgroundColor: "white",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px",
          padding: "12px",
          borderBottom: "1px solid #d1d5db",
          backgroundColor: "#f9fafb",
          borderRadius: "12px 12px 0 0",
        }}
      >
        {toolbarButtons.map((button, index) => {
          if (button.type === "divider") {
            return (
              <div
                key={index}
                style={{
                  width: "1px",
                  height: "24px",
                  backgroundColor: "#d1d5db",
                  margin: "0 4px",
                }}
              />
            );
          }

          const Icon = button.icon;
          const isActive = activeCommands[button.command];

          return (
            <button
              key={index}
              onMouseDown={(e) => {
                // Prevent losing focus from the editor
                e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                if (typeof button.command === "function") {
                  button.command();
                } else {
                  execCommand(button.command);
                }
              }}
              title={button.title}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: isActive ? "#3b82f6" : "transparent",
                color: isActive ? "white" : "#4b5563",
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                boxShadow: isActive ? "0 2px 4px rgba(0, 0, 0, 0.1)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = "#f3f4f6";
                  e.target.style.color = "#111827";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#4b5563";
                }
              }}
            >
              {Icon ? <Icon size={16} /> : button.text}
            </button>
          );
        })}

        {/* Text Color Picker */}
        <div style={{ position: "relative", marginLeft: "8px" }}>
          <input
            type="color"
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => execCommand("foreColor", e.target.value)}
            defaultValue="#000000"
            title="Text Color"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "2px solid #d1d5db",
              cursor: "pointer",
            }}
          />
          <Palette
            size={12}
            style={{
              position: "absolute",
              bottom: "0",
              right: "0",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Font Size Selector */}
        <select
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => execCommand("fontSize", e.target.value)}
          defaultValue="3"
          title="Font Size"
          style={{
            marginLeft: "8px",
            padding: "4px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            backgroundColor: "white",
            fontSize: "14px",
          }}
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
        <div
          style={{ position: "relative", marginLeft: "8px" }}
          ref={emojiPickerRef}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            title="Insert Emoji"
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "transparent",
              color: "#4b5563",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f3f4f6";
              e.target.style.color = "#111827";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#4b5563";
            }}
          >
            <Smile size={16} />
          </button>

          {emojiPickerOpen && (
            <div
              className="wrap-anywhere"
              style={{
                position: "absolute",
                right: "0",
                zIndex: "50",
                marginTop: "8px",
                width: "370px",
                backgroundColor: "white",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Emoji Category Tabs */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #d1d5db",
                  padding: "8px",
                }}
              >
                {Object.keys(emojiCategories).map((category) => (
                  <button
                    key={category}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setActiveEmojiCategory(category)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      backgroundColor:
                        activeEmojiCategory === category
                          ? "#3b82f6"
                          : "transparent",
                      color:
                        activeEmojiCategory === category ? "white" : "#4b5563",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {category}
                  </button>
                ))}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setEmojiPickerOpen(false)}
                  style={{
                    marginLeft: "auto",
                    padding: "4px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Emoji Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 1fr)",
                  gap: "4px",
                  padding: "12px",
                  maxHeight: "192px",
                  overflowY: "auto",
                }}
              >
                {emojiCategories[activeEmojiCategory].map((emoji) => (
                  <button
                    key={emoji}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertEmoji(emoji)}
                    style={{
                      width: "32px",
                      height: "32px",
                      fontSize: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      backgroundColor: "transparent",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearContent}
          title="Clear All Content"
          style={{
            marginLeft: "auto",
            padding: "8px",
            color: "#ef4444",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#fef2f2";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
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
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onFocus={checkActiveCommands}
        style={{
          minHeight: "200px",
          padding: "16px",
          color: "#111827",
          outline: "none",
          lineHeight: "1.6",
        }}
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
      />

      {/* Footer with stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          backgroundColor: "#f9fafb",
          borderRadius: "0 0 12px 12px",
          fontSize: "14px",
          color: "#6b7280",
          borderTop: "1px solid #d1d5db",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div style={{ fontSize: "12px" }}>
          Use Ctrl+B/I/U for quick formatting
        </div>
      </div>
    </div>
  );
};

export default EditorTextBlock;
