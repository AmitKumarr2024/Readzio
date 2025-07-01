import React, { useState, useEffect } from "react";

const Sorted = ({ posts, onSortChange, className = "" }) => {
  const [sortOption, setSortOption] = useState("Newest");

  useEffect(() => {
    const sortedPosts = [...posts].sort((a, b) => {
      if (sortOption === "Older") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortOption === "Popular (Views)") {
        return (b.views || 0) - (a.views || 0);
      } else {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    onSortChange(sortedPosts, sortOption);
  }, [posts, sortOption, onSortChange]);

  return (
    <div className={`w-full flex justify-end items-center max-w-5xl mx-auto p-2 ${className}`}>
      <label htmlFor="sort" className="mr-2 text-text-main-light dark:text-text-main-dark font-medium">
        Sort by:
      </label>
      <select
        id="sort"
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        className="p-2 border border-gray-300  rounded-md bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-900"
      >
        <option value="Newest">Newest</option>
        <option value="Older">Older</option>
        <option value="Popular (Views)">Popular</option>
      </select>
    </div>
  );
};

export default Sorted;
