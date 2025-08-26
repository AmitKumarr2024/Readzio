import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FiBell, FiSettings, FiCheck, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markAsRead,
  selectNotifications,
  selectUnreadCount,
} from "../../store/notificationSlice.js";
import { selectSocketState } from "../../store/socketSlice.js";
import { formatDistanceToNow } from "date-fns";

// Enhanced Framer Motion animation variants
const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

const badgeVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const notificationItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.15 },
  },
};

// Utility to get initials from sender name (fallback avatar)
const getInitials = (name = "") => {
  const [first = "", last = ""] = name.trim().split(" ");
  return (first[0] || "") + (last[0] || "");
};

// Notification type to icon mapping
const getNotificationIcon = (type) => {
  const icons = {
    like: "❤️",
    comment: "💬",
    reply: "↩️",
    bookmark: "🔖",
    admin: "⚡",
    admin_reply: "👨‍💼",
    follow: "👤",
    mention: "📢",
  };
  return icons[type] || "🔔";
};

// Notification type to color mapping
const getNotificationColor = (type) => {
  const colors = {
    like: "from-red-500 to-pink-500",
    comment: "from-blue-500 to-cyan-500",
    reply: "from-green-500 to-emerald-500",
    bookmark: "from-yellow-500 to-orange-500",
    admin: "from-purple-500 to-indigo-500",
    admin_reply: "from-purple-500 to-indigo-500",
    follow: "from-gray-500 to-slate-500",
    mention: "from-pink-500 to-rose-500",
  };
  return colors[type] || "from-blue-500 to-indigo-500";
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [hoveredNotification, setHoveredNotification] = useState(null);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();

  // Redux selectors with better error handling
  const notifications = useSelector(selectNotifications) || [];
  const unreadCount = useSelector(selectUnreadCount) || 0;
  const { error, loading } = useSelector((state) => state.notifications || {});
  const { isConnected, error: socketError } =
    useSelector(selectSocketState) || {};

  // Fetch notifications and count on mount
  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [open]);

  const toggleDropdown = () => setOpen((prev) => !prev);
  const handleMarkAllRead = () => dispatch(markAllAsRead());

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const hasUnread = safeNotifications.some((n) => !n.read);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Enhanced Notification Bell Button */}
      <motion.button
        onClick={toggleDropdown}
        className={`
          relative flex items-center justify-center p-3 
          bg-white/80 dark:bg-gray-800/80 
          backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50
          text-gray-700 dark:text-gray-200 
          rounded-2xl shadow-sm hover:shadow-md
          hover:bg-white dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
          transition-all duration-200 ease-out
          ${open ? "scale-95 shadow-inner" : "hover:scale-105"}
        `}
        whileHover={{ scale: open ? 0.95 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <FiBell
            className={`w-5 h-5 ${unreadCount > 0 ? "text-blue-600" : ""}`}
          />
        </motion.div>

        {/* Enhanced notification badge */}
        <AnimatePresence mode="wait">
          {unreadCount > 0 && (
            <motion.div
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute -top-1 -right-1"
            >
              <div
                className={`
                bg-gradient-to-r from-red-500 to-pink-500
                text-white text-xs font-bold rounded-full 
                min-w-[20px] h-5 px-1.5 flex items-center justify-center
                shadow-lg ring-2 ring-white dark:ring-gray-800
              `}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Enhanced Notification Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              absolute right-0 mt-2 w-96 
              bg-white/95 dark:bg-gray-900/95 
              backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50
              rounded-3xl shadow-2xl ring-1 ring-black/5
              z-50 overflow-hidden
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                  <FiBell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : "All caught up!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/message-box"
                  onClick={() => setOpen(false)}
                  className={`
                    p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl
                    transition-colors duration-200
                  `}
                  title="Settings"
                >
                  <FiSettings className="w-4 h-4" />
                </Link>

                {hasUnread && (
                  <motion.button
                    onClick={handleMarkAllRead}
                    className={`
                      p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                      hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl
                      transition-colors duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    disabled={loading}
                    title="Mark all as read"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiCheck className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Notifications Container */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {/* Connection Status */}
              {socketError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <FiX className="w-4 h-4" />
                    Connection issue: {socketError}
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <FiX className="w-4 h-4" />
                    Error: {error}
                  </div>
                </motion.div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="p-6 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Loading notifications...
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!loading && safeNotifications.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 text-center"
                >
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiBell className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No notifications yet
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You're all caught up! New notifications will appear here.
                  </p>
                </motion.div>
              )}

              {/* Notification Items */}
              {!loading &&
                safeNotifications.map((notification, index) => (
                  <motion.div
                    key={notification._id}
                    variants={notificationItemVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    transition={{ delay: index * 0.02 }}
                    onHoverStart={() =>
                      setHoveredNotification(notification._id)
                    }
                    onHoverEnd={() => setHoveredNotification(null)}
                  >
                    <Link
                      to={
                        notification.navigateTo ||
                        `/message-box?type=${
                          notification.type === "admin" ||
                          notification.type === "admin_reply"
                            ? "admin"
                            : "post"
                        }&id=${notification._id}`
                      }
                      className={`
                      block p-4 mx-4 my-2 rounded-2xl transition-all duration-200
                      ${
                        notification.read
                          ? "bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                          : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30"
                      }
                      ${
                        hoveredNotification === notification._id
                          ? "shadow-lg ring-1 ring-blue-500/20"
                          : "shadow-sm"
                      }
                    `}
                      onClick={() => {
                        setOpen(false);
                        if (!notification.read)
                          dispatch(markAsRead(notification._id));
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Enhanced Avatar */}
                        <div className="relative flex-shrink-0">
                          {notification.sender?.avatar ? (
                            <img
                              src={notification.sender.avatar}
                              alt="Avatar"
                              className="w-12 h-12 rounded-2xl border-2 border-white dark:border-gray-800 shadow-sm"
                            />
                          ) : (
                            <div
                              className={`
                            w-12 h-12 bg-gradient-to-br ${getNotificationColor(
                              notification.type
                            )}
                            text-white rounded-2xl flex items-center justify-center font-bold text-sm
                            shadow-sm border-2 border-white dark:border-gray-800
                          `}
                            >
                              {getInitials(notification.sender?.name || "U")}
                            </div>
                          )}

                          {/* Type indicator */}
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-xs border-2 border-white dark:border-gray-800">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                              {notification.type === "admin" ||
                              notification.type === "admin_reply" ? (
                                <span>
                                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                                    Admin
                                  </span>
                                  {notification.content &&
                                    `: ${notification.content}`}
                                </span>
                              ) : (
                                <span>
                                  <span className="font-semibold">
                                    {notification.sender?.name || "User"}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 mx-1">
                                    {notification.type === "like"
                                      ? "liked"
                                      : notification.type === "bookmark"
                                      ? "bookmarked"
                                      : notification.type === "comment"
                                      ? "commented on"
                                      : notification.type === "reply"
                                      ? "replied to"
                                      : notification.type}
                                  </span>
                                  your post
                                  {notification.post?.title && (
                                    <span className="font-medium">
                                      {" "}
                                      "{notification.post.title}"
                                    </span>
                                  )}
                                  {notification.content && (
                                    <span className="text-gray-600 dark:text-gray-400">
                                      : {notification.content}
                                    </span>
                                  )}
                                </span>
                              )}
                            </p>

                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            {notification.createdAt
                              ? formatDistanceToNow(
                                  new Date(notification.createdAt),
                                  { addSuffix: true }
                                )
                              : "Unknown time"}
                            {!isConnected && (
                              <span className="inline-flex items-center gap-1 text-orange-500">
                                <span className="w-1 h-1 bg-orange-500 rounded-full" />
                                Offline
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
            </div>

            {/* Footer */}
            {safeNotifications.length > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <Link
                  to="/message-box"
                  onClick={() => setOpen(false)}
                  className={`
                    block w-full p-3 text-center text-sm font-medium
                    text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl
                    transition-colors duration-200
                  `}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
