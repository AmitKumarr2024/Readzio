import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaTrash,
  FaExclamationTriangle,
  FaInfoCircle,
  FaShieldAlt,
} from "react-icons/fa";
import { deleteAllNotifications } from "../../../store/adminSlice";

export function EnhancedNotificationManager() {
  const dispatch = useDispatch();
  const { loading, error, notificationStatus } = useSelector(
    (state) => state.admin
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleDeleteNotifications = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setCountdown(5);
      return;
    }

    dispatch(deleteAllNotifications());
    setConfirmDelete(false);
    setCountdown(0);
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
    setCountdown(0);
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-800 dark:to-gray-900 text-text-main-light dark:text-text-main-dark p-6 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent flex items-center">
          <FaTrash className="mr-3 text-red-600" />
          Notification Manager
        </h2>
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
            <FaShieldAlt className="inline mr-1" />
            Admin Only
          </div>
        </div>
      </div>

      {/* Warning Card */}
      <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-yellow-500 text-2xl mr-4 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Dangerous Operation
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              This action will permanently delete all notifications from the
              database. This operation cannot be undone and will affect all
              users on the platform.
            </p>
            <div className="space-y-2 text-sm text-yellow-600 dark:text-yellow-400">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                All user notifications will be removed
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                System notifications will be cleared
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                No recovery option available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {notificationStatus && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center">
            <FaInfoCircle className="text-green-500 mr-3" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              {notificationStatus}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-3" />
            <p className="text-red-800 dark:text-red-200 font-medium">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Action Section */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        {!confirmDelete ? (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash className="text-3xl text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete All Notifications
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Remove all notifications from the system database
              </p>
            </div>

            <button
              onClick={handleDeleteNotifications}
              disabled={loading}
              className={`px-8 py-4 rounded-xl font-semibold text-white shadow-lg transform transition-all duration-200 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 hover:scale-105 hover:shadow-xl active:scale-95"
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <FaTrash className="mr-2" />
                  Initialize Deletion
                </div>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <FaExclamationTriangle className="text-3xl text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">
                Confirm Deletion
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you absolutely sure you want to delete all notifications?
              </p>
              {countdown > 0 && (
                <div className="mb-4">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {countdown}
                  </div>
                  <div className="text-sm text-gray-500">
                    Confirmation available in {countdown} seconds
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={cancelDelete}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNotifications}
                disabled={countdown > 0 || loading}
                className={`px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${
                  countdown > 0 || loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 hover:shadow-xl"
                }`}
              >
                {loading ? "Deleting..." : "Confirm Delete All"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Information Footer */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-start">
          <FaInfoCircle className="text-blue-500 mr-3 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
              What happens after deletion?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              The system will continue to generate new notifications as users
              interact with the platform. This action only clears existing
              notifications and does not affect the notification system itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
