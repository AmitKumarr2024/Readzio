import React from "react";

const LinkBlockOutput = ({ href, text, caption }) => {
  return (
    <div className="my-3">
      <a
        href={href || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-all"
      >
        {text || href}
      </a>
      {caption && (
        <div className="text-xs text-gray-500 italic mt-1">
          {caption}
        </div>
      )}
    </div>
  );
};

export default LinkBlockOutput;
