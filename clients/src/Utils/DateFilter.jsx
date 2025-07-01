import React from "react";

function DateFilter({ sortValue, onSortChange, dateValue, onDateChange }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <label htmlFor="dateFilter" className="font-semibold text-text-main-light dark:text-text-main-dark whitespace-nowrap">
          Sort by Date:
        </label>
        <select
          id="dateFilter"
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     transition duration-150"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <label htmlFor="datePicker" className="font-semibold text-text-main-light dark:text-text-main-dark whitespace-nowrap">
          Filter by Date:
        </label>
        <input
          type="date"
          id="datePicker"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     transition duration-150 cursor-pointer"
          style={{ appearance: "auto", WebkitAppearance: "textfield" }}
        />
      </div>
    </div>
  );
}

export default DateFilter;
