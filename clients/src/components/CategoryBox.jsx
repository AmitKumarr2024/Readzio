import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchUserSelectedCategories()).catch((err) => {
        console.error("[CategoryBox] Fetch user categories failed:", {
          error: err.message || err,
          userId: user?._id,
          timestamp: new Date().toISOString(),
        });
      });
    } else {
      dispatch(fetchCategories()).catch((err) => {
        console.error("[CategoryBox] Fetch categories failed:", {
          error: err.message || err,
          timestamp: new Date().toISOString(),
        });
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-3 sm:p-5 max-w-7xl mx-auto">
                {displayedCategories.map((category) => (
                  <Link
                    to={`/category/${category.slug}`}
                    key={category._id}
                    title={`Go to ${category.name} category`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-full transition-colors hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-blue-800 dark:hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <span className="truncate">{category.name}</span>
                    {category.createdBy && (
                      <span
                        className="text-xs text-yellow-400 flex-shrink-0"
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
