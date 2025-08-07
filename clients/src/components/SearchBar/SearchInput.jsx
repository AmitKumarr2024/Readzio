import React, { useState, useEffect, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getSearchPosts } from "../../store/postSlice";
import { searchUsers, clearSearchedUsers } from "../../store/userSlice";
import useDebounce from "./useDebounce";

const SearchInput = ({ className = "", onClose, ...props }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);
  const lastQueryRef = useRef("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchPosts = useSelector((state) => state.post.searchPosts || []);
  const searchLoading = useSelector((state) => state.post.searchLoading);
  const searchError = useSelector((state) => state.post.searchError);
  const searchedUsers = useSelector((state) => state.user.searchedUsers || []);
  const userLoading = useSelector((state) => state.user.searchedUsersLoading);

  const debouncedSearch = useDebounce((value) => {
    const trimmed = value.trim();
    if (trimmed.length >= 3 && trimmed !== lastQueryRef.current) {
      dispatch(getSearchPosts({ query: trimmed }));
      dispatch(searchUsers(trimmed));
      lastQueryRef.current = trimmed;
      setShowDropdown(true);
    } else if (trimmed.length < 1) {
      dispatch(clearSearchedUsers());
      setShowDropdown(false);
    }
  }, 400);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim().length >= 3) {
      const query = searchTerm.trim();
      dispatch(getSearchPosts({ query }));
      dispatch(searchUsers(query));
      navigate(`/search?query=${encodeURIComponent(query)}`);
      setShowDropdown(false);
      if (onClose) onClose();
    }
  };

  const clearInput = () => {
    setSearchTerm("");
    dispatch(clearSearchedUsers());
    setShowDropdown(false);
  };

  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setShowDropdown(false);
      if (onClose) onClose();
    }
  };

  const handleSelectPost = (slug) => {
    navigate(`/post/${slug}`);
    clearInput();
    if (onClose) onClose();
  };

  const handleSelectUser = (userId) => {
    navigate(`/author-profile/${userId}`);
    clearInput();
    if (onClose) onClose();
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-2xl ${className}`}
    >
      <div className="relative">
        <input
          type="search"
          placeholder="Search articles or users..."
          className="w-full px-4 py-3 pr-12 rounded-lg border border-transparent bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900 dark:to-blue-900 text-text-main-light dark:text-text-main-dark placeholder:text-indigo-400 placeholder:text-base text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-300 shadow-sm"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search articles or users"
          aria-expanded={showDropdown}
          {...props}
        />
        {searchTerm && (
          <button
            onClick={clearInput}
            className="absolute right-12 top-1/2 -translate-y-1/2 text-indigo-500 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-100 transition-colors duration-200"
            type="button"
            aria-label="Clear search"
          >
            <FiX className="text-lg" />
          </button>
        )}
        <button
          onClick={() => {
            const query = searchTerm.trim();
            if (query.length >= 3)  {
              dispatch(getSearchPosts({ query }));
              dispatch(searchUsers(query));
              navigate(`/search?query=${encodeURIComponent(query)}`);
              setShowDropdown(false);
              if (onClose) onClose();
            }
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-100 transition-colors duration-200"
          aria-label="Search"
          type="button"
        >
          <FiSearch className="text-lg" />
        </button>
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-2 w-7xl max-w-[190vw] sm:max-w-md  right-0 sm:right-0 md:right-0 max-h-[450px] overflow-y-auto bg-background-light dark:bg-background-dark border border-indigo-200 dark:border-indigo-700 rounded-xs shadow-lg transition-all duration-200 ease-in-out">
          {searchLoading || userLoading ? (
            <div className="p-4 text-center text-indigo-500 dark:text-indigo-300 animate-pulse text-base sm:text-lg">
              Loading...
            </div>
          ) : searchError ? (
            <div className="p-4 text-center text-red-500 dark:text-red-300 text-base sm:text-lg">
              Error: {searchError}
            </div>
          ) : (
            <>
              {searchedUsers.map((user, index) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user._id)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 border-b border-indigo-100 dark:border-indigo-700 last:border-b-0 transition-colors duration-150 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  tabIndex={0}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.name || "User"} avatar`}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                      {(() => {
                        const name = user.name || "";
                        const parts = name.trim().split(" ");
                        if (parts.length >= 2) return parts[0][0] + parts[1][0];
                        if (parts.length === 1) return parts[0][0];
                        return (user.email?.[0] || "U").toUpperCase();
                      })()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-base sm:text-xl font-bold text-indigo-700 dark:text-indigo-200">
                      {user?.name}{" "}
                      {/* <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {user?.username || "N/A"}
                      </span> */}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                      {user.email}
                    </p>
                    <p className="text-sm sm:text-lg text-gray-400 dark:text-gray-500">
                      Posts: {user.totalPosts || 0}
                    </p>
                  </div>
                </button>
              ))}

              {searchPosts.map((post, index) => (
                <button
                  key={post._id}
                  onClick={() => handleSelectPost(post.slug)}
                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 border-b border-indigo-100 dark:border-indigo-700 last:border-b-0 transition-colors duration-150 text-base sm:text-xl text-indigo-700 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  tabIndex={0}
                >
                  📝 {post.title}
                </button>
              ))}

              {searchedUsers.length === 0 && searchPosts.length === 0 && (
                <div className="p-4 text-center text-indigo-500 dark:text-indigo-300 text-sm sm:text-base">
                  No results found.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
