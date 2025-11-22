import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

// ✅ Auto-detect language from code content
const detectLanguage = (code) => {
  if (!code || !code.trim()) return "text";

  const trimmed = code.trim();

  // HTML detection
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /^<[a-z]+/.test(trimmed)
  ) {
    return "html";
  }

  // Python detection
  if (
    /^(def|class|import|from|print)\s/.test(trimmed) ||
    trimmed.includes("if __name__")
  ) {
    return "python";
  }

  // JavaScript/JSX detection
  if (
    /^(const|let|var|function|import|export|class)\s/.test(trimmed) ||
    trimmed.includes("=>") ||
    trimmed.includes("console.")
  ) {
    return "javascript";
  }

  // CSS detection
  if (/^[\w-]+\s*\{|^\.[\w-]+\s*\{|^#[\w-]+\s*\{/.test(trimmed)) {
    return "css";
  }

  // JSON detection
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    trimmed.includes(":")
  ) {
    return "json";
  }

  // Fallback to generic text
  return "text";
};

const CodeBlockOutput = ({ code, language = "javascript", caption }) => {
  const [copied, setCopied] = useState(false);

  // ✅ Normalize the language
  const normalizedLang = getValidLanguage(language, code);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="group relative my-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden backdrop-blur-sm">
      {/* Header with language badge and copy button */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800/80 border-b border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
            {normalizedLang.toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`
            inline-flex items-center px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-800
            ${
              copied
                ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30 shadow-lg shadow-green-500/20"
                : "bg-gradient-to-r from-gray-700/50 to-gray-600/50 text-gray-300 border border-gray-600/50 hover:from-blue-600/20 hover:to-purple-600/20 hover:text-blue-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20"
            }
          `}
          aria-label="Copy code"
        >
          <svg
            className={`w-4 h-4 mr-2 transition-all duration-300 ${
              copied ? "text-green-300" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {copied ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            )}
          </svg>
          <span className="font-mono">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* Code content */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[600px]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <SyntaxHighlighter
          language={normalizedLang}
          style={tomorrow}
          customStyle={{
            margin: 0,
            padding: "1.5rem",
            fontSize: "1.1rem",
            backgroundColor: "transparent",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            lineHeight: "1.7",
          }}
          wrapLongLines
          showLineNumbers
          lineNumberStyle={{
            color: "#6B7280",
            paddingRight: "1rem",
            fontSize: "1rem",
            minWidth: "2.5rem",
            textAlign: "right",
            userSelect: "none",
            opacity: 0.6,
          }}
        >
          {code}
        </SyntaxHighlighter>

        {/* Subtle gradient overlay for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t from-gray-900/40 to-transparent"></div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700/50 backdrop-blur-sm">
          <p className="text-sm text-gray-400 italic flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            {caption}
          </p>
        </div>
      )}

      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-500 pointer-events-none"></div>

      {/* Subtle glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 -z-10"></div>
    </div>
  );
};

// Demo usage
export default function App() {
  const pythonCode = `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # Output: 120`;

  const jsCode = `const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
};

greet('World');`;

  const htmlCode = `<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
</head>
<body>
    <h1>Hello World!</h1>
</body>
</html>`;

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <h1 className="text-3xl font-bold text-white mb-8">
        CodeBlock Output Demo
      </h1>

      <CodeBlockOutput
        code={pythonCode}
        language="python"
        caption="A simple recursive factorial function in Python"
      />

      <CodeBlockOutput
        code={jsCode}
        language="javascript"
        caption="Arrow function example in JavaScript"
      />

      <CodeBlockOutput
        code={htmlCode}
        language="html"
        caption="Basic HTML5 document structure"
      />
    </div>
  );
}
