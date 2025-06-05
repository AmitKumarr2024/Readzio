import React from "react";
import { FiFilter } from "react-icons/fi";

const FiltersSidebar = ({ category, sortBy, onCategoryChange, onSortChange }) => {
  return (
    <aside className="bg-white w-72 h-96  shadow-md rounded-2xl p-6 sticky top-32 border border-gray-100">
      <div className="flex items-center gap-2 text-gray-800 mb-6">
        <FiFilter className="text-xl" />
        <h2 className="text-lg sm:text-xl font-semibold">Filters</h2>
      </div>

      <div className="space-y-6">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full border border-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          >
            <option value="All">All</option>
            <option value="Technology">Technology</option>
            <option value="Health">Health</option>
            <option value="Finance">Finance</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full border border-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          >
            <option value="Newest">Newest</option>
            <option value="Older">Older</option>
            <option value="Popular">Popular</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

export default FiltersSidebar;
