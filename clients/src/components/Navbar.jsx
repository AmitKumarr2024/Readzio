import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, matchPath } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import { TfiWrite } from "react-icons/tfi";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import Logo from "./Logo";
import CategoryBox from "./CategoryBox";
import SearchModal from "./SearchBar/SearchModal";
import SearchInput from "./SearchBar/SearchInput";
import NotificationDropdown from "./Notification/NotificationDropdown";
import { logout, checkAuth } from "../store/authSlice";
import { getUser, clearUser } from "../store/userSlice";
import { addNotification } from "../store/notificationSlice";
import { socketInstance } from "../store/socketSlice";
import ThemeToggleButton from "../layout/ThemeToggleButton";

const countVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { isAuthenticated, user: authUser, role } = useSelector((state) => state.auth || {});
  const { user: userData } = useSelector((state) => state.user || {});
  const { onlineUsersCount } = useSelector((state) => state.socket || {});

  const avatarUrl = userData?.data?.avatar || authUser?.avatar;
  const userName = authUser?.name || userData?.data?.name;
  const userId = authUser?._id || userData?.data?._id;

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(checkAuth());
    } else if (isAuthenticated && !userData?.data) {
      dispatch(getUser());
    }
  }, [dispatch, isAuthenticated, userData?.data]);

  useEffect(() => {
    if (!socketInstance || !isAuthenticated || !userId) return;

    const handleNewNotification = (data) => {
      if (data?.user?.toString() === userId.toString()) {
        dispatch(addNotification(data));
      }
    };

    socketInstance.on("newNotification", handleNewNotification);
    return () => {
      socketInstance?.off("newNotification", handleNewNotification);
    };
  }, [dispatch, userId, isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false); // close menu on route change
  }, [location.pathname]);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const toggleMobileSearch = () => setShowMobileSearch((prev) => !prev);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  const handleLogout = async () => {
    try {
      const result = await dispatch(logout());
      if (logout.fulfilled.match(result)) {
        dispatch(clearUser());
        setDropdownOpen(false);
        navigate("/login");
      } else {
        throw new Error(result.error?.message || "Logout failed");
      }
    } catch (err) {
      alert(`Logout failed: ${err.message}`);
    }
  };

  const hideCategoryRoutes = [
    "/user",
    "/user-setting",
    "/createPost",
    "/author-profile/:id",
    "/bookmark",
  ];
  const shouldHideCategory = hideCategoryRoutes.some((route) =>
    matchPath({ path: route, end: false }, location.pathname)
  );

  return (
    <>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-gradient-theme text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo + Online */}
          <div className="flex items-center gap-2">
            <Logo />
            <Link to="/users" className="text-sm font-medium flex items-center ml-10 gap-1">
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
                <motion.span
                  key={onlineUsersCount}
                  variants={countVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {onlineUsersCount}
                </motion.span>{" "}
                online
              </span>
            </Link>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex w-1/3 mx-4">
            <SearchInput />
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Mobile search + menu */}
            <button onClick={toggleMobileSearch} className="md:hidden p-2 rounded-full hover:bg-white/10" aria-label="Search">
              <FiSearch className="text-xl" />
            </button>
            <button onClick={toggleMobileMenu} className="md:hidden p-2 rounded-full hover:bg-white/10" aria-label="Toggle Menu">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5" />
              </svg>
            </button>

            <ThemeToggleButton />

            {isAuthenticated ? (
              <>
                {/* Write */}
                <Link
                  to="/createPost"
                  className="hidden md:flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm"
                >
                  <TfiWrite />
                  <span className="hidden sm:inline">Write</span>
                </Link>

                <NotificationDropdown />

                {/* Profile Dropdown */}
                <div ref={dropdownRef} className="relative hidden md:block">
                  <button onClick={toggleDropdown} aria-label="User menu" aria-haspopup="true" aria-expanded={dropdownOpen}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName || "User"}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white">
                        {userName?.[0] || "U"}
                      </div>
                    )}
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg py-2 z-50"
                      >
                        {userId && (
                          <Link to={`/author-profile/${userId}`} className="block px-4 py-2 hover:bg-gray-100" onClick={toggleDropdown}>
                            Your Studio
                          </Link>
                        )}
                        <Link to="/user" className="block px-4 py-2 hover:bg-gray-100" onClick={toggleDropdown}>
                          Profile
                        </Link>
                        <Link to="/user-setting" className="block px-4 py-2 hover:bg-gray-100" onClick={toggleDropdown}>
                          Settings
                        </Link>
                        <Link to="/bookmark" className="block px-4 py-2 hover:bg-gray-100" onClick={toggleDropdown}>
                          Bookmarks
                        </Link>
                        <Link to="/contact" className="block px-4 py-2 hover:bg-gray-100" onClick={toggleDropdown}>
                          Contact
                        </Link>
                        {role === "admin" && (
                          <Link to="/admin" className="block px-4 py-2 hover:bg-gray-100" onClick={toggleDropdown}>
                            Admin Panel
                          </Link>
                        )}
                        <button onClick={handleLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm">
                  Login
                </Link>
                <Link to="/signup" className="bg-white text-gray-800 px-3 py-1.5 rounded-md text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-blue-700 text-white px-4 py-4 space-y-2 shadow-xl"
          >
            {isAuthenticated ? (
              <>
                <Link to="/createPost" className="block py-2" onClick={toggleMobileMenu}>Write</Link>
                <Link to="/user" className="block py-2" onClick={toggleMobileMenu}>Profile</Link>
                <Link to="/user-setting" className="block py-2" onClick={toggleMobileMenu}>Settings</Link>
                <Link to="/bookmark" className="block py-2" onClick={toggleMobileMenu}>Bookmarks</Link>
                <Link to="/contact" className="block py-2" onClick={toggleMobileMenu}>Contact</Link>
                {role === "admin" && (
                  <Link to="/admin" className="block py-2" onClick={toggleMobileMenu}>Admin Panel</Link>
                )}
                <button onClick={handleLogout} className="block w-full text-left py-2">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2" onClick={toggleMobileMenu}>Login</Link>
                <Link to="/signup" className="block py-2" onClick={toggleMobileMenu}>Sign Up</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <SearchModal isOpen={showMobileSearch} onClose={toggleMobileSearch} />

      {/* Category Section */}
      {!shouldHideCategory && (
        <div className="sticky top-16 z-30 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CategoryBox />
        </div>
      )}
    </>
  );
}
