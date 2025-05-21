import React, { useState } from "react";

const filterOptions = ["Popular", "Newest", "Oldest"];

const HorizontalBar = ({ onFilterChange }) => {
  const [selectedFilter, setSelectedFilter] = useState("");

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedFilter(value);
    onFilterChange && onFilterChange(value);
  };

  return (
    <div className="flex justify-end items-center bg-slate-200 p-1 rounded-md shadow-md mx-auto container">
      <label htmlFor="filter" className="mr-4 font-semibold">
        Sort by:
      </label>
      <select
        id="filter"
        value={selectedFilter}
        onChange={handleChange}
        className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        <option value="">Select</option>
        {filterOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default HorizontalBar;
