import React, { useState, useEffect, useRef } from "react";
import { FiSearch, FiX, FiUser, FiFileText, FiLoader } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getSearchPosts } from "../../store/postSlice";
import { searchUsers, clearSearchedUsers } from "../../store/userSlice";
import useDebounce from "./useDebounce";

const SearchInput = ({
  className = "",
  onClose,
  autoFocus = false,
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const lastQueryRef = useRef("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchPosts = useSelector((state) => state.post.searchPosts || []);
  const searchLoading = useSelector((state) => state.post.searchLoading);
  const searchError = useSelector((state) => state.post.searchError);
  const searchedUsers = useSelector((state) => state.user.searchedUsers || []);
  const userLoading = useSelector((state) => state.user.searchedUsersLoading);

  const [debouncedSearch, cancelSearch] = useDebounce((value) => {
    const trimmed = value.trim();
    if (trimmed.length >= 2 && trimmed !== lastQueryRef.current) {
      dispatch(getSearchPosts({ query: trimmed }));
      dispatch(searchUsers(trimmed));
      lastQueryRef.current = trimmed;
      setShowDropdown(true);
    } else if (trimmed.length === 0) {
      dispatch(clearSearchedUsers());
      if (searchedUsers.length === 0 && searchPosts.length === 0) {
        setShowDropdown(false);
      }
    }
  }, 300);

  const allResults = [
    ...searchedUsers.map((user) => ({ type: "user", data: user })),
    ...searchPosts.map((post) => ({ type: "post", data: post })),
  ];

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);
    debouncedSearch(value);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || allResults.length === 0) {
      if (e.key === "Enter" && searchTerm.trim().length >= 2) {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : allResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selected = allResults[selectedIndex];
          if (selected.type === "user") {
            handleSelectUser(selected.data._id);
          } else {
            handleSelectPost(selected.data.slug);
          }
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowDropdown(false);
        if (onClose) onClose();
        break;
    }
  };

  const handleSearch = () => {
    const query = searchTerm.trim();
    if (query.length >= 2) {
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
    setSelectedIndex(-1);
    cancelSearch();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setShowDropdown(false);
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

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const isLoading = searchLoading || userLoading;

  useEffect(() => {
    if (!isLoading && searchedUsers.length === 0 && searchPosts.length === 0) {
      setShowDropdown(false);
    }
  }, [isLoading, searchedUsers, searchPosts]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-3xl ${className}`}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search articles, users, or topics..."
          className="w-full px-5 py-4 pr-24 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search articles, users, or topics"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
          }
          autoComplete="off"
          {...props}
        />

        {isLoading && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2">
            <FiLoader className="text-lg text-indigo-500 animate-spin" />
          </div>
        )}

        {searchTerm && !isLoading && (
          <button
            onClick={clearInput}
            className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            type="button"
            aria-label="Clear search"
          >
            <FiX className="text-lg" />
          </button>
        )}

        <button
          onClick={handleSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white p-2.5 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
          aria-label="Search"
          type="button"
        >
          <FiSearch className="text-lg" />
        </button>
      </div>

      {showDropdown &&
        (searchedUsers.length > 0 || searchPosts.length > 0 || isLoading) && (
          <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <FiLoader className="inline text-lg animate-spin mr-2" />
                Searching...
              </div>
            ) : searchError ? (
              <div className="p-4 text-center text-red-500 dark:text-red-400">
                Error: {searchError}
              </div>
            ) : allResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No results found for "{searchTerm}"
              </div>
            ) : (
              <div className="py-2">
                {searchedUsers.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Users
                  </div>
                )}

                {searchedUsers.map((user, index) => {
                  const globalIndex = index;
                  return (
                    <button
                      key={user._id}
                      id={`search-result-${globalIndex}`}
                      onClick={() => handleSelectUser(user._id)}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors duration-150 focus:outline-none ${
                        selectedIndex === globalIndex
                          ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={`${user.name || "User"} avatar`}
                            className="w-10 h-10 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                            {(() => {
                              const name = user.name || "";
                              const parts = name.trim().split(" ");
                              if (parts.length >= 2)
                                return parts[0][0] + parts[1][0];
                              if (parts.length === 1) return parts[0][0];
                              return (user.email?.[0] || "U").toUpperCase();
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FiUser className="text-sm flex-shrink-0" />
                          <p className="font-medium truncate">{user.name}</p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {user.totalPosts || 0} posts
                        </p>
                      </div>
                    </button>
                  );
                })}

                {searchPosts.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Posts
                  </div>
                )}

                {searchPosts.map((post, index) => {
                  const globalIndex = searchedUsers.length + index;
                  return (
                    <button
                      key={post._id}
                      id={`search-result-${globalIndex}`}
                      onClick={() => handleSelectPost(post.slug)}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors duration-150 focus:outline-none ${
                        selectedIndex === globalIndex
                          ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <FiFileText className="text-lg text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{post.title}</p>
                        {post.category && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {post.category}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default SearchInput;
