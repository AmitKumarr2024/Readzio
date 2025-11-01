import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { checkAuth, logout } from "../store/authSlice";
import { clearUser, getUser, trackUserIPLocation } from "../store/userSlice";
import { fetchUserpostlists } from "../store/postlistSlice";
import ThemeToggleButton from "../layout/ThemeToggleButton";
import { disconnectSocket, initializeSocket } from "../store/socketSlice";
import { trackGuestVisit } from "../store/guestSlice";

const countVariants = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -10,
    transition: { duration: 0.2 },
  },
};

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

const mobileMenuVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.3 },
  },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
};

const menuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const postlistsCount = useSelector(
    (state) => state.postlist?.postlists?.length || 0
  );
  const {
    isAuthenticated,
    user: authUser,
    role,
    authInitialized,
    authLoading,
    sessionExpired,
  } = useSelector((state) => state.auth ?? {});
  const { onlineUsersCount, status } = useSelector(
    (state) => state.socket ?? {}
  );
  const { user, userLocations } = useSelector((state) => state.user ?? {});

  const avatarUrl = useMemo(() => user?.avatar, [user?.avatar]);
  const userName = useMemo(() => authUser?.name || "User", [authUser?.name]);
  const userId = useMemo(() => authUser?._id, [authUser?._id]);

  const userLocation = useMemo(
    () => userLocations?.list?.find((loc) => loc.userId === authUser?._id),
    [userLocations?.list, authUser?._id]
  );

  const shouldHideCategory = useMemo(
    () =>
      !isAuthenticated ||
      [
        "/user",
        "/user-setting",
        "/createPost",
        "/author-profile/:id",
        "/bookmark",
        "/admin",
      ].some((route) =>
        matchPath({ path: route, end: false }, location.pathname)
      ),
    [location.pathname, isAuthenticated]
  );

  const statusClass = useMemo(
    () =>
      onlineUsersCount >= 1 ? "animate-pulse bg-green-500" : "bg-gray-500",
    [onlineUsersCount]
  );

  useEffect(() => {
    if (!authInitialized && !authLoading) {
      dispatch(checkAuth()).catch((err) =>
        console.error("Auth check failed:", err)
      );
      dispatch(getUser()).catch((err) =>
        console.error("Get user failed:", err)
      );
      dispatch(trackUserIPLocation()).catch((err) =>
        console.warn("IP location tracking failed:", err)
      );
    }
  }, [authInitialized, authLoading, dispatch]);

  useEffect(() => {
    if (isAuthenticated && authUser?._id) {
      dispatch(initializeSocket()).catch((err) =>
        console.error("Socket init failed:", err)
      );
      dispatch(fetchUserpostlists(authUser._id)).catch((err) =>
        console.error("Fetch postlists failed:", err)
      );
      return () => dispatch(disconnectSocket());
    }
  }, [isAuthenticated, authUser?._id, dispatch]);

  useEffect(() => {
    if (
      !isAuthenticated &&
      authInitialized &&
      !sessionStorage.getItem("guestTracked")
    ) {
      dispatch(trackGuestVisit())
        .unwrap()
        .then(() => sessionStorage.setItem("guestTracked", "1"))
        .catch((err) => console.warn("Guest visit failed:", err));
    }
  }, [isAuthenticated, authInitialized, dispatch]);

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
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const toggleMobileSearch = () => setShowMobileSearch((prev) => !prev);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch(clearUser());
      setDropdownOpen(false);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="sticky top-0 z-50 bg-background-light dark:bg-background-dark h-16 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {sessionExpired && (
          <motion.div
            key="session-expired-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-50 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 text-text-main-light dark:text-text-main-dark px-4 py-3 text-sm flex items-center justify-center gap-2 shadow-lg backdrop-blur-sm"
          >
            <span className="font-medium">
              Viewing as guest.{" "}
              <Link
                to="/login"
                className="underline font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Log in
              </Link>{" "}
              for full features.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md text-text-main-light dark:text-text-main-dark shadow-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo with Country Flag */}
            <div className="relative flex flex-col items-center">
              {/* Country Name - Positioned Above Logo */}
              <div className="absolute -top-4 -right-3 text-sm text-gray-600 dark:text-gray-300">
                {userLocation?.country && userLocation.country !== "Unknown"
                  ? userLocation.country.toUpperCase()
                  : " "}
              </div>

              <Logo />

              {/* Country Flag - Positioned at Bottom Right of Logo */}
              {userLocation?.countryCode && (
                <motion.img
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.1,
                  }}
                  src={`https://flagcdn.com/24x18/${userLocation.countryCode.toLowerCase()}.png`}
                  alt={userLocation.country}
                  className="absolute -bottom-1 -right-2 w-5 h-4 object-cover rounded-sm shadow-lg border-2 border-white dark:border-gray-800"
                />
              )}
            </div>

            {/* Online Users Count */}
            <Link to="/users" className="group" aria-label="Online users">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors"
              >
                <motion.span
                  className={`w-2 h-2 rounded-full ${statusClass} shadow-lg`}
                  animate={
                    onlineUsersCount >= 1
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(34, 197, 94, 0.7)",
                            "0 0 0 8px rgba(34, 197, 94, 0)",
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={onlineUsersCount}
                    variants={countVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="font-bold text-sm sm:text-base bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent"
                  >
                    {onlineUsersCount || 0}
                  </motion.span>
                </AnimatePresence>
                <span className="hidden sm:inline text-xs font-medium text-gray-600 dark:text-gray-400">
                  online
                </span>
              </motion.div>
            </Link>
          </div>

          {/* Center - Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchInput />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMobileSearch}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Search"
            >
              <FiSearch className="w-5 h-5" />
            </motion.button>

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    mobileMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                  animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
            </motion.button>

            {/* Theme Toggle */}
            <ThemeToggleButton />

            {/* Mobile Avatar (shown only on mobile when authenticated) */}
            {isAuthenticated && authUser?._id && (
              <Link to="/user" className="block md:hidden">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-700 shadow-md"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-base font-bold">
                      {userName[0]}
                    </div>
                  )}
                </motion.div>
              </Link>
            )}

            {/* Write Button with Original Animated Border */}
            <div className="relative rounded-full border-4 border-transparent [background:linear-gradient(45deg,#172033,#1e293b_50%,#172033)_padding-box,conic-gradient(from_var(--border-angle),#ff0000,#ff9900,#33cc33,#3399ff,#cc33cc,#ff0000)_border-box] animate-border hidden md:inline-block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isAuthenticated && authUser?._id) {
                    navigate("/createPost");
                  } else {
                    navigate("/login");
                  }
                }}
                className="px-4 py-2 text-sm font-medium flex items-center gap-2 bg-slate-800 rounded-full text-white"
              >
                <TfiWrite size={16} />
                <span>Write</span>
              </motion.button>
            </div>

            {isAuthenticated && authUser?._id ? (
              <>
                <NotificationDropdown />

                {/* Desktop User Menu */}
                <div ref={dropdownRef} className="relative hidden md:block">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleDropdown}
                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                    aria-label="User Menu"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName}
                        className="w-9 h-9 rounded-full object-cover shadow-lg border-2 border-gray-300 dark:border-gray-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {userName[0]}
                      </div>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="absolute right-0 mt-3 w-56 bg-background-light dark:bg-background-dark rounded-xl shadow-2xl py-2 z-50 border border-gray-200 dark:border-gray-800 overflow-hidden"
                      >
                        {userId && (
                          <motion.div whileHover={{ x: 4 }} className="px-2">
                            <Link
                              to={`/author-profile/${userId}`}
                              className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all"
                              onClick={toggleDropdown}
                            >
                              <span className="font-medium">Studio</span>
                            </Link>
                          </motion.div>
                        )}
                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/user"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">Profile</span>
                          </Link>
                        </motion.div>

                        {role === "admin" && (
                          <motion.div whileHover={{ x: 4 }} className="px-2">
                            <Link
                              to="/admin"
                              className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all"
                              onClick={toggleDropdown}
                            >
                              <span className="font-medium">Admin Panel</span>
                            </Link>
                          </motion.div>
                        )}

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/profile/postlists"
                            className="flex items-center justify-between px-3 py-2.5 text-sm rounded-lg hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">postlists</span>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={postlistsCount}
                                variants={countVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold"
                              >
                                {postlistsCount}
                              </motion.span>
                            </AnimatePresence>
                          </Link>
                        </motion.div>

                        <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/user-setting"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">Settings</span>
                          </Link>
                        </motion.div>

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/bookmark"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">Bookmarks</span>
                          </Link>
                        </motion.div>

                        <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/contact"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">Contact Us</span>
                          </Link>
                        </motion.div>

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/about"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">About Us</span>
                          </Link>
                        </motion.div>

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/terms-conditions"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">
                              Terms & Conditions
                            </span>
                          </Link>
                        </motion.div>

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <Link
                            to="/privacy"
                            className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            onClick={toggleDropdown}
                          >
                            <span className="font-medium">Privacy Policy</span>
                          </Link>
                        </motion.div>

                        <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                        <motion.div whileHover={{ x: 4 }} className="px-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-3 py-2.5 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-all"
                          >
                            Logout
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden md:flex gap-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    Login
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/signup"
                    className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark px-4 py-2 rounded-lg text-sm font-semibold border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="md:hidden bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md shadow-2xl border-b border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {/* Mobile Write Button */}
              <motion.div variants={menuItemVariants} className="mb-3">
                <div className="relative rounded-full border-4 border-transparent [background:linear-gradient(45deg,#172033,#1e293b_50%,#172033)_padding-box,conic-gradient(from_var(--border-angle),#ff0000,#ff9900,#33cc33,#3399ff,#cc33cc,#ff0000)_border-box] animate-border">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (isAuthenticated && authUser?._id) {
                        navigate("/createPost");
                      } else {
                        navigate("/login");
                      }
                      toggleMobileMenu();
                    }}
                    className="w-full px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 bg-slate-800 rounded-full text-white"
                  >
                    <TfiWrite size={16} />
                    <span>Write</span>
                  </motion.button>
                </div>
              </motion.div>

              {isAuthenticated && authUser?._id ? (
                <>
                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/user"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all"
                    >
                      Profile
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/profile/postlists"
                      onClick={toggleMobileMenu}
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all"
                    >
                      <span>postlists</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={postlistsCount}
                          variants={countVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold"
                        >
                          {postlistsCount}
                        </motion.span>
                      </AnimatePresence>
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/user-setting"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      Settings
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/bookmark"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      Bookmarks
                    </Link>
                  </motion.div>

                  {role === "admin" && (
                    <motion.div variants={menuItemVariants}>
                      <Link
                        to="/admin"
                        onClick={toggleMobileMenu}
                        className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all"
                      >
                        Admin Panel
                      </Link>
                    </motion.div>
                  )}

                  <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/contact"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      Contact Us
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/about"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      About Us
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/terms-conditions"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      Terms & Conditions
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/privacy"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      Privacy Policy
                    </Link>
                  </motion.div>

                  <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                  <motion.div variants={menuItemVariants}>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all"
                    >
                      Logout
                    </button>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/login"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center shadow-md"
                    >
                      Login
                    </Link>
                  </motion.div>

                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/signup"
                      onClick={toggleMobileMenu}
                      className="block px-4 py-3 text-sm font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-700 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-all"
                    >
                      Sign Up
                    </Link>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchModal isOpen={showMobileSearch} onClose={toggleMobileSearch} />

      {!shouldHideCategory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="sticky top-16 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-800/50"
        >
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <CategoryBox />
          </div>
        </motion.div>
      )}
    </>
  );
};

export default React.memo(Navbar);
