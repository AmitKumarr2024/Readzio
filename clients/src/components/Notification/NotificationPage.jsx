import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTrash,
  FaHeart,
  FaComment,
  FaUser,
  FaBookmark,
  FaReply,
  FaShieldAlt,
  FaEye,
  FaCheck,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  replyToAdminNotification,
  deleteNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationPage,
  selectNotificationTotal,
} from "../../store/notificationSlice";
import { getUser } from "../../store/userSlice";
import {
  selectSocketState,
  newNotificationReceived,
} from "../../store/socketSlice";
import { formatDistanceToNow } from "date-fns";

// Define tabs with enhanced configuration
const tabs = [
  { key: "All", label: "All", icon: "📋", color: "blue" },
  { key: "Like", label: "Likes", icon: "❤️", color: "red" },
  { key: "Post", label: "Posts", icon: "📝", color: "green" },
  { key: "Follow", label: "Follows", icon: "👥", color: "purple" },
  { key: "Comment", label: "Comments", icon: "💬", color: "cyan" },
  { key: "Admin", label: "Admin", icon: "⚡", color: "yellow" },
];

// Enhanced debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Notification page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mt-10 p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-red-200 dark:border-red-800 rounded-3xl shadow-2xl"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTimes className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {this.state.error?.message || "Failed to load notifications"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </motion.div>
      );
    }
    return this.props.children;
  }
}

