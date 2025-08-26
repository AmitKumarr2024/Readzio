import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FaChevronDown, FaSpinner, FaStar } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchUserSelectedCategories,
  fetchCategories,
} from "../store/categorySlice";
import { toast } from "react-hot-toast";

const CategoryBox = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const { userSelectedCategories, categories, status, error } = useSelector(
    (state) => state.categories || {}
  );
  const [open, setOpen] = useState(false);
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);
  const dropdownRef = useRef(null);
  const prevUserIdRef = useRef(null);

  // Memoized dispatch functions to prevent infinite loops
  const fetchUserCategories = useCallback(() => {
    if (user?._id && user._id !== prevUserIdRef.current) {
      prevUserIdRef.current = user._id;
      setHasLoadedCategories(false);
      dispatch(fetchUserSelectedCategories())
        .catch((err) => {
          console.error("[CategoryBox] Fetch user categories failed:", {
            error: err.message || err,
            userId: user?._id,
            timestamp: new Date().toISOString(),
          });
        })
        .finally(() => {
          setHasLoadedCategories(true);
        });
    }
  }, [dispatch, user?._id]);

  const fetchAllCategories = useCallback(() => {
    if (!user?._id && !hasLoadedCategories) {
      setHasLoadedCategories(false);
      dispatch(fetchCategories())
        .catch((err) => {
          console.error("[CategoryBox] Fetch categories failed:", {
            error: err.message || err,
            timestamp: new Date().toISOString(),
          });
        })
        .finally(() => {
          setHasLoadedCategories(true);
        });
    }
  }, [dispatch, user?._id, hasLoadedCategories]);

  // Load categories only when needed
  useEffect(() => {
    if (user?._id) {
      fetchUserCategories();
    } else {
      fetchAllCategories();
    }
  }, [user?._id, fetchUserCategories, fetchAllCategories]);

  // Handle error states
  useEffect(() => {
    if (status === "failed" && hasLoadedCategories) {
      toast.error("Unable to load categories. Please try again later.");
      if (process.env.NODE_ENV === "development" && error) {
        console.warn("[CategoryBox] Category loading failed:", {
          error: error.message || error,
          userId: user?._id || "unauthenticated",
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [status, error, user, hasLoadedCategories]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Get displayed categories with proper fallbacks
  const displayedCategories = user?._id
    ? userSelectedCategories || []
    : (categories || []).slice(0, 5);

  const isLoading = status === "loading" && !hasLoadedCategories;
  const hasError = status === "failed";
  const isEmpty = displayedCategories.length === 0;

  return (
    <div className="relative bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            aria-expanded={open}
            aria-label="Toggle categories dropdown"
            disabled={isLoading}
          >
            {isLoading ? (
              <FaSpinner className="animate-spin w-4 h-4" />
            ) : (
              <>
                Categories
                <FaChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="max-w-7xl mx-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Loading categories...
                  </span>
                </div>
              ) : hasError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 dark:text-red-400 mb-4">
                    Failed to load categories
                  </p>
                  <button
                    onClick={() => {
                      setHasLoadedCategories(false);
                      if (user?._id) {
                        fetchUserCategories();
                      } else {
                        fetchAllCategories();
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                </div>
              ) : isEmpty ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {user?._id
                      ? "No categories selected yet"
                      : "Please log in to view your categories"}
                  </p>
                  {user?._id && (
                    <button
                      onClick={() => {
                        navigate(`/author-profile/${user._id}?tab=categories`);
                        setOpen(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Select Categories
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {displayedCategories.map((category) => (
                      <Link
                        to={`/category/${category.slug}`}
                        key={category._id}
                        title={`Browse ${category.name} articles`}
                        onClick={() => setOpen(false)}
                        className="group flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate">
                          {category.name}
                        </span>
                        {category.createdBy && (
                          <FaStar
                            className="w-3 h-3 text-yellow-500 flex-shrink-0 ml-2"
                            title="Featured category"
                          />
                        )}
                      </Link>
                    ))}
                  </div>

                  {!user?._id && categories.length > 5 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Sign in to see all categories and manage your
                        preferences
                      </p>
                    </div>
                  )}

                  {user?._id && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                      <button
                        onClick={() => {
                          navigate(
                            `/author-profile/${user._id}?tab=categories`
                          );
                          setOpen(false);
                        }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Manage Categories
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryBox;
