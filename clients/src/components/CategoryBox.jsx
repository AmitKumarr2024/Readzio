import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { categories as defaultCategories } from "../Utils/categories";

const CategoryBox = () => {
  const [categoryList, setCategoryList] = useState(defaultCategories);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("customCategories"));
    if (stored) setCategoryList([...defaultCategories, ...stored]);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-white shadow py-1 z-40">
      <div className="max-w-7xl mx-auto px-4 flex justify-center" ref={dropdownRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex text-lg font-semibold items-center gap-2 px-4 py-2 hover:bg-white/10 transition"
        >
          Categories <FaChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 w-full bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-white max-h-60 overflow-y-auto p-4"
          >
            <div className="flex flex-wrap gap-3 justify-center">
              {categoryList.map((category) => (
                <Link
                  to={`/category_page/${category}`}
                  key={category}
                  title={`Go to ${category} category`}
                  className="px-3 py-1 text-sm bg-primary text-white rounded-full hover:bg-primary-hover transition"
                  onClick={() => setOpen(false)}
                >
                  {category}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryBox;
