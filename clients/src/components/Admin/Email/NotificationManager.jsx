import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTrash } from "react-icons/fa";
import {
  setNotificationStatus,
  setEmailError,
} from "../../../store/adminSlice";

export default function NotificationManager() {
  const dispatch = useDispatch();
  const { emailLoading, emailError, notificationStatus } = useSelector(
    (state) => state.admin
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteNotifications = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/dailyMail/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to delete notifications");
      dispatch(
        setNotificationStatus(`Deleted ${data.deletedCount} notifications`)
      );
    } catch (error) {
      dispatch(setEmailError(error.message));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center">
        <FaTrash className="mr-2 text-blue-600" />
        Notification Manager
      </h2>
      {notificationStatus && (
        <p className="text-green-500 mb-4 rounded-lg p-3 bg-green-100 dark:bg-green-900">
          {notificationStatus}
        </p>
      )}
      {emailError && (
        <p className="text-red-500 mb-4 rounded-lg p-3 bg-red-100 dark:bg-red-900">
          {emailError}
        </p>
      )}
      <div className="mb-6">
        <p className="mb-4">
          Manually delete all notifications from the database.
        </p>
        <button
          onClick={handleDeleteNotifications}
          disabled={isDeleting || emailLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50"
        >
          <FaTrash className="inline-block mr-2" />
          {isDeleting ? "Deleting..." : "Delete All Notifications"}
        </button>
      </div>
    </div>
  );
}
