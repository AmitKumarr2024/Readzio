import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const Sorted = ({ posts = [], onSortChange, className = "" }) => {
  const [sortOption, setSortOption] = useState("Newest");

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortOption(value);

    if (!Array.isArray(posts)) return;

    const sortedPosts = [...posts].sort((a, b) => {
      const aDate = new Date(a?.createdAt || 0).getTime();
      const bDate = new Date(b?.createdAt || 0).getTime();

      if (value === "Older") {
        return aDate - bDate;
      }

      if (value === "Popular") {
        return (b?.viewsCount || 0) - (a?.viewsCount || 0);
      }

      // Default: Newest
      return bDate - aDate;
    });

    onSortChange(sortedPosts, value);
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-end gap-4 w-full px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 ${className}`}
    >
      <div className="flex items-center gap-3">
        <label
          htmlFor="sort"
          className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
        >
          Sort by:
        </label>

        <div className="relative min-w-[140px]">
          <select
            id="sort"
            value={sortOption}
            onChange={handleSortChange}
            className="w-full appearance-none cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2 pl-4 pr-10 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          >
            <option value="Newest">✨ Newest</option>
            <option value="Older">⏳ Older</option>
            <option value="Popular">🔥 Popular</option>
          </select>

          {/* Dropdown Icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sorted;
