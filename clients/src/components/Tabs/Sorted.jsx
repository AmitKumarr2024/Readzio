import React, { useState, useEffect } from "react";

const Sorted = ({ posts, onSortChange, className = "" }) => {
  const [sortOption, setSortOption] = useState("Newest");

  useEffect(() => {
    if (!posts || !Array.isArray(posts)) return; // Guard against invalid posts

    const sortedPosts = [...posts].sort((a, b) => {
      if (sortOption === "Older") {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      } else if (sortOption === "Popular") {
        return (b.views || 0) - (a.views || 0);
      } else {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
    });

    onSortChange(sortedPosts, sortOption);
  }, [posts, sortOption, onSortChange]);

  return (
    <div
      className={`w-full flex justify-end items-center max-w-full p-2 ${className}`}
    >
      <label
        htmlFor="sort"
        className="mr-2 text-gray-700 dark:text-gray-300 font-medium"
      >
        Sort by:
      </label>
      <select
        id="sort"
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        className="p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="Newest">Newest</option>
        <option value="Older">Older</option>
        <option value="Popular">Popular</option>
      </select>
    </div>
  );
};

export default Sorted;
