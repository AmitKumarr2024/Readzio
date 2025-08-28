import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserNotificationHistory } from "../../../store/notificationSlice";
import { FaHistory, FaInbox, FaClock, FaUser } from "react-icons/fa";

export default function MessageHistory({ userId }) {
  const dispatch = useDispatch();
  const { userNotificationHistory = [], loading } = useSelector(
    (state) => state.notifications || {}
  );

  useEffect(() => {
    if (userId) {
      dispatch(getUserNotificationHistory(userId));
    }
  }, [dispatch, userId]);

  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-2xl inline-block">
            <FaInbox className="text-4xl text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No User Selected
            </h4>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Select a user from the users panel to view their message history
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading message history...
          </p>
        </div>
      </div>
    );
  }

  if (userNotificationHistory.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl inline-block">
            <FaHistory className="text-4xl text-yellow-500" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Messages Found
            </h4>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              This user hasn't received any messages yet
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaUser className="text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {userNotificationHistory.length} message
              {userNotificationHistory.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Most recent first
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {userNotificationHistory.map((msg, index) => (
          <div
            key={msg._id}
            className={`
              group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-750 
              rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm 
              hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500 
              transition-all duration-200 transform hover:-translate-y-0.5
            `}
          >
            {/* Message Content */}
            <div className="mb-3">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {msg.content}
              </p>
            </div>

            {/* Message Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <FaClock className="text-xs" />
                <span>{formatDate(msg.createdAt)}</span>
              </div>

              {/* Message Number */}
              <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                #{userNotificationHistory.length - index}
              </div>
            </div>

            {/* Hover Effect Border */}
            <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors duration-200 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-2xl">
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Total messages in history:{" "}
            <span className="font-semibold">
              {userNotificationHistory.length}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
