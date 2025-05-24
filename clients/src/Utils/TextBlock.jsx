import React, { useEffect, useRef } from "react";
import { FaAlignLeft } from "react-icons/fa6";
import { FaAlignCenter } from "react-icons/fa6";
import { FaAlignRight } from "react-icons/fa6";
import { FaRedo } from "react-icons/fa";
import { FaUndo } from "react-icons/fa";
import { FaBackspace } from "react-icons/fa";
import { FaBold } from "react-icons/fa";
import { FaItalic } from "react-icons/fa6";
import { FaUnderline } from "react-icons/fa";
import { FaStrikethrough } from "react-icons/fa";
import { FaLink } from "react-icons/fa";

const TextBlock = ({ value, onUpdate, onRemove }) => {
  const contentRef = useRef(null);

  // Set initial content only once
  useEffect(() => {
    if (contentRef.current && value) {
      contentRef.current.innerHTML = value;
    }
  }, []); // Only on mount

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    if (contentRef.current) {
      onUpdate(contentRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    const html = contentRef.current.innerHTML;
    onUpdate(html);

    // Delay to avoid accidental block removal while typing
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

    // Create the link element with blue color
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = selectedText;
    link.style.color = "blue";
    link.style.textDecoration = "underline";

    // Replace the selected text with the link node
    range.deleteContents();
    range.insertNode(link);

    // Remove selection (optional)
    selection.removeAllRanges();
  };

  const clearContent = () => {
    if (contentRef.current) {
      contentRef.current.innerHTML = "";
    }
    onUpdate("");
    onRemove();
  };

  return (
    <div className="mb-4 border rounded p-3 bg-gray-50">
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center justify-evenly gap-1 text-lg">
        <button onClick={() => execCommand("bold")} title="Bold">
          <FaBold />
        </button>
        <button onClick={() => execCommand("italic")} title="Italic">
          <FaItalic />
        </button>
        <button onClick={() => execCommand("underline")} title="Underline">
          <FaUnderline />
        </button>
        <button
          onClick={() => execCommand("strikeThrough")}
          title="Strikethrough"
        >
          <FaStrikethrough />
        </button>
        <button onClick={() => execCommand("justifyLeft")} title="Align Left">
          <FaAlignLeft />
        </button>
        <button
          onClick={() => execCommand("justifyCenter")}
          title="Align Center"
        >
          <FaAlignCenter />
        </button>
        <button onClick={() => execCommand("justifyRight")} title="Align Right">
          <FaAlignRight />
        </button>
        <button
          onClick={() => execCommand("insertOrderedList")}
          title="Ordered List"
        >
          1.
        </button>
        <button
          onClick={() => execCommand("insertUnorderedList")}
          title="Bullet List"
        >
          •
        </button>
        <button onClick={insertLink} title="Insert Link">
          <FaLink size={23} className="text-sky-500"/>
        </button>
        <button onClick={() => execCommand("undo")} title="Undo">
          <FaUndo />
        </button>
        <button onClick={() => execCommand("redo")} title="Redo">
          <FaRedo />
        </button>
        <button
          onClick={() => execCommand("removeFormat")}
          title="Remove Format"
        >
          🚫
        </button>
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
        className="border p-3 rounded min-h-[120px] bg-white focus:outline-none"
      ></div>
    </div>
  );
};

export default TextBlock;
