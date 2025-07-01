// src/components/CategoryBox.js
import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FaChevronDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchUserSelectedCategories, fetchCategories } from '../store/categorySlice';
import toast from 'react-hot-toast';

const CategoryBox = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { userSelectedCategories, categories, status, error } = useSelector(
    (state) => state.categories
  );
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchUserSelectedCategories());
    } else {
      dispatch(fetchCategories());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayedCategories = user?._id
    ? userSelectedCategories
    : categories.slice(0, 5);

  return (
    <div className="relative bg-gradient-theme text-white shadow py-1 z-40">
      <div className="max-w-7xl mx-auto px-4 flex justify-center" ref={dropdownRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex text-lg font-semibold items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition"
          aria-expanded={open}
          aria-label="Toggle categories dropdown"
        >
          Categories <FaChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 w-full bg-gradient-theme text-white max-h-60 overflow-y-auto p-4 shadow-lg z-50"
          >
            {status === 'loading' && !displayedCategories.length ? (
              <p className="text-center text-white/80">Loading categories...</p>
            ) : status === 'failed' ? (
              <p className="text-center text-red-300">Failed to load categories</p>
            ) : displayedCategories.length === 0 ? (
              <p className="text-center text-white/80">
                {user?._id ? 'No categories selected. Visit Category Management to add some!' : 'Please log in to view your categories.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 justify-center">
                {displayedCategories.map((category) => (
                  <Link
                    to={`/category_page/${category.slug}`}
                    key={category._id}
                    title={`Go to ${category.name} category`}
                    className="px-3 py-1 text-sm bg-white/20 text-white rounded-full hover:bg-white/30 transition flex items-center gap-1"
                    onClick={() => setOpen(false)}
                  >
                    {category.name}
                    {category.createdBy && (
                      <span className="text-xs text-yellow-400">★</span>
                    )}
                  </Link>
                ))}

                {!user?._id && categories.length > 5 && (
                  <p className="text-center text-white/80 text-sm mt-2 w-full">
                    Log in to see all your selected categories!
                  </p>
                )}
              </div>
            )}

            {user?._id && (
              <div className="mt-4 text-center w-full">
                <button
                  onClick={() => {
                    navigate(`/author-profile/${user._id}?tab=categories`);
                    setOpen(false);
                  }}
                  className="inline-block px-4 py-1.5 bg-white text-indigo-600 font-medium rounded-full hover:bg-gray-100 transition"
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