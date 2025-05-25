import React from "react";
const QuoteBlock = ({ text, author }) => (
  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4">
    “{text}”
    {author && <footer className="mt-2 text-sm text-right">— {author}</footer>}
  </blockquote>
);
export default QuoteBlock;