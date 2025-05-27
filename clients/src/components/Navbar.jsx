import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TfiWrite } from "react-icons/tfi";
import { FiSearch } from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";

import Logo from "./Logo";
import CategoryBox from "./CategoryBox";
import SearchModal from "./SearchBar/SearchModal";
import SearchInput from "./SearchBar/SearchInput";

import { logout } from "../store/authSlice";
import { getUser, clearUser } from "../store/userSlice";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const { token, isAuthenticated } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.user);

  const avatarUrl = user?.data?.avatar;
  const userName = user?.data?.name;

  useEffect(() => {
    if (isAuthenticated && token && !user) {
      dispatch(getUser());
    }

    // One-time reload after login
    if (isAuthenticated && !sessionStorage.getItem("reloadedAfterLogin")) {
      sessionStorage.setItem("reloadedAfterLogin", "true");
      window.location.reload();
    }
  }, [dispatch, isAuthenticated, token, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const toggleMobileSearch = () => setShowMobileSearch((prev) => !prev);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch(clearUser());
      sessionStorage.removeItem("reloadedAfterLogin"); // reset reload flag
      setDropdownOpen(false);
      navigate("/");
    } catch (err) {
      alert("Logout failed: " + (err.message || err));
    }
  };

  const hideCategoryRoutes = ["/profile", "/setting", "/createPost"];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />

          {/* Desktop Search */}
          <div className="hidden md:flex w-1/2 mx-4">
            <SearchInput />
          </div>

          {/* Right Side Buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Search Button */}
            <button onClick={toggleMobileSearch} className="md:hidden text-xl">
              <FiSearch />
            </button>

            {/* Authenticated */}
            {isAuthenticated ? (
              <>
                {/* Write Button */}
                <Link
                  to="/createPost"
                  className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-3 sm:px-6 py-1.5 rounded-md text-sm sm:text-base transition-all mr-14"
                >
                  <TfiWrite />
                  <span className="hidden sm:inline">Write</span>
                </Link>

                {/* Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div
                    className="cursor-pointer"
                    onClick={toggleDropdown}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleDropdown();
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName || "User"}
                        className="w-14 rounded-full object-cover border-2"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <div className="bg-gray-600 rounded-full h-10 w-10 flex items-center justify-center text-lg text-white uppercase">
                        {userName?.[0] || "U"}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 w-40 bg-white text-black rounded-md shadow-lg py-2 z-50 transition-opacity duration-300">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 hover:bg-gray-100"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/setting"
                        className="block px-4 py-2 hover:bg-gray-100"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm sm:text-base"
                >
                  Logout
                </button>
              </>
            ) : (
              // Unauthenticated Links
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
      <SearchModal isOpen={showMobileSearch} onClose={toggleMobileSearch} />

      {/* Categories Bar */}
      {!hideCategoryRoutes.includes(location.pathname) && (
        <div className="sticky z-30 bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-white top-16">
          <CategoryBox />
        </div>
      )}
    </>
  );
};

export default Navbar;