// Enhanced Notification Item Component
const NotificationItem = React.memo(
  ({
    notification,
    userId,
    dispatch,
    loading,
    handleReply,
    toggleSelect,
    selectedIds,
    navigate,
    index,
  }) => {
    const isAdmin = ["admin", "admin_reply"].includes(notification.type);
    const [replyContent, setReplyContent] = useState("");
    const [isReplying, setIsReplying] = useState(false);
    const [replyError, setReplyError] = useState(null);
    const [replySuccess, setReplySuccess] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const debouncedMarkAsRead = useCallback(
      debounce((id) => dispatch(markAsRead(id)), 300),
      [dispatch]
    );

    const debouncedDelete = useCallback(
      debounce(async (id) => {
        setIsDeleting(true);
        try {
          await dispatch(deleteNotification(id));
        } finally {
          setIsDeleting(false);
        }
      }, 300),
      [dispatch]
    );

    useEffect(() => {
      if (replySuccess || replyError) {
        const timer = setTimeout(() => {
          setReplySuccess(null);
          setReplyError(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [replySuccess, replyError]);

    // Get notification type icon and color
    const getNotificationTypeIcon = (type) => {
      const iconMap = {
        like: <FaHeart className="text-red-500" />,
        comment: <FaComment className="text-blue-500" />,
        reply: <FaReply className="text-green-500" />,
        follow: <FaUser className="text-purple-500" />,
        post: <FaBookmark className="text-yellow-500" />,
        admin: <FaShieldAlt className="text-indigo-500" />,
        admin_reply: <FaShieldAlt className="text-indigo-500" />,
      };
      return iconMap[type] || <FaEye className="text-gray-500" />;
    };

    const getNotificationGradient = (type) => {
      const gradients = {
        like: "from-red-500/20 to-pink-500/20",
        comment: "from-blue-500/20 to-cyan-500/20",
        reply: "from-green-500/20 to-emerald-500/20",
        follow: "from-purple-500/20 to-violet-500/20",
        post: "from-yellow-500/20 to-orange-500/20",
        admin: "from-indigo-500/20 to-purple-500/20",
        admin_reply: "from-indigo-500/20 to-purple-500/20",
      };
      return gradients[type] || "from-gray-500/20 to-slate-500/20";
    };

    return (
      <motion.li
        layout
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: -100, scale: 0.95 }}
        transition={{
          duration: 0.3,
          delay: index * 0.05,
          type: "spring",
          stiffness: 100,
          damping: 20,
        }}
        whileHover={{ scale: 1.02 }}
        className={`
          relative overflow-hidden rounded-3xl backdrop-blur-sm
          border border-gray-200/50 dark:border-gray-700/50
          shadow-lg hover:shadow-xl transition-all duration-300
          ${
            notification.read
              ? "bg-white/60 dark:bg-gray-800/60"
              : `bg-gradient-to-br ${getNotificationGradient(
                  notification.type
                )} backdrop-blur-xl`
          }
          ${isDeleting ? "animate-pulse opacity-50" : ""}
        `}
      >
        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />
        )}

        <div className="flex items-start gap-4 p-6 relative">
          {/* Selection checkbox */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(notification._id)}
              onChange={() => toggleSelect(notification._id)}
              className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 transition-all"
              aria-label={`Select notification from ${
                notification.sender?.name || "User"
              }`}
            />
          </motion.div>

          {/* Avatar with type indicator */}
          <div className="relative flex-shrink-0">
            {notification.sender?.avatar ? (
              <motion.img
                whileHover={{ scale: 1.1 }}
                src={notification.sender.avatar}
                alt="Avatar"
                className="w-14 h-14 rounded-2xl border-3 border-white dark:border-gray-800 shadow-lg object-cover"
              />
            ) : (
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={`
                  w-14 h-14 rounded-2xl border-3 border-white dark:border-gray-800 shadow-lg
                  bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800
                  flex items-center justify-center font-bold text-white text-lg
                `}
              >
                {notification.sender?.name
                  ? `${
                      notification.sender.name[0]
                    }${notification.sender.name.slice(-1)}`
                  : "?"}
              </motion.div>
            )}

            {/* Type indicator badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
              {getNotificationTypeIcon(notification.type)}
            </div>
          </div>

          {/* Notification content */}
          <div className="flex-1 min-w-0">
            {isAdmin ? (
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800"
                  onClick={() =>
                    !notification.read && debouncedMarkAsRead(notification._id)
                  }
                >
                  <div className="flex items-start gap-3">
                    <FaShieldAlt className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {notification.sender?.name || "Admin"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.type === "admin"
                          ? "sent a message"
                          : "replied to your message"}
                        {notification.content && (
                          <span className="block mt-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl italic">
                            "{notification.content}"
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Admin action buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsReplying(!isReplying)}
                    disabled={loading}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${
                        isReplying
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <FaReply className="w-3 h-3" />
                    {isReplying ? "Cancel" : "Reply"}
                  </motion.button>

                  {notification.type === "admin" && notification.navigateTo && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(notification.navigateTo)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      <FaEye className="w-3 h-3" />
                      Open Message
                    </motion.button>
                  )}
                </div>
              </div>
            ) : (
              <Link
                to={
                  notification.post?.slug
                    ? `/post/${notification.post.slug}`
                    : "#"
                }
                onClick={() =>
                  !notification.read && debouncedMarkAsRead(notification._id)
                }
                className="block group"
              >
                <div className="p-4 rounded-2xl bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/50 transition-all">
                  <p className="text-gray-900 dark:text-white font-medium leading-relaxed">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {notification.sender?.name || "User"}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 mx-2">
                      {notification.type === "like"
                        ? "liked"
                        : notification.type === "post"
                        ? "posted"
                        : notification.type === "follow"
                        ? "followed you"
                        : notification.type === "comment"
                        ? "commented on"
                        : notification.type === "reply"
                        ? "replied to"
                        : notification.type.toUpperCase()}
                    </span>
                    {notification.post && (
                      <span>
                        your post
                        <span className="font-semibold ml-1">
                          "{notification.post.title || "unknown"}"
                        </span>
                      </span>
                    )}
                    {notification.content && (
                      <span className="block mt-2 p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-xl text-sm italic">
                        "{notification.content}"
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            )}

            {/* Timestamp and status */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {!notification.read && (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    New
                  </span>
                )}
              </p>
            </div>

            {/* Reply form */}
            <AnimatePresence>
              {isAdmin && isReplying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 overflow-hidden"
                >
                  <form
                    onSubmit={(e) =>
                      handleReply(
                        e,
                        notification._id,
                        replyContent,
                        setReplyContent,
                        setIsReplying,
                        setReplyError,
                        setReplySuccess
                      )
                    }
                    className="space-y-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50"
                  >
                    {/* Reply status messages */}
                    <AnimatePresence>
                      {replyError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl"
                        >
                          <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                            <FaTimes className="w-3 h-3" />
                            {replyError}
                          </p>
                        </motion.div>
                      )}

                      {replySuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-xl"
                        >
                          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                            <FaCheck className="w-3 h-3" />
                            {replySuccess}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                        placeholder="Type your reply..."
                        rows="4"
                        required
                        disabled={loading}
                      />
                      <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                        {replyContent.length}/500
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={loading || !replyContent.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaReply />
                        )}
                        Send Reply
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => {
                          setIsReplying(false);
                          setReplyContent("");
                          setReplyError(null);
                          setReplySuccess(null);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-all"
                        disabled={loading}
                      >
                        <FaTimes />
                        Cancel
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Delete button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => debouncedDelete(notification._id)}
            disabled={loading || isDeleting}
            className="absolute top-6 right-6 p-2 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete notification"
          >
            {isDeleting ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaTrash className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </motion.li>
    );
  }
);

// Enhanced Tabs Component
const Tabs = React.memo(
  ({
    tabs,
    activeTab,
    setActiveTab,
    setSelectedIds,
    setSelectAll,
    unreadCounts,
    newCounts,
    clearNewNotifications,
  }) => (
    <div className="relative mb-8">
      <div className="flex gap-2 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm overflow-x-auto">
        {tabs.map((tab) => (
          <motion.button
            key={tab.key}
            layout
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedIds([]);
              setSelectAll(false);
              clearNewNotifications(tab.key);
            }}
            className={`
              relative flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200
              whitespace-nowrap min-w-fit
              ${
                activeTab === tab.key
                  ? `bg-white dark:bg-gray-700 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-lg ring-1 ring-${tab.color}-500/20`
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50"
              }
            `}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>

            {/* Unread count badge */}
            {unreadCounts[tab.key] > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded-full min-w-[20px] text-center"
              >
                {unreadCounts[tab.key]}
              </motion.span>
            )}

            {/* New notifications badge */}
            {newCounts[tab.key] > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
                className="absolute -top-1 -right-1 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg ring-2 ring-white dark:ring-gray-800"
              >
                {newCounts[tab.key]}
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
);

// Main component
export default function NotificationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromQuery = searchParams.get("type");
  const notificationId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [newNotifications, setNewNotifications] = useState({
    All: 0,
    Like: 0,
    Post: 0,
    Follow: 0,
    Comment: 0,
    Admin: 0,
  });

  const notifications = useSelector(selectNotifications) || [];
  const unreadCount = useSelector(selectUnreadCount) || 0;
  const page = useSelector(selectNotificationPage) || 1;
  const total = useSelector(selectNotificationTotal) || 0;
  const { loading, error } = useSelector((state) => state.notifications || {});
  const { user } = useSelector((state) => state.user || {});
  const { error: socketError, newNotification } =
    useSelector(selectSocketState) || {};

  // Calculate unread counts per tab
  const unreadCounts = useMemo(() => {
    const counts = {
      All: 0,
      Like: 0,
      Post: 0,
      Follow: 0,
      Comment: 0,
      Admin: 0,
    };
    notifications.forEach((n) => {
      if (n.sender?._id === user?._id || n.read) return;
      counts.All += 1;
      if (n.type === "like") counts.Like += 1;
      if (n.type === "post") counts.Post += 1;
      if (n.type === "follow") counts.Follow += 1;
      if (["comment", "reply"].includes(n.type)) counts.Comment += 1;
      if (["admin", "admin_reply"].includes(n.type)) counts.Admin += 1;
    });
    return counts;
  }, [notifications, user?._id]);

  // Handle new notifications from socket
  useEffect(() => {
    if (
      newNotification &&
      newNotification.user?.toString() === user?._id?.toString() &&
      !newNotification.read
    ) {
      setNewNotifications((prev) => {
        const newCounts = { ...prev };
        newCounts.All += 1;
        if (newNotification.type === "like") newCounts.Like += 1;
        if (newNotification.type === "post") newCounts.Post += 1;
        if (newNotification.type === "follow") newCounts.Follow += 1;
        if (["comment", "reply"].includes(newNotification.type))
          newCounts.Comment += 1;
        if (["admin", "admin_reply"].includes(newNotification.type))
          newCounts.Admin += 1;
        return newCounts;
      });

      // Auto-clear after 10 seconds
      const timer = setTimeout(() => {
        setNewNotifications((prev) => {
          const newCounts = { ...prev };
          Object.keys(newCounts).forEach((key) => {
            newCounts[key] = Math.max(0, newCounts[key] - 1);
          });
          return newCounts;
        });
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [newNotification, user?._id]);

  // Clear new notifications when switching tabs
  const clearNewNotifications = useCallback((tab) => {
    setNewNotifications((prev) => ({ ...prev, [tab]: 0 }));
  }, []);

  // Toggle select utility
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  }, []);

  // Fetch user and notifications
  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchNotifications({ page: 1, limit: 20 }));
      dispatch(fetchUnreadCount());
    }
  }, [dispatch, user]);

  // Handle query parameters
  useEffect(() => {
    if (typeFromQuery) {
      const formatted =
        typeFromQuery.charAt(0).toUpperCase() + typeFromQuery.slice(1);
      const validTab = tabs.find((tab) => tab.key === formatted);
      if (validTab) {
        setActiveTab(formatted);
        clearNewNotifications(formatted);
      }
    }

    if (notificationId && notificationId !== "undefined") {
      const notification = notifications.find((n) => n._id === notificationId);
      if (notification && !notification.read) {
        dispatch(markAsRead(notificationId)).then(() => {
          // Handle navigation after marking as read
          if (
            notification.post?.slug &&
            !["admin", "admin_reply"].includes(notification.type)
          ) {
            navigate(`/post/${notification.post.slug}`);
          } else if (notification.navigateTo && notification.type === "admin") {
            navigate(notification.navigateTo);
          }
        });
      }
    }
  }, [
    dispatch,
    typeFromQuery,
    notificationId,
    notifications,
    navigate,
    clearNewNotifications,
  ]);

  // Filter notifications by active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.sender?._id === user?._id) return false;
      switch (activeTab) {
        case "All":
          return true;
        case "Like":
          return n.type === "like";
        case "Post":
          return n.type === "post";
        case "Follow":
          return n.type === "follow";
        case "Comment":
          return ["comment", "reply"].includes(n.type);
        case "Admin":
          return ["admin", "admin_reply"].includes(n.type);
        default:
          return true;
      }
    });
  }, [notifications, activeTab, user?._id]);

  // Handle reply submission
  const handleReply = useCallback(
    async (
      e,
      notificationId,
      replyContent,
      setReplyContent,
      setIsReplying,
      setReplyError,
      setReplySuccess
    ) => {
      e.preventDefault();
      if (!replyContent.trim()) {
        setReplyError("Reply content is required");
        return;
      }
      if (replyContent.length > 500) {
        setReplyError("Reply must be 500 characters or less");
        return;
      }

      try {
        await dispatch(
          replyToAdminNotification({
            notificationId,
            content: replyContent.trim(),
          })
        ).unwrap();
        setReplySuccess("Reply sent successfully!");
        setReplyContent("");
        setIsReplying(false);
        setReplyError(null);
      } catch (err) {
        setReplyError(err?.message || err || "Failed to send reply");
        setReplySuccess(null);
      }
    },
    [dispatch]
  );

  // Handle mark all read
  const handleMarkAllRead = useCallback(
    debounce(async () => {
      try {
        await dispatch(markAllAsRead()).unwrap();
        setNewNotifications({
          All: 0,
          Like: 0,
          Post: 0,
          Follow: 0,
          Comment: 0,
          Admin: 0,
        });
      } catch (err) {
        console.error("Failed to mark all as read:", err);
      }
    }, 300),
    [dispatch]
  );

  // Handle select all toggle
  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n._id));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredNotifications]);

  // Handle delete selected notifications
  const handleDeleteSelected = useCallback(
    debounce(async () => {
      if (selectedIds.length === 0) return;

      try {
        // Delete notifications in parallel for better performance
        await Promise.all(
          selectedIds.map((id) => dispatch(deleteNotification(id)))
        );

        setSelectedIds([]);
        setSelectAll(false);

        // Update new notification counts
        setNewNotifications((prev) => {
          const newCounts = { ...prev };
          const deletedNotifications = notifications.filter((n) =>
            selectedIds.includes(n._id)
          );

          deletedNotifications.forEach((n) => {
            if (!n.read) {
              newCounts.All = Math.max(0, newCounts.All - 1);
              if (n.type === "like")
                newCounts.Like = Math.max(0, newCounts.Like - 1);
              if (n.type === "post")
                newCounts.Post = Math.max(0, newCounts.Post - 1);
              if (n.type === "follow")
                newCounts.Follow = Math.max(0, newCounts.Follow - 1);
              if (["comment", "reply"].includes(n.type))
                newCounts.Comment = Math.max(0, newCounts.Comment - 1);
              if (["admin", "admin_reply"].includes(n.type))
                newCounts.Admin = Math.max(0, newCounts.Admin - 1);
            }
          });
          return newCounts;
        });
      } catch (err) {
        console.error("Failed to delete notifications:", err);
      }
    }, 300),
    [dispatch, selectedIds, notifications]
  );

  // Handle load more notifications
  const handleLoadMore = useCallback(() => {
    if (filteredNotifications.length < total && !loading) {
      dispatch(fetchNotifications({ page: page + 1, limit: 20 }));
    }
  }, [dispatch, page, total, filteredNotifications.length, loading]);

  // Update selectAll state when filtered notifications change
  useEffect(() => {
    if (filteredNotifications.length > 0) {
      const allSelected = filteredNotifications.every((n) =>
        selectedIds.includes(n._id)
      );
      setSelectAll(allSelected && selectedIds.length > 0);
    } else {
      setSelectAll(false);
    }
  }, [filteredNotifications, selectedIds]);

  return (
    <ErrorBoundary>
      {/* Header notification banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mx-4 mt-6 mb-8"
      >
        <p className="text-sm text-blue-800 dark:text-blue-200 text-center flex items-center justify-center gap-2">
          <span className="text-base">📅</span>
          Notifications are automatically deleted on the 2nd of every month.
        </p>
      </motion.div>

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between p-8 gap-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Notifications
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {unreadCount > 0 ? (
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      {unreadCount} unread notification
                      {unreadCount === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FaCheck className="text-green-500" />
                      All caught up!
                    </span>
                  )}
                </p>
              </motion.div>

              <motion.button
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || loading}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all
                  ${
                    unreadCount === 0 || loading
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                  }
                `}
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                Mark All Read
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setSelectedIds={setSelectedIds}
              setSelectAll={setSelectAll}
              unreadCounts={unreadCounts}
              newCounts={newNotifications}
              clearNewNotifications={clearNewNotifications}
            />
          </div>

          {/* Error messages */}
          <AnimatePresence>
            {(error || socketError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mx-8 mb-6"
              >
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <FaTimes className="text-red-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">
                        Connection Error
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                        {error || socketError}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk actions */}
          {filteredNotifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-8 pb-4"
            >
              <label className="flex items-center gap-3 text-gray-700 dark:text-gray-300 cursor-pointer">
                <motion.input
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 transition-all"
                />
                <span className="font-medium">
                  Select All ({filteredNotifications.length})
                </span>
              </label>

              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all shadow-lg"
                  >
                    <FaTrash />
                    Delete Selected ({selectedIds.length})
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Notifications list */}
          <div className="px-8 pb-8">
            {loading && filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <FaSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Loading notifications...
                </p>
              </motion.div>
            ) : filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <FaBell className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No {activeTab.toLowerCase()} notifications
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  {activeTab === "All"
                    ? "You're all caught up! New notifications will appear here when you receive them."
                    : `No ${activeTab.toLowerCase()} notifications to show. Check back later!`}
                </p>
              </motion.div>
            ) : (
              <>
                <ul className="space-y-4">
                  <AnimatePresence>
                    {filteredNotifications.map((notification, index) => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        userId={user?._id}
                        dispatch={dispatch}
                        loading={loading}
                        handleReply={handleReply}
                        toggleSelect={toggleSelect}
                        selectedIds={selectedIds}
                        navigate={navigate}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </ul>

                {/* Load more button */}
                {filteredNotifications.length < total && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-8"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <span className="text-sm opacity-75">
                            ({total - filteredNotifications.length} remaining)
                          </span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </ErrorBoundary>
  );
}
