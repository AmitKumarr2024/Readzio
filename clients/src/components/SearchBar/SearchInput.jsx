import React, { useEffect, useState, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const mockResults = [
  "React Hooks Tutorial",
  "Understanding useEffect",
  "Full Stack Blog App",
  "SEO for Blogs",
  "Creating a Post Editor with Drag and Drop",
];

const SearchInput = ({ className = "", onClose, ...props }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
      if (onClose) onClose(); // Close modal
    }
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.trim()) {
        const filtered = mockResults.filter((item) =>
          item.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredResults(filtered);
        setShowDropdown(true);
      } else {
        setFilteredResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        placeholder="Search articles or blogs..."
        className="w-full px-4 py-2 pr-10 rounded-md border border-gray-500 text-black bg-white placeholder:text-sm focus:outline-none"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        {...props}
      />
      <button
        onClick={handleSearch}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-black hover:text-primary transition-all"
      >
        <FiSearch className="text-lg" />
      </button>

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white text-black rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredResults.length > 0 ? (
            filteredResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSearchTerm(result);
                  handleSearch();
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {result}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-600">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
