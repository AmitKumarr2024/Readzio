import React from "react";
import { FiFilter } from "react-icons/fi";

const FiltersSidebar = ({ category, sortBy, onCategoryChange, onSortChange, className }) => {
  return (
    <aside className={`bg-white/80 backdrop-blur-lg w-full max-w-sm h-fit shadow-2xl rounded-3xl p-6 border border-indigo-100 transition-all duration-300 hover:shadow-3xl ${className}`}>
      <div className="flex items-center gap-3 text-indigo-900 mb-6">
        <FiFilter className="text-2xl text-indigo-600" />
        <h2 className="text-2xl font-bold">Filters</h2>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full border border-indigo-200 text-sm rounded-xl px-4 py-3 bg-white text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-300 hover:border-indigo-300"
          >
            <option value="All">All</option>
            <option value="Technology">Technology</option>
            <option value="Health">Health</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-2">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full border border-indigo-200 text-sm rounded-xl px-4 py-3 bg-white text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-300 hover:border-indigo-400"
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