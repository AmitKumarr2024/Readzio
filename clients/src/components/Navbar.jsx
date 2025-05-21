import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CategoryBox from "./CategoryBox";

const Navbar = () => {
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0); // useRef instead of state

  // External function
  const handleScroll = () => {
    const currentY = window.scrollY;

    if (currentY > lastScrollY.current && currentY > 50) {
      setShowNavbar(false);
    } else if (currentY < lastScrollY.current) {
      setShowNavbar(true);
    }

    lastScrollY.current = currentY;
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // No dependencies needed

  return (
    <nav
      className={`bg-slate-800 text-white w-full h-16 shadow-md fixed top-0 left-0 z-50 transition-transform duration-300 ${
        showNavbar ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="text-xl font-semibold">
          <Link to="/">MyyBlog</Link>
        </div>

        <div className="w-1/2 hidden md:flex">
          <input
            type="text"
            placeholder="Search articles or blogs..."
            className="w-full px-4 py-1 rounded-md text-slate-700 bg-amber-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-gray-600 rounded-full h-8 w-8 flex items-center justify-center text-sm">
            U
          </div>
        </div>
      </div>
        <CategoryBox />
    </nav>
  );
};

export default Navbar;
