import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiFileText,
  FiSearch,
  FiLoader,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { getSearchPosts } from "../../store/postSlice";
import { searchUsers } from "../../store/userSlice";
import CardOfPost from "../Cards/CardOfPost";
import FiltersSidebar from "./FiltersSidebar";

const SearchResults = ({ searchTerm }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchPosts = useSelector((state) => state.post?.searchPosts || []);
  const searchLoading = useSelector((state) => state.post?.searchLoading);
  const searchError = useSelector((state) => state.post?.searchError);
  const searchedUsers = useSelector((state) => state.user?.searchedUsers || []);
  const userLoading = useSelector((state) => state.user?.searchedUsersLoading);
  const userSearchError = useSelector((state) => state.user?.searchError);

  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const resultsPerPage = 12;

  useEffect(() => {
    const trimmed = searchTerm?.trim();
    if (trimmed && trimmed.length >= 1) {
      dispatch(getSearchPosts({ query: trimmed }));
      dispatch(searchUsers(trimmed));
      setCurrentPage(1);
    }
  }, [searchTerm, dispatch]);

  const filteredSortedPosts = useMemo(() => {
    let filtered = searchPosts;

    if (category !== "All") {
      filtered = filtered.filter((post) => post.category === category);
    }

    switch (sortBy) {
      case "Newest":
        return [...filtered].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      case "Older":
        return [...filtered].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      case "Popular":
        return [...filtered].sort(
          (a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)
        );
      case "Trending":
        return [...filtered].sort(
          (a, b) => (b.likesCount || 0) - (a.likesCount || 0)
        );
      default:
        return filtered;
    }
  }, [searchPosts, category, sortBy]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    return filteredSortedPosts.slice(start, start + resultsPerPage);
  }, [filteredSortedPosts, currentPage, resultsPerPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedPosts.length / resultsPerPage)
  );

  const isLoading = searchLoading || userLoading;
  const hasError = searchError || userSearchError;
  const hasResults = searchedUsers.length > 0 || filteredSortedPosts.length > 0;

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter(
      (item, index, arr) => arr.indexOf(item) === index
    );
  };

  const UserCard = ({ user, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-600"
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name || "User Avatar"}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 border-2 border-gray-200 dark:border-gray-700"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg sm:text-2xl font-bold shadow-md">
          {(() => {
            const name = user.name || "";
            const parts = name.trim().split(" ");
            if (parts.length >= 2) {
              return parts[0][0] + parts[1][0];
            } else if (parts.length === 1) {
              return parts[0][0];
            } else {
              return (user.email?.[0] || "U").toUpperCase();
            }
          })()}
        </div>
      )}

      <div className="flex-grow w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FiUser className="text-indigo-500 text-sm" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.name}
              </h4>
            </div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {user.email}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {user.totalPosts || 0} post{user.totalPosts === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/author-profile/${user._id}`)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            View Profile
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  const LoadingState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <FiLoader className="text-4xl text-indigo-500 mb-4" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-medium text-gray-600 dark:text-gray-400"
      >
        Searching for results...
      </motion.p>
    </motion.div>
  );

  const ErrorState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md mx-auto"
      >
        <p className="text-red-600 dark:text-red-400 text-lg font-semibold">
          Error: {hasError || "Something went wrong"}
        </p>
        <p className="text-red-500 dark:text-red-300 text-sm mt-2">
          Please try again or contact support if the issue persists.
        </p>
      </motion.div>
    </motion.div>
  );

  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center py-16"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <FiSearch className="text-6xl text-gray-400 dark:text-gray-600 mx-auto mb-4" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
      >
        {!searchTerm || searchTerm.trim().length < 1
          ? "Enter a search term"
          : "No results found"}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-gray-600 dark:text-gray-400"
      >
        {!searchTerm || searchTerm.trim().length < 1
          ? "Start typing to search for articles and users"
          : `No matches found for "${searchTerm}". Try different keywords.`}
      </motion.p>
    </motion.div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {(currentPage - 1) * resultsPerPage + 1} to{" "}
          {Math.min(currentPage * resultsPerPage, filteredSortedPosts.length)}{" "}
          of {filteredSortedPosts.length} posts
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <FiChevronLeft className="text-sm" />
            Previous
          </button>

          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === "number" && setCurrentPage(page)}
                disabled={page === "..."}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  page === currentPage
                    ? "bg-indigo-600 text-white"
                    : page === "..."
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Next
            <FiChevronRight className="text-sm" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm ? `Search Results for "${searchTerm}"` : "Search"}
          </h1>
          {hasResults && !isLoading && (
            <p className="text-gray-600 dark:text-gray-400">
              Found {searchedUsers.length} user
              {searchedUsers.length !== 1 ? "s" : ""} and{" "}
              {filteredSortedPosts.length} post
              {filteredSortedPosts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <FiltersSidebar
            category={category}
            sortBy={sortBy}
            onCategoryChange={(val) => {
              setCategory(val);
              setCurrentPage(1);
            }}
            onSortChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            className="w-full lg:w-80 shrink-0"
          />

          {/* Main Content */}
          <main className="flex-grow">
            {isLoading ? (
              <LoadingState />
            ) : hasError ? (
              <ErrorState />
            ) : !hasResults ? (
              <EmptyState />
            ) : (
              <>
                {/* Users Section */}
                {searchedUsers.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <FiUser className="text-xl text-indigo-600 dark:text-indigo-400" />
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Matching Users ({searchedUsers.length})
                      </h2>
                    </div>
                    <div className="grid gap-4">
                      {searchedUsers.map((user, index) => (
                        <UserCard key={user._id} user={user} index={index} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Posts Section */}
                {filteredSortedPosts.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <FiFileText className="text-xl text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          Matching Posts ({filteredSortedPosts.length})
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {paginatedResults.map((post, index) => (
                        <motion.div
                          key={post._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            delay: index * 0.1,
                            ease: "easeOut",
                          }}
                          whileHover={{
                            scale: 1.03,
                            transition: { duration: 0.2 },
                          }}
                        >
                          <CardOfPost
                            id={post._id}
                            slug={post.slug || post._id}
                            title={post.title}
                            thumbnail={post.thumbnail || post.imageUrl}
                            createdAt={post.createdAt}
                            commentsCount={post.commentsCount}
                            viewsCount={post.viewsCount}
                            likesCount={post.likesCount}
                            author={post.author}
                            previewHTML={post.previewHTML || post.content}
                            category={post.category}
                            className="h-full"
                          />
                        </motion.div>
                      ))}
                    </div>

                    <Pagination />
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
