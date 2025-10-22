import { useDispatch, useSelector } from "react-redux";
import {
  deactivateBannerNotification,
  deleteAllBannerNotifications,
  fetchAllBannerNotifications,
  cleanupExpiredBannerNotifications,
} from "../../../store/bannerNotificationSlice";
import { useEffect, useState } from "react";
import Pagination from "../../../Utils/Pagination";
import { toast } from "react-hot-toast";

const NotificationHistory = () => {
  const dispatch = useDispatch();
  const { notifications: bannerNotifications, loading } = useSelector(
    (state) => state.bannerNotifications
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(bannerNotifications.length / itemsPerPage);
  const now = new Date();

  // Calculate active count with proper date validation
  const activeCount = bannerNotifications.filter((n) => {
    if (!n.isActive) return false;
    if (!n.expiresAt) return true; // No expiry = always active

    try {
      const expiryDate = new Date(n.expiresAt);
      return !isNaN(expiryDate.getTime()) && expiryDate >= now;
    } catch (error) {
      console.error("Invalid expiry date:", n.expiresAt);
      return false;
    }
  }).length;

  // Calculate expired count
  const expiredCount = bannerNotifications.filter((n) => {
    if (!n.expiresAt) return false;
    try {
      const expiryDate = new Date(n.expiresAt);
      return !isNaN(expiryDate.getTime()) && expiryDate < now;
    } catch (error) {
      return false;
    }
  }).length;

  useEffect(() => {
    dispatch(fetchAllBannerNotifications());
  }, [dispatch]);

  // Debug: Log notifications to see what's coming from backend
  useEffect(() => {
    if (bannerNotifications.length > 0) {
      // console.log("📋 Notifications from backend:", bannerNotifications);
      bannerNotifications.forEach((n, i) => {
        // console.log(`Notification ${i + 1}:`, {
        //   title: n.title,
        //   expiresAt: n.expiresAt,
        //   expiresAtType: typeof n.expiresAt,
        //   isExpired: isExpired(n.expiresAt),
        // });
      });
    }
  }, [bannerNotifications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [bannerNotifications]);

  const getErrorMessage = (err) => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (typeof err === "object" && err?.message) return err.message;
    return "Something went wrong";
  };

  // Format date with proper error handling
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  // Check if notification is expired
  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    try {
      const expiryDate = new Date(expiresAt);
      return !isNaN(expiryDate.getTime()) && expiryDate < now;
    } catch (error) {
      return false;
    }
  };

  const handleDeactivate = async (id) => {
    if (
      window.confirm("Are you sure you want to deactivate this notification?")
    ) {
      try {
        await dispatch(deactivateBannerNotification(id)).unwrap();
        toast.success("Notification deactivated");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }
  };

  const handleDeleteAll = async () => {
    if (
      window.confirm(
        "⚠️ This will permanently delete ALL notifications. Continue?"
      )
    ) {
      try {
        await dispatch(deleteAllBannerNotifications()).unwrap();
        toast.success("All notifications deleted.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }
  };

  const handleCleanupExpired = async () => {
    if (window.confirm("Cleanup expired notifications?")) {
      try {
        await dispatch(cleanupExpiredBannerNotifications()).unwrap();
        toast.success("Expired notifications cleaned up.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }
  };

  const paginatedNotifications = bannerNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
        Notification History
      </h3>

      {/* Enhanced Stats Section */}
      <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {bannerNotifications.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Active: </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {activeCount}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Expired: </span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {expiredCount}
            </span>
          </div>
        </div>

        <div className="space-x-2">
          <button
            onClick={handleCleanupExpired}
            className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
          >
            Cleanup Expired
          </button>
          <button
            onClick={handleDeleteAll}
            className="text-red-600 dark:text-red-400 text-sm font-medium hover:underline"
          >
            Delete All
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      ) : bannerNotifications.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          No notifications found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="p-3 text-sm font-semibold">Title</th>
                <th className="p-3 text-sm font-semibold">Message</th>
                <th className="p-3 text-sm font-semibold">Region</th>
                <th className="p-3 text-sm font-semibold">Created At</th>
                <th className="p-3 text-sm font-semibold">Expires At</th>
                <th className="p-3 text-sm font-semibold">Dismissed By</th>
                <th className="p-3 text-sm font-semibold">Status</th>
                <th className="p-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedNotifications.map((notification) => {
                const expired = isExpired(notification.expiresAt);

                return (
                  <tr
                    key={notification._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="p-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {notification.title}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {notification.message}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                      {notification.region}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(notification.createdAt)}
                    </td>
                    <td className="p-3 text-sm">
                      {notification.expiresAt ? (
                        <div className="flex flex-col">
                          <span
                            className={
                              expired
                                ? "text-red-600 dark:text-red-400 font-medium"
                                : "text-gray-600 dark:text-gray-400"
                            }
                          >
                            {formatDate(notification.expiresAt)}
                          </span>
                          {expired && (
                            <span className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                              (Expired)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          Never
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                      {notification?.dismissedCount || 0} users
                    </td>
                    <td className="p-3 text-sm">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          expired
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : notification.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {expired
                          ? "Expired"
                          : notification.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {!expired && notification.isActive ? (
                        <button
                          onClick={() => handleDeactivate(notification._id)}
                          className="text-red-600 dark:text-red-400 hover:underline font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationHistory;
