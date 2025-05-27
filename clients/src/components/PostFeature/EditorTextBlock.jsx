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

const emojiOptions = [
  "😀", "😂", "😊", "😍", "😎", "😢", "😡", "😴", "🤔", "😭",
  "👍", "👎", "👏", "🙏", "💪", "🔥", "🎉", "✨", "💯", "🎂",
  "❤️", "💔", "💕", "💖", "💙", "📌", "📎", "📚", "🧠", "💡",
  "⚡", "🌟", "🌈", "☀️", "🌙",
];

const EditorTextBlock = ({ value, onUpdate, onRemove }) => {
  const contentRef = useRef(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef();

  // Set content only once on mount (or when value changes externally)
  useEffect(() => {
    if (contentRef.current && value !== contentRef.current.innerHTML) {
      contentRef.current.innerHTML = value || "";
    }
  }, [value]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    if (contentRef.current) {
      onUpdate(contentRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (!contentRef.current) return;
    const html = contentRef.current.innerHTML;
    onUpdate(html);

    setTimeout(() => {
      const current = contentRef.current?.innerHTML?.trim();
      if (!current || current === "<br>") {
        onRemove();
      }
    }, 300);
  };

  const insertLink = () => {
    const url = prompt("Enter the URL:");
    if (!url) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (!selectedText) {
      alert("Please select the text you want to link.");
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = selectedText;
    link.style.color = "blue";
    link.style.textDecoration = "underline";

    range.deleteContents();
    range.insertNode(link);

    range.setStartAfter(link);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    if (contentRef.current) {
      onUpdate(contentRef.current.innerHTML);
    }
  };

  const insertEmojiAtCaret = (emoji) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(emoji);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);

    if (contentRef.current) {
      onUpdate(contentRef.current.innerHTML);
    }

    setEmojiPickerOpen(false);
    contentRef.current.focus();
  };

  const clearContent = () => {
    if (contentRef.current) {
      contentRef.current.innerHTML = "";
    }
    onUpdate("");
    onRemove();
  };

  return (
    <div className="mb-4 border rounded p-3 bg-gray-50 relative">
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center justify-evenly gap-1 text-lg relative">
        <button onClick={() => execCommand("bold")} title="Bold"><FaBold /></button>
        <button onClick={() => execCommand("italic")} title="Italic"><FaItalic /></button>
        <button onClick={() => execCommand("underline")} title="Underline"><FaUnderline /></button>
        <button onClick={() => execCommand("strikeThrough")} title="Strikethrough"><FaStrikethrough /></button>
        <button onClick={() => execCommand("justifyLeft")} title="Align Left"><FaAlignLeft /></button>
        <button onClick={() => execCommand("justifyCenter")} title="Align Center"><FaAlignCenter /></button>
        <button onClick={() => execCommand("justifyRight")} title="Align Right"><FaAlignRight /></button>
        <button onClick={() => execCommand("insertOrderedList")} title="Ordered List">1.</button>
        <button onClick={() => execCommand("insertUnorderedList")} title="Bullet List">•</button>
        <button onClick={insertLink} title="Insert Link"><FaLink size={23} className="text-sky-500" /></button>
        <button onClick={() => execCommand("undo")} title="Undo"><FaUndo /></button>
        <button onClick={() => execCommand("redo")} title="Redo"><FaRedo /></button>
        <button onClick={() => execCommand("removeFormat")} title="Remove Format">🚫</button>
        <input
          type="color"
          onChange={(e) => execCommand("foreColor", e.target.value)}
          title="Text Color"
          defaultValue="#000000"
          className="w-6 h-6 p-0 border rounded"
        />
        <select
          onChange={(e) => execCommand("fontSize", e.target.value)}
          defaultValue="3"
          title="Font Size"
          className="border rounded px-1"
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
            type="button"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            title="Insert Emoji"
            className="text-2xl"
          >
            😀
          </button>

          {emojiPickerOpen && (
            <div
              className="absolute z-10 mt-1 p-2 bg-white border rounded shadow max-h-48 overflow-y-auto grid grid-cols-6 gap-2"
              style={{ width: "200px" }}
            >
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmojiAtCaret(emoji)}
                  className="text-2xl hover:bg-gray-200 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={clearContent} title="Clear Block">
          <FaBackspace size={30} className="text-yellow-700 mr-4" />
        </button>
      </div>

      {/* Editable Content */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning={true}
        onInput={handleInput}
        dir="ltr"
        tabIndex={0}
        className="border p-3 rounded min-h-[120px] bg-white focus:outline-none"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "text" }}
      />
    </div>
  );
};

export default EditorTextBlock;
