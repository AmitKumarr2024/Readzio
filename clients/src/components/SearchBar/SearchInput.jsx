import React, { useState, useEffect, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getSearchPosts } from "../../store/postSlice";
import useDebounce from "./useDebounce";

const SearchInput = ({ className = "", onClose, ...props }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchPosts = useSelector((state) => state.post?.searchPosts || []);
  const searchLoading = useSelector((state) => state.post?.searchLoading);
  const searchError = useSelector((state) => state.post?.searchError);

  const getErrorMessage = (error) => {
    if (!error) return "Something went wrong";
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    return "Unknown error occurred";
  };

  const debouncedSearch = useDebounce((value) => {
    if (value.trim().length >= 3) {
      dispatch(getSearchPosts({ query: value.trim() }));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, 500);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim().length >= 3) {
      e.preventDefault();
      dispatch(getSearchPosts({ query: searchTerm.trim() }));
      navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
      setShowDropdown(false);
      if (onClose) onClose();
    }
  };

  const clearInput = () => {
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setShowDropdown(false);
      if (onClose) onClose();
    }
  };

  const handleSelectResult = (slug) => {
    navigate(`/post/${slug}`);
    setShowDropdown(false);
    setSearchTerm("");
    if (onClose) onClose();
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          type="search"
          placeholder="Search articles or blogs..."
          className="w-full px-5 py-2 pr-12 rounded-full border border-indigo-200 bg-white/90 dark:bg-background-dark dark:text-text-main-dark text-indigo-900 placeholder:text-indigo-400 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300 backdrop-blur-sm"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search articles or blogs"
          {...props}
        />
        {searchTerm && (
          <button
            onClick={clearInput}
            aria-label="Clear search input"
            className="absolute right-12 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-700 transition duration-300"
            type="button"
          >
            <FiX className="text-xl" />
          </button>
        )}
        <button
          onClick={() => {
            if (searchTerm.trim().length >= 3) {
              dispatch(getSearchPosts({ query: searchTerm.trim() }));
              navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
              setShowDropdown(false);
              if (onClose) onClose();
            }
          }}
          aria-label="Search"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-700 transition duration-300"
          type="button"
        >
          <FiSearch className="text-xl" />
        </button>
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-3 w-full max-h-64 overflow-y-auto bg-white/95 border border-indigo-200 rounded-2xl shadow-2xl transform transition-all duration-300 ease-out backdrop-blur-sm">
          {searchLoading ? (
            <div className="p-4 text-center text-indigo-600 animate-pulse">
              Loading...
            </div>
          ) : searchError ? (
            <div className="p-4 text-center text-red-600">
              Error: {getErrorMessage(searchError)}
            </div>
          ) : searchPosts.length === 0 ? (
            <div className="p-4 text-center text-indigo-600">
              No results found.
            </div>
          ) : (
            searchPosts.map((post) => (
              <button
                key={post._id}
                onClick={() => handleSelectResult(post.slug)}
                className="w-full text-left px-5 py-3 text-indigo-800 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition duration-300"
                type="button"
              >
                {post.title}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
