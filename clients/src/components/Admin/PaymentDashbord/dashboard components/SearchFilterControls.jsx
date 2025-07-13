import React from "react";
import { FaSearch, FaSort } from "react-icons/fa";

const SearchFilterControls = ({ searchTerm, setSearchTerm, sortField, setSortField, sortOrder, setSortOrder }) => (
  <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
    <div className="relative w-full sm:w-64">
      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main-light dark:text-text-main-dark" />
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
      />
    </div>
    <div className="flex gap-4">
      <select
        value={sortField}
        onChange={(e) => setSortField(e.target.value)}
        className="p-2 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-500 transition-all duration-300"
      >
        <option value="username">Username</option>
        <option value="email">Email</option>
        <option value="total">Total Earnings</option>
      </select>
      <button
        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-blue-700 transition-all duration-300"
      >
        <FaSort />
        Sort {sortOrder === "asc" ? "A-Z" : "Z-A"}
      </button>
    </div>
  </div>
);

export default SearchFilterControls;