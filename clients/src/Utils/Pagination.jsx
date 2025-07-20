import React, { useState, useEffect } from "react";

// Pagination with prev/next and manual input
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Sync input with current page
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^[0-9]+$/.test(value)) {
      setInputValue(value);
    }
  };

  // Validate and change page on blur
  const handleInputBlur = () => {
    try {
      const page = parseInt(inputValue, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page);
      } else {
        setInputValue(currentPage.toString());
      }
    } catch (e) {
      console.error("[Pagination] Input error:", e);
    }
  };

  // Handle Enter key for page change
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-4 mb-10">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1 bg-blue-500 text-text-main-light dark:text-text-main-dark rounded disabled:bg-gray-400"
      >
        Prev
      </button>
      <span className="text-sm text-text-main-light dark:text-text-main-dark flex items-center gap-1">
        Page{" "}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="w-12 px-1 py-0.5 border rounded text-center"
        />{" "}
        of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;