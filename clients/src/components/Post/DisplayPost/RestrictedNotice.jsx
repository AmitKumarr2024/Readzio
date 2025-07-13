// src/components/Post/DisplayPost/RestrictedNotice.jsx
import React from "react";

const RestrictedNotice = ({ isBlocked, isAuthor, showAnyway }) => {
  if (!isBlocked || showAnyway) return null;
  return (
    <div className="mb-6 p-6 bg-background-light dark:bg-background-dark rounded-2xl shadow-xl border border-gray-300 dark:border-gray-700 text-center">
      <div className="flex flex-col items-center gap-2 text-text-main-light dark:text-text-main-dark">
        <svg
          className="w-8 h-8 text-yellow-500"
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
        <p className="text-lg font-semibold">
          This post is blocked and not publicly visible.
        </p>
        {isAuthor && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Only you can view it as the author.
          </p>
        )}
      </div>
    </div>
  );
};

export default RestrictedNotice;