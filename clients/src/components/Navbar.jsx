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
import ThemeToggleButton from "../layout/ThemeToggleButton";
import { disconnectSocket, initializeSocket } from "../store/socketSlice";
import { useGeolocation } from "../AppRootFile/hook/useGeolocation";
import { trackGuestVisit } from "../store/guestSlice";

const countVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    () => userLocations.list.find((loc) => loc.userId === authUser?._id),
    [userLocations.list, authUser?._id]
  );

  const shouldHideCategory = useMemo(
    () =>
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
    [location.pathname]
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
      return () => {
        dispatch(disconnectSocket());
      };
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
        .then(() => {
          // console.log("✅ Guest visit tracked");
          sessionStorage.setItem("guestTracked", "1");
        })
        .catch((err) => console.warn("❌ Guest visit failed:", err));
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
    const timer = setTimeout(() => setMobileMenuOpen(false), 100);
    return () => clearTimeout(timer);
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
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="sticky top-0 z-50 bg-yellow-100 dark:bg-yellow-900/50 text-text-main-light dark:text-text-main-dark px-4 py-2 text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <span>
              Viewing as guest.{" "}
              <Link
                to="/login"
                className="underline font-medium hover:text-blue-600"
              >
                Log in
              </Link>{" "}
              for full features.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="sticky top-0 z-50 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex flex-col items-center">
              <div className="absolute -top-4 -right-3 text-lg text-end text-gray-600 dark:text-gray-300">
                {userLocation?.country?.slice(0, 3).toUpperCase()}
              </div>
              <Logo />
              {userLocation?.countryCode && (
                <img
                  src={`https://flagcdn.com/24x18/${userLocation.countryCode.toLowerCase()}.png`}
                  alt={userLocation.country}
                  className="absolute -top-4 -right-3 w-5 h-4 object-cover rounded-sm border border-gray-300 dark:border-gray-700 shadow-sm"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/users"
                className="text-lg font-medium flex items-center gap-2"
                aria-label="Online users"
              >
                <span className={`w-3 h-3 rounded-full ${statusClass}`} />
                <motion.span
                  key={onlineUsersCount}
                  variants={countVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="font-semibold"
                >
                  {onlineUsersCount || 0}
                </motion.span>
                <span className="hidden sm:inline">online</span>
              </Link>
            </div>
          </div>

          <div className="hidden md:flex w-full max-w-xs md:max-w-md mx-4">
            <SearchInput />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={toggleMobileSearch}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Search"
            >
              <FiSearch className="w-5 h-5" />
            </button>
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5"
                />
              </svg>
            </button>

            <ThemeToggleButton />

            {isAuthenticated && authUser?._id && (
              <Link
                to="/user"
                className="block md:hidden w-9 h-9 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-text-main-light dark:text-text-main-dark">
                    {userName[0]}
                  </div>
                )}
              </Link>
            )}

            {isAuthenticated && authUser?._id ? (
              <>
                <Link
                  to="/createPost"
                  className="hidden md:flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm"
                  aria-label="Write a post"
                >
                  <TfiWrite size={17} />
                  <span className="text-xl">Write</span>
                </Link>

                <NotificationDropdown />

                <div ref={dropdownRef} className="relative hidden md:block">
                  <button
                    onClick={toggleDropdown}
                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                    aria-label="User Menu"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName}
                        className="w-9 h-9 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-text-main-light dark:text-text-main-dark">
                        {userName[0]}
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
                        className="absolute right-0 mt-2 w-48 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-md shadow-lg py-2 z-50 border border-gray-200 dark:border-gray-800"
                      >
                        {userId && (
                          <Link
                            to={`/author-profile/${userId}`}
                            className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={toggleDropdown}
                          >
                            Studio
                          </Link>
                        )}
                        <Link
                          to="/user"
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={toggleDropdown}
                        >
                          Profile
                        </Link>
                        <Link
                          to="/user-setting"
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={toggleDropdown}
                        >
                          Settings
                        </Link>
                        <Link
                          to="/bookmark"
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={toggleDropdown}
                        >
                          Bookmarks
                        </Link>
                        <Link
                          to="/contact"
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={toggleDropdown}
                        >
                          Contact
                        </Link>
                        {role === "admin" && (
                          <Link
                            to="/admin"
                            className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={toggleDropdown}
                          >
                            Admin Panel
                          </Link>
                        )}
                        <Link
                          to="/about"
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={toggleDropdown}
                        >
                          About
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark px-4 py-4 space-y-2 shadow-xl border-t border-gray-200 dark:border-gray-800"
          >
            {isAuthenticated && authUser?._id ? (
              <>
                <Link
                  to="/createPost"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Write
                </Link>
                <Link
                  to="/user"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Profile
                </Link>
                <Link
                  to="/user-setting"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Settings
                </Link>
                <Link
                  to="/bookmark"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Bookmarks
                </Link>
                <Link
                  to="/contact"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Contact
                </Link>
                {role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={toggleMobileMenu}
                    className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={toggleMobileMenu}
                  className="block py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SearchModal isOpen={showMobileSearch} onClose={toggleMobileSearch} />

      {!shouldHideCategory && (
        <div className="sticky top-16 z-30 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
          <CategoryBox />
        </div>
      )}
    </>
  );
};

export default React.memo(Navbar);
