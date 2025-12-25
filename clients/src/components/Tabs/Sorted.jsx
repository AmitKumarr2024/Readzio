import React from "react";
import { ChevronDown, BarChart3, Clock, Calendar } from "lucide-react";

const Sorted = ({ sortBy, onSortChange, className = "" }) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 ${className}`}
    >
      {/* Dynamic Count (kept exactly as UI) */}
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        Sorting posts
      </span>

      <div className="flex items-center gap-3">
        <label
          htmlFor="sort"
          className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
        >
          Sort by:
        </label>

        <div className="relative group min-w-[140px]">
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full appearance-none cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2 pl-4 pr-10 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          >
            <option value="latest">✨ Newest</option>
            <option value="views">🔥 Popular</option>
            <option value="likes">❤️ Most Liked</option>
          </select>

          {/* Custom Arrow Icon (unchanged) */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sorted;
