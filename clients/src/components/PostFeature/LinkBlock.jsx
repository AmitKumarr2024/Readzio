import React from "react";
import { FiExternalLink } from "react-icons/fi";

const LinkBlock = ({ href, text }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center space-x-2 px-4 py-2 my-4 max-w-md mx-auto bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg shadow-sm transition-colors duration-300"
  >
    <span className="font-medium text-lg">{text}</span>
    <FiExternalLink className="w-5 h-5" />
  </a>
);

export default LinkBlock;
