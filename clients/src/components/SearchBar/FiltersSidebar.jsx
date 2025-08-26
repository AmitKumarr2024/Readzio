import React from "react";
import { FiFilter } from "react-icons/fi";

const FiltersSidebar = ({
  category,
  sortBy,
  onCategoryChange,
  onSortChange,
  className,
}) => {
  return (
    <aside
      className={`w-full max-w-sm h-fit bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-6">
        <FiFilter className="text-2xl text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-2xl font-bold">Filters</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 text-sm rounded-xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400 dark:hover:border-indigo-400 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Technology">Technology</option>
            <option value="Health">Health & Wellness</option>
            <option value="Finance">Finance & Business</option>
            <option value="Lifestyle">Lifestyle</option>
            <option value="Education">Education</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 text-sm rounded-xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-300 hover:border-indigo-400 dark:hover:border-indigo-400 cursor-pointer"
          >
            <option value="Newest">Newest First</option>
            <option value="Older">Oldest First</option>
            <option value="Popular">Most Popular</option>
            <option value="Trending">Trending</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

export default FiltersSidebar;
