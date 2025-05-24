import React from "react";
import { FiFilter } from "react-icons/fi";

const FiltersSidebar = () => {
  return (
    <aside className="bg-white shadow-md rounded-2xl p-6 sticky top-6 border border-gray-100">
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
          <select className="w-full border border-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
            <option>All</option>
            <option>Technology</option>
            <option>Health</option>
            <option>Finance</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select className="w-full border border-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
            <option>Newest</option>
            <option>Popular</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

export default FiltersSidebar;
