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

  // ✅ Fix here: use 'post' not 'posts'
  const searchPosts = useSelector((state) => state.post?.searchPosts || []);
  const searchLoading = useSelector((state) => state.post?.searchLoading);
  const searchError = useSelector((state) => state.post?.searchError);

  // Helper function to safely stringify error for rendering
  function getErrorMessage(error) {
    if (!error) return "Something went wrong";

    if (typeof error === "string") return error;

    if (error.message) return error.message;

    try {
      const str = JSON.stringify(error);
      if (str && str !== "{}") return str;
    } catch {
      // ignore stringify errors
    }

    return "Unknown error occurred";
  }

  const debouncedSearch = useDebounce((value) => {
    if (value.trim()) {
      dispatch(getSearchPosts(value.trim()));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, 300);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchTerm.trim()) {
        dispatch(getSearchPosts(searchTerm.trim()));
        navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
        setShowDropdown(false);
        if (onClose) onClose();
      }
    }
  };

  const clearInput = () => {
    setSearchTerm("");
    setShowDropdown(false);
    if (onClose) onClose();
  };

  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setShowDropdown(false);
      if (onClose) onClose();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (postId) => {
    navigate(`/post/${postId}`);
    setShowDropdown(false);
    setSearchTerm("");
    if (onClose) onClose();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="search"
        placeholder="Search articles or blogs..."
        className="w-full px-4 py-2 pr-10 rounded-md border border-gray-500 text-black bg-white placeholder:text-sm focus:outline-none"
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
          className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition"
          type="button"
        >
          <FiX className="text-lg" />
        </button>
      )}

      <button
        onClick={() => {
          if (searchTerm.trim()) {
            dispatch(getSearchPosts(searchTerm.trim()));
            navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
            setShowDropdown(false);
            if (onClose) onClose();
          }
        }}
        aria-label="Search"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-black hover:text-primary"
        type="button"
      >
        <FiSearch className="text-lg" />
      </button>

      {/* 🔍 Dropdown Results */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto text-black bg-white border border-gray-300 rounded-md shadow-lg">
          {searchLoading ? (
            <div className="p-2 text-center text-gray-500">Loading...</div>
          ) : searchError ? (
            <div className="p-2 text-center text-red-500">
              Error: {getErrorMessage(searchError)}
            </div>
          ) : searchPosts.length === 0 ? (
            <div className="p-2 text-center text-gray-500">No results found.</div>
          ) : (
            searchPosts.map((post) => (
              <button
                key={post._id}
                onClick={() => handleSelectResult(post._id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
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
