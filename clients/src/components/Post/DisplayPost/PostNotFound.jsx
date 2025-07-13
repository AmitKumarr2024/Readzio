// src/components/Post/DisplayPost/PostNotFound.jsx
import React from "react";

const PostNotFound = ({ message, className }) => (
  <div
    className={`flex flex-col items-center justify-center p-8 bg-background-light dark:bg-background-dark rounded-2xl shadow-xl border border-gray-300 dark:border-gray-700 text-text-main-light dark:text-text-main-dark ${className}`}
  >
    <svg
      className="w-16 h-16 text-red-500 mb-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <p className="text-lg font-semibold text-center">
      {message || "Post not found"}
    </p>
  </div>
);

export default PostNotFound;