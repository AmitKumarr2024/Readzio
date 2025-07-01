import React from "react";

const decodeHtml = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const QuoteBlock = ({ text, author }) => (
  <blockquote className="border-l-4 border-indigo-500 pl-4 my-4 italic bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-r-lg p-3">
    “{decodeHtml(text)}”
    {author && (
      <footer className="text-right mt-2 text-sm text-gray-500">— {decodeHtml(author)}</footer>
    )}
  </blockquote>
);

export default QuoteBlock;