import React, { useState, useEffect } from "react";

const Sorted = ({ posts, onSortChange, className = "" }) => {
  const [sortOption, setSortOption] = useState("Newest");

  // Sort posts whenever posts or sortOption changes
  useEffect(() => {
    const sortedPosts = [...posts].sort((a, b) => {
      if (sortOption === "Older") {
        return new Date(a.createdAt) - new Date(b.createdAt); // Ascending by createdAt
      } else if (sortOption === "Popular (Views)") {
        return (b.views || 0) - (a.views || 0); // Descending by views
      } else if (sortOption === "Newest") {
        return new Date(b.createdAt) - new Date(a.createdAt); // Descending by createdAt
      }
      return 0;
    });

    console.log(
      "[Sorted] Sorted by:",
      sortOption,
      "Posts count:",
      sortedPosts.length
    );
    onSortChange(sortedPosts, sortOption);
  }, [posts, sortOption, onSortChange]);

  return (
    <div className={`w-full flex justify-end items-center  max-w-5xl mx-auto -mt-7 mr-36 p-1 ${className}`}>
      <label htmlFor="sort" className="mr-2 text-gray-700 font-medium">
        Sort by:
      </label>
      <select
        id="sort"
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        className="p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="Newest">Newest</option>
        <option value="Older">Older</option>
        <option value="Popular (Views)">Popular</option>
      </select>
    </div>
  );
};

export default Sorted;
