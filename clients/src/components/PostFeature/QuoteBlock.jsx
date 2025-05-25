import React from "react";

function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

const QuoteBlock = ({ text, author }) => {
  return (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">
      “{decodeHtml(text)}”
      {author && (
        <footer className="text-right mt-2 text-sm text-gray-500">— {decodeHtml(author)}</footer>
      )}
    </blockquote>
  );
};

export default QuoteBlock;
