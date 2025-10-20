import { useDispatch, useSelector } from "react-redux";
import {
  deactivateBannerNotification,
  deleteAllBannerNotifications,
  fetchAllBannerNotifications,
  cleanupExpiredBannerNotifications,
} from "../../../store/bannerNotificationSlice"; // Adjust path
import { useEffect, useState } from "react";
import Pagination from "../../../Utils/Pagination";
import { toast } from "react-hot-toast";

const NotificationHistory = () => {
  const dispatch = useDispatch();
  const { notifications: bannerNotifications, loading } = useSelector(
    (state) => state.bannerNotifications
  ); // Use selectAll for history
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(bannerNotifications.length / itemsPerPage);
  const now = new Date();
  const activeCount = bannerNotifications.filter(
    (n) => n.isActive && (!n.expiresAt || new Date(n.expiresAt) >= now)
  ).length;

  useEffect(() => {
    dispatch(fetchAllBannerNotifications());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [bannerNotifications]);

  const getErrorMessage = (err) => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (typeof err === "object" && err?.message) return err.message;
    return "Something went wrong";
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
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total: {bannerNotifications.length} | Active: {activeCount}
        </p>
        <div className="space-x-2">
          <button
            onClick={handleCleanupExpired}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            Cleanup Expired
          </button>
          <button
            onClick={handleDeleteAll}
            className="text-red-600 text-sm font-medium hover:underline"
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
                const isExpired =
                  notification.expiresAt &&
                  new Date(notification.expiresAt) < now;
                return (
                  <tr
                    key={notification._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="p-3 text-sm">{notification.title}</td>
                    <td className="p-3 text-sm">{notification.message}</td>
                    <td className="p-3 text-sm">{notification.region}</td>
                    <td className="p-3 text-sm">
                      {new Date(notification.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm">
                      {notification.expiresAt
                        ? new Date(notification.expiresAt).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="p-3 text-sm">
                      {notification?.dismissedCount || 0} users
                    </td>
                    <td className="p-3 text-sm">
                      {isExpired
                        ? "Expired"
                        : notification.isActive
                        ? "Active"
                        : "Inactive"}
                    </td>
                    <td className="p-3 text-sm">
                      {!isExpired && notification.isActive ? (
                        <button
                          onClick={() => handleDeactivate(notification._id)}
                          className="text-red-600 hover:underline"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">Inactive</span>
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
