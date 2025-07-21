import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchUserSelectedCategories,
  fetchCategories,
} from "../store/categorySlice";
import toast from "react-hot-toast";

// CategoryBox.jsx
// Displays a dropdown of user-selected or default categories with loading and error states.
// Uses Redux for fetching categories and React Hot Toast for user notifications.
// Closes dropdown when clicking outside and supports light/dark themes.
// Error logging includes context for debugging and supports production logging (e.g., Sentry).
const CategoryBox = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const { userSelectedCategories, categories, status, error } = useSelector(
    (state) => state.categories || {}
  );
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchUserSelectedCategories()).catch((err) => {
        console.error("[CategoryBox] Fetch user categories failed:", {
          error: err.message || err,
          userId: user?._id,
          timestamp: new Date().toISOString(),
        });
        // Example: logToSentry("[CategoryBox] Fetch user categories failed", { error: err, userId: user?._id });
      });
    } else {
      dispatch(fetchCategories()).catch((err) => {
        console.error("[CategoryBox] Fetch categories failed:", {
          error: err.message || err,
          timestamp: new Date().toISOString(),
        });
        // Example: logToSentry("[CategoryBox] Fetch categories failed", { error: err });
      });
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (status === "failed") {
      toast.error("Unable to load categories. Please try again later.");
      if (process.env.NODE_ENV === "production" && error) {
        console.warn("[CategoryBox] Category loading failed:", {
          error: error.message || error,
          userId: user?._id || "unauthenticated",
          timestamp: new Date().toISOString(),
        });
      } else if (process.env.NODE_ENV === "production") {
        // Example: Send to a logging service
        // logToSentry("[CategoryBox] Category loading failed", {
        //   error: error.message || error,
        //   userId: user?._id || "unauthenticated",
        // });
      }
    }
  }, [status, error, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayedCategories = user?._id
    ? userSelectedCategories || []
    : (categories || []).slice(0, 5);

  return (
    <div className="relative bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow py-2 z-40">
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center"
        ref={dropdownRef}
      >
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex text-base sm:text-lg font-semibold items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          aria-expanded={open}
          aria-label="Toggle categories dropdown"
        >
          Categories{" "}
          <FaChevronDown
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 w-full bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark max-h-60 overflow-y-auto p-4 sm:p-6 shadow-lg z-50 border border-gray-200 dark:border-gray-800"
          >
            {status === "loading" && !displayedCategories.length ? (
              <p className="text-center text-text-main-light dark:text-text-main-dark opacity-80">
                Loading categories...
              </p>
            ) : status === "failed" ? (
              <p className="text-center text-red-500">
                Failed to load categories
              </p>
            ) : displayedCategories.length === 0 ? (
              <p className="text-center text-text-main-light dark:text-text-main-dark opacity-80">
                {user?._id
                  ? "No categories selected. Visit Category Management to add some!"
                  : "Please log in to view your categories."}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-15 gap-4 p-2 sm:p-4">
                {displayedCategories.map((category) => (
                  <Link
                    to={`/category/${category.slug}`}
                    key={category._id}
                    title={`Go to ${category.name} category`}
                    onClick={() => {
                      setOpen(false);
                      // console.log("[CategoryBox] Category clicked:", {
                      //   categoryId: category._id,
                      //   categoryName: category.name,
                      //   userId: user?._id || "unauthenticated",
                      //   timestamp: new Date().toISOString(),
                      // });
                      // Example: logToAnalytics("[CategoryBox] Category clicked", { categoryId: category._id, categoryName: category.name });
                    }}
                    className="flex items-center justify-center gap-1 rounded-full bg-gray-100 py-2 text-base font-medium text-text-main-light transition-colors hover:bg-blue-100 dark:bg-gray-800 dark:text-text-main-dark dark:hover:bg-blue-900"
                  >
                    {category.name}
                    {category.createdBy && (
                      <span
                        className="text-xs text-yellow-400"
                        aria-label="Featured category"
                        role="img"
                      >
                        ★
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {!user?._id && categories.length > 5 && (
              <p className="text-center text-text-main-light dark:text-text-main-dark opacity-80 text-sm mt-4">
                Log in to see all your selected categories!
              </p>
            )}

            {user?._id && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    navigate(`/author-profile/${user._id}?tab=categories`);
                    setOpen(false);
                    // console.log("[CategoryBox] Manage Categories clicked:", {
                    //   userId: user._id,
                    //   timestamp: new Date().toISOString(),
                    // });
                    // Example: logToAnalytics("[CategoryBox] Manage Categories clicked", { userId: user._id });
                  }}
                  className="inline-block px-4 py-1.5 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-medium rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition border border-gray-200 dark:border-gray-800"
                >
                  Manage Categories
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryBox;
