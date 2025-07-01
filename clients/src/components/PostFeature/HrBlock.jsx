import React, { useEffect, useState } from "react";

const HrBlock = ({ block, onChange, onDelete }) => {
  const [caption, setCaption] = useState(block?.caption || "");

  useEffect(() => {
    onChange({ ...block, caption });
  }, [caption]);

  return (
    <div className="my-6 text-center">
      <hr className="border-t-2 border-gray-300 w-3/4 mx-auto" />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="mt-2 text-sm text-gray-500 bg-transparent border-none focus:outline-none w-full text-center"
      />
      <button
        onClick={onDelete}
        className="text-red-500 hover:text-red-700 text-xs mt-1 transition"
      >
        Delete
      </button>
    </div>
  );
};

export default HrBlock;