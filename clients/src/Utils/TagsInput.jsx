import React, { useState } from "react";

// Input for adding/removing tags
const TagsInput = ({ tags, setTags }) => {
  const [inputValue, setInputValue] = useState("");

  // Add new tags from input
  const addTags = (value) => {
    const newTags = value
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && !tags.includes(tag));
    if (newTags.length) {
      setTags([...tags, ...newTags]);
    }
  };

  // Handle Enter/comma to add tags
  const handleKeyDown = (e) => {
    try {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTags(inputValue);
        setInputValue("");
      } else if (e.key === "Backspace" && !inputValue) {
        setTags(tags.slice(0, -1));
      }
    } catch (e) {
      console.error("[TagsInput] Keydown error:", e);
    }
  };

  // Remove tag by index
  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="tags-input-container border rounded p-2 flex flex-wrap gap-1">
      {tags.map((tag, index) => (
        <div
          key={index}
          className="tag-item bg-blue-200 text-blue-800 rounded px-2 py-1 flex items-center gap-1"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        placeholder="Type and press comma or enter..."
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-grow p-1 outline-none"
      />
    </div>
  );
};

export default TagsInput;