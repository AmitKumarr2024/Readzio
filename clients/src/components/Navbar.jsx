import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TfiWrite } from "react-icons/tfi";
import { FiSearch } from "react-icons/fi";
import Logo from "./Logo";
import CategoryBox from "./CategoryBox";
import SearchModal from "./SearchBar/SearchModal";
import SearchInput from "./SearchBar/SearchInput";

const isLoggedIn = true;

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const toggleMobileSearch = () => setShowMobileSearch((prev) => !prev);

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    console.log("Logging out...");
    navigate("/login");
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hideCategoryRoutes = ["/profile", "/setting", "/createPost"];

  return (
    <>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />

          {/* Desktop Search */}
          <div className="hidden md:flex w-1/2 mx-4">
            <SearchInput />
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={toggleMobileSearch} className="md:hidden text-xl">
              <FiSearch />
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  to="/createPost"
                  className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-3 sm:px-6 py-1.5 rounded-md text-sm sm:text-base transition-all"
                >
                  <TfiWrite />
                  <span className="hidden sm:inline">Write</span>
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <div
                    onClick={toggleDropdown}
                    className="bg-gray-600 hover:ring-2 hover:ring-white rounded-full h-10 w-10 flex items-center justify-center text-lg cursor-pointer"
                  >
                    A
                  </div>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded-md shadow-lg py-2 z-50">
                      <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</Link>
                      <Link to="/setting" className="block px-4 py-2 hover:bg-gray-100">Settings</Link>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm sm:text-base"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 rounded-md text-sm sm:text-base"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-white text-slate-800 px-3 sm:px-4 py-1.5 rounded-md text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Search Modal */}
      <SearchModal isOpen={showMobileSearch} onClose={() => setShowMobileSearch(false)} />

      {/* Sticky Category Bar */}
      {!hideCategoryRoutes.includes(location.pathname) && (
        <div className="sticky z-30 bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-white top-16">
          <CategoryBox />
        </div>
      )}
    </>
  );
};

export default Navbar;
