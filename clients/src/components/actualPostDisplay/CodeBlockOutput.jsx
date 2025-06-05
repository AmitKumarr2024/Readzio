import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlockOutput = ({ code, language = 'javascript', caption }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden my-8">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition select-none"
        aria-label="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>

      <div className="absolute -bottom-3 right-3 mb-4 text-xs bg-gray-700 text-white px-2 py-1 rounded select-none uppercase font-semibold">
        {language}
      </div>

      <SyntaxHighlighter
        language={language}
        style={tomorrow}
        customStyle={{
          margin: 0,
          padding: '1.25rem',
          fontSize: '0.875rem',
          backgroundColor: '#1a202c',
        }}
        wrapLongLines
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>

      {caption && (
        <div className="text-xs text-gray-400 italic mt-1 px-5 pb-3">{caption}</div>
      )}
    </div>
  );
};

export default CodeBlockOutput;
