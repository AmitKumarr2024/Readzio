import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash } from "react-icons/fa";
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

// Define tabs
const tabs = ["All", "Like", "Post", "Follow", "Comment", "Admin"];

// Simple debounce utility (no external library)
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mt-10 p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark border-2 border-red-500 rounded-lg"
        >
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p>{this.state.error?.message || "Failed to load notifications"}</p>
        </motion.div>
      );
    }
    return this.props.children;
  }
}

// Notification Item Component
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

    const debouncedMarkAsRead = useCallback(
      debounce((id) => dispatch(markAsRead(id)), 300),
      [dispatch]
    );

    const debouncedDelete = useCallback(
      debounce((id) => dispatch(deleteNotification(id)), 300),
      [dispatch]
    );

    useEffect(() => {
      if (replySuccess || replyError) {
        const timer = setTimeout(() => {
          setReplySuccess(null);
          setReplyError(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [replySuccess, replyError]);

    return (
      <motion.li
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className={`rounded-lg border border-gray-200 shadow-sm overflow-hidden ${
          notification.read
            ? "bg-background-light dark:bg-background-dark"
            : "bg-blue-50 dark:bg-blue-900"
        }`}
      >
        <div className="flex items-start gap-4 p-4 relative">
          <motion.input
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="checkbox"
            checked={selectedIds.includes(notification._id)}
            onChange={() => toggleSelect(notification._id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
            aria-label={`Select notification from ${
              notification.sender?.name || "User"
            }`}
          />
          {notification.sender?.avatar ? (
            <img
              src={notification.sender.avatar}
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-gray-300"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-white font-bold border border-gray-300">
              {notification.sender?.name
                ? `${
                    notification.sender.name[0]
                  }${notification.sender.name.slice(-1)}`
                : "??"}
            </div>
          )}

          <div className="flex-1">
            {isAdmin ? (
              <div
                className="text-sm font-medium bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
                onClick={() =>
                  !notification.read && debouncedMarkAsRead(notification._id)
                }
              >
                <span className="font-semibold">
                  {notification.sender?.name || "User"}
                </span>{" "}
                {notification.type === "admin"
                  ? "sent a message"
                  : "replied to your message"}
                {notification.content ? `: ${notification.content}` : ""}
                <div className="mt-2 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsReplying(true)}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Reply
                  </motion.button>
                  {notification.type === "admin" && notification.navigateTo && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(notification.navigateTo)}
                      disabled={loading}
                      className="text-sm text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
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
                className="block text-sm font-medium text-text-main-light dark:text-text-main-dark hover:text-blue-600"
              >
                <span className="font-semibold">
                  {notification.sender?.name || "User"}
                </span>{" "}
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
                  : notification.type.toUpperCase()}{" "}
                {notification.post
                  ? `your post "${notification.post.title || "unknown"}"`
                  : ""}
                {notification.content ? `: ${notification.content}` : ""}
              </Link>
            )}
            <p className="text-xs text-text-main-light dark:text-text-main-dark mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </p>
            {isAdmin && isReplying && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
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
                className="mt-2 space-y-2"
              >
                {replyError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-red-600"
                  >
                    {replyError}
                  </motion.p>
                )}
                {replySuccess && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-green-600"
                  >
                    {replySuccess}
                  </motion.p>
                )}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm text-text-main-light dark:text-text-main-dark bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your reply..."
                  rows="3"
                  required
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1 bg-blue-600 text-text-main-light dark:text-text-main-dark rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Send
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent("");
                      setReplyError(null);
                      setReplySuccess(null);
                    }}
                    className="px-4 py-1 bg-gray-500 text-text-main-light dark:text-text-main-dark rounded-lg text-sm hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.form>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => debouncedDelete(notification._id)}
            disabled={loading}
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            aria-label="Delete notification"
          >
            <FaTrash size={16} />
          </motion.button>
        </div>
      </motion.li>
    );
  }
);

// Tabs Component
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
    <div className="flex gap-4 border-b border-gray-200 mb-6 relative">
      {tabs.map((tab) => (
        <motion.button
          key={tab}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setActiveTab(tab);
            setSelectedIds([]);
            setSelectAll(false);
            clearNewNotifications(tab);
          }}
          className={`relative pb-2 text-sm font-medium text-text-main-light dark:text-text-main-dark transition-colors duration-200 ${
            activeTab === tab
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          } flex items-center gap-2`}
        >
          {tab}{" "}
          {unreadCounts[tab] > 0 && (
            <span className="text-xs text-white bg-blue-600 rounded-full px-2 py-0.5">
              {unreadCounts[tab]}
            </span>
          )}
          {newCounts[tab] > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
              className="text-xs text-white bg-red-600 rounded-full px-2 py-0.5"
            >
              {newCounts[tab]}
            </motion.span>
          )}
          {activeTab === tab && (
            <motion.div
              layoutId="underline"
              className="absolute left-0 bottom-0 w-full h-1 bg-blue-600 rounded-full"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  )
);

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
    useSelector(selectSocketState);

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
      // Clear new notification counts after 10 seconds
      const timer = setTimeout(() => {
        setNewNotifications((prev) => {
          const newCounts = { ...prev };
          newCounts.All = Math.max(0, newCounts.All - 1);
          if (newNotification.type === "like")
            newCounts.Like = Math.max(0, newCounts.Like - 1);
          if (newNotification.type === "post")
            newCounts.Post = Math.max(0, newCounts.Post - 1);
          if (newNotification.type === "follow")
            newCounts.Follow = Math.max(0, newCounts.Follow - 1);
          if (["comment", "reply"].includes(newNotification.type))
            newCounts.Comment = Math.max(0, newCounts.Comment - 1);
          if (["admin", "admin_reply"].includes(newNotification.type))
            newCounts.Admin = Math.max(0, newCounts.Admin - 1);
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

  // Define toggleSelect
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

  // Handle query params
  useEffect(() => {
    if (typeFromQuery) {
      const formatted =
        typeFromQuery.charAt(0).toUpperCase() + typeFromQuery.slice(1);
      if (tabs.includes(formatted)) {
        setActiveTab(formatted);
        clearNewNotifications(formatted);
      }
    }
    if (notificationId && notificationId !== "undefined") {
      const notification = notifications.find((n) => n._id === notificationId);
      if (notification && !notification.read) {
        dispatch(markAsRead(notificationId)).then(() => {
          setNewNotifications((prev) => {
            const newCounts = { ...prev };
            newCounts.All = Math.max(0, newCounts.All - 1);
            if (notification.type === "like")
              newCounts.Like = Math.max(0, newCounts.Like - 1);
            if (notification.type === "post")
              newCounts.Post = Math.max(0, newCounts.Post - 1);
            if (notification.type === "follow")
              newCounts.Follow = Math.max(0, newCounts.Follow - 1);
            if (["comment", "reply"].includes(notification.type))
              newCounts.Comment = Math.max(0, newCounts.Comment - 1);
            if (["admin", "admin_reply"].includes(notification.type))
              newCounts.Admin = Math.max(0, newCounts.Admin - 1);
            return newCounts;
          });
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

  // Filter notifications by tab
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
      try {
        await dispatch(
          replyToAdminNotification({ notificationId, content: replyContent })
        ).unwrap();
        setReplySuccess("Reply sent successfully!");
        setReplyContent("");
        setIsReplying(false);
        setReplyError(null);
      } catch (err) {
        setReplyError(err || "Failed to send reply");
        setReplySuccess(null);
      }
    },
    [dispatch]
  );

  // Handle mark all read
  const handleMarkAllRead = useCallback(
    debounce(() => {
      dispatch(markAllAsRead());
      setNewNotifications({
        All: 0,
        Like: 0,
        Post: 0,
        Follow: 0,
        Comment: 0,
        Admin: 0,
      });
    }, 300),
    [dispatch]
  );

  // Handle select all
  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n._id));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredNotifications]);

  // Handle delete selected
  const handleDeleteSelected = useCallback(
    debounce(async () => {
      for (const id of selectedIds) {
        await dispatch(deleteNotification(id));
      }
      setSelectedIds([]);
      setSelectAll(false);
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
    }, 300),
    [dispatch, selectedIds, notifications]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (filteredNotifications.length < total) {
      dispatch(fetchNotifications({ page: page + 1, limit: 20 }));
    }
  }, [dispatch, page, total, filteredNotifications.length]);

  return (
    <ErrorBoundary>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className=" text-sm bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark mb-4 text-center mt-10"
      >
        Notifications are automatically deleted on the 2nd of every month.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto mt-10 px-4 sm:px-6 lg:px-2 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl shadow-lg"
      >
        <div className="flex justify-between items-center mb-6 pt-6">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-text-main-light dark:text-text-main-dark"
          >
            Notifications ({unreadCount} unread)
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || loading}
            className={`text-sm font-semibold ${
              unreadCount === 0 || loading
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-600 hover:text-blue-800"
            }`}
          >
            Mark All Read
          </motion.button>
        </div>

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

        <AnimatePresence>
          {(error || socketError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-red-600 bg-red-100 dark:bg-red-900 p-3 rounded-lg mb-4 border border-red-300"
            >
              ERROR: {error || socketError}
            </motion.div>
          )}
        </AnimatePresence>

        {filteredNotifications.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <label className="flex items-center gap-2 text-sm text-text-main-light dark:text-text-main-dark">
              <motion.input
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="checkbox"
                checked={selectAll}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Select All
            </label>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              className={`text-sm font-semibold ${
                selectedIds.length === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-red-600 hover:text-red-800"
              }`}
            >
              Delete Selected ({selectedIds.length})
            </motion.button>
          </div>
        )}

        {loading && filteredNotifications.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-sm text-text-main-light dark:text-text-main-dark p-4"
          >
            Loading...
          </motion.p>
        ) : filteredNotifications.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-sm text-text-main-light dark:text-text-main-dark p-4"
          >
            No {activeTab.toLowerCase()} notifications
          </motion.p>
        ) : (
          <>
            <ul className="space-y-4 pb-6">
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
            {filteredNotifications.length < total && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full py-2 mt-4 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Load More
              </motion.button>
            )}
          </>
        )}
      </motion.div>
    </ErrorBoundary>
  );
}
