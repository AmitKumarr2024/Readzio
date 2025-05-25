import React, { useEffect, useState } from "react";

const HrBlock = ({ block, onChange, onDelete }) => {
  const [caption, setCaption] = useState(block?.caption || "");

  useEffect(() => {
    onChange({ ...block, caption });
  }, [caption]);

  return (
    <div className="my-6 text-center">
      <hr className="border-t-2 border-gray-400 w-3/4 mx-auto" />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add caption (optional)"
        className="mt-2 text-sm text-gray-600 bg-transparent border-none outline-none w-full text-center"
      />
      <button
        onClick={() => onDelete()}  // <-- Changed here: no argument passed
        className="text-red-500 text-xs mt-1"
      >
        Delete
      </button>
    </div>
  );
};

export default HrBlock;
