import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markAsRead,
  selectNotifications,
  selectUnreadCount,
} from '../../store/notificationSlice.js';
import { selectSocketState } from '../../store/socketSlice.js';
import { formatDistanceToNow } from 'date-fns';

// Framer Motion animation variants for the notification badge
const badgeVariants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
  exit: { y: -10, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
};

// Utility to get initials from sender name (fallback avatar)
const getInitials = (name = '') => {
  const [first = '', last = ''] = name.trim().split(' ');
  return (first[0] || '') + (last[0] || '');
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false); // Controls dropdown visibility
  const dropdownRef = useRef(null); // Used for outside click detection
  const dispatch = useDispatch();

  // Redux selectors
  const notifications = useSelector(selectNotifications) || [];
  const unreadCount = useSelector(selectUnreadCount) || 0;
  const { error, loading } = useSelector((state) => state.notifications || {});
  const { isConnected, error: socketError } = useSelector(selectSocketState) || {};

  // Fetch notifications and count on mount
  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setOpen((prev) => !prev);
  const handleMarkAllRead = () => dispatch(markAllAsRead());

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative flex items-center justify-center p-2 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        aria-label="Notifications"
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 h-5 w-5">
            <AnimatePresence>
              <motion.span
                key={unreadCount}
                variants={badgeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
              >
                {unreadCount}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
            <span className="text-sm font-semibold">NOTIFICATIONS</span>
            <Link
              to="/message-box"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              disabled={loading || safeNotifications.length === 0}
            >
              Mark All Read
            </button>
          </div>

          {/* Error/Loading States */}
          {socketError && (
            <div className="p-3 text-center text-xs text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300">
              Socket Error: {socketError}
            </div>
          )}
          {error && (
            <div className="p-3 text-center text-xs text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300">
              Error: {error}
            </div>
          )}
          {loading && (
            <div className="p-3 text-center text-xs text-gray-500">Loading...</div>
          )}
          {!loading && safeNotifications.length === 0 && (
            <div className="p-3 text-center text-xs text-gray-500">No notifications</div>
          )}

          {/* Render Notifications */}
          {!loading &&
            safeNotifications.map((n) => (
              <Link
                to={
                  n.navigateTo ||
                  `/message-box?type=${
                    n.type === 'admin' || n.type === 'admin_reply' ? 'admin' : 'post'
                  }&id=${n._id}`
                }
                key={n._id}
                className={`block p-3 border-b border-gray-200 dark:border-gray-600 transition-colors ${
                  n.read
                    ? 'bg-background-light dark:bg-background-dark'
                    : 'bg-blue-100 dark:bg-blue-900'
                } hover:bg-gray-100 dark:hover:bg-gray-700`}
                onClick={() => {
                  setOpen(false);
                  if (!n.read) dispatch(markAsRead(n._id));
                }}
              >
                <div className="flex items-start">
                  {/* Avatar with fallback initials */}
                  {n.sender?.avatar ? (
                    <img
                      src={n.sender.avatar}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-gray-400 mr-2"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center font-semibold mr-2 text-sm">
                      {getInitials(n.sender?.name || 'U')}
                    </div>
                  )}

                  {/* Notification content */}
                  <div className="flex-1">
                    <span className="text-xs">
                      {n.type === 'admin' || n.type === 'admin_reply'
                        ? `Admin: ${n.content || 'No message'}`
                        : `${n.sender?.name || 'User'} ${
                            n.type === 'like'
                              ? 'liked'
                              : n.type === 'bookmark'
                              ? 'bookmarked'
                              : n.type === 'comment'
                              ? 'commented on'
                              : n.type === 'reply'
                              ? 'replied to'
                              : n.type.toUpperCase()
                          } your post "${n.post?.title || 'unknown'}"${
                            n.content ? `: ${n.content}` : ''
                          }`}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {n.createdAt
                        ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                        : 'Unknown time'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
