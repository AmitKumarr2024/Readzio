import React from "react";
import { FiExternalLink } from "react-icons/fi";

const LinkBlock = ({ href, text }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 px-4 py-3 my-4 max-w-md mx-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl shadow-sm hover:shadow-md transition"
  >
    <span className="font-medium truncate">{text}</span>
    <FiExternalLink className="w-5 h-5" />
  </a>
);

export default LinkBlock;