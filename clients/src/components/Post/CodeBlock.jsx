import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";

const CodeBlock = ({ code, language = "javascript", caption }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl shadow-inner my-6">
      <button
        className="absolute top-2 right-2 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition select-none z-10"
        onClick={handleCopy}
        type="button"
        aria-label="Copy code"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <SyntaxHighlighter
        language={language}
        style={okaidia}
        customStyle={{ borderRadius: "0.5rem", padding: "1.25rem", margin: 0 }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
      {caption && (
        <div className="text-xs text-gray-400 italic mt-1 px-5 pb-3 select-none">
          {caption}
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
