import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deactivateBannerNotification,
  deleteAllBannerNotifications,
  fetchAllBannerNotifications,
  cleanupExpiredBannerNotifications,
} from "../../../store/bannerNotificationSlice";
import Pagination from "../../../Utils/Pagination";
import { toast } from "react-hot-toast";
import {
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell,
  TrendingUp,
  Users,
  Calendar,
  MapPin,
  Power,
  Sparkles,
} from "lucide-react";

const NotificationHistory = () => {
  const dispatch = useDispatch();
  const { notifications: bannerNotifications, loading } = useSelector(
    (state) => state.bannerNotifications
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(bannerNotifications.length / itemsPerPage);
  const now = new Date();

  const activeCount = bannerNotifications.filter((n) => {
    if (!n.isActive) return false;
    if (!n.expiresAt) return true;
    try {
      const expiryDate = new Date(n.expiresAt);
      return !isNaN(expiryDate.getTime()) && expiryDate >= now;
    } catch (error) {
      return false;
    }
  }).length;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [bannerNotifications]);

  const getErrorMessage = (err) => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (typeof err === "object" && err?.message) return err.message;
    return "Something went wrong";
  };

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
      return "Invalid Date";
    }
  };

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
        toast.success("Notification deactivated successfully!");
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
        toast.success("All notifications deleted!");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }
  };

  const handleCleanupExpired = async () => {
    if (window.confirm("Cleanup expired notifications?")) {
      try {
        await dispatch(cleanupExpiredBannerNotifications()).unwrap();
        toast.success("Expired notifications cleaned up!");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
        .animate-slideIn { animation: slideIn 0.5s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.4s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hover\\:scale-102:hover { transform: scale(1.02); }
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .dark .glass-effect {
          background: rgba(31, 41, 55, 0.7);
          border: 1px solid rgba(75, 85, 99, 0.3);
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-50 animate-float"></div>
              <div className="relative p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl">
                <Bell className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Notification Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Manage and monitor all your broadcast notifications
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-blue-100 dark:border-blue-900 animate-scaleIn">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs font-bold">
                  ALL TIME
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Total Notifications
                </p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {bannerNotifications.length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-green-100 dark:border-green-900 animate-scaleIn"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full text-xs font-bold animate-pulse">
                  LIVE
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Active Now
                </p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {activeCount}
                </p>
              </div>
            </div>
          </div>

          <div
            className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-red-100 dark:border-red-900 animate-scaleIn"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full text-xs font-bold">
                  ENDED
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Expired
                </p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {expiredCount}
                </p>
              </div>
            </div>
          </div>

          <div
            className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 animate-scaleIn"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-gray-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Power className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold">
                  OFF
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Inactive
                </p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {bannerNotifications.length - activeCount - expiredCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-slideIn">
          <button
            onClick={handleCleanupExpired}
            className="flex-1 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <div className="relative flex items-center justify-center gap-3">
              <Clock className="w-5 h-5" />
              <span>Cleanup Expired ({expiredCount})</span>
            </div>
          </button>
          <button
            onClick={handleDeleteAll}
            className="flex-1 group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <div className="relative flex items-center justify-center gap-3">
              <Trash2 className="w-5 h-5" />
              <span>Delete All Notifications</span>
            </div>
          </button>
        </div>

        <div className="glass-effect rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-semibold mt-6 text-lg">
                Loading notifications...
              </p>
            </div>
          ) : bannerNotifications.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl mb-6 animate-float">
                <AlertCircle className="w-16 h-16 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                No Notifications Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Start by creating your first broadcast notification!
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="block lg:hidden space-y-4">
                {paginatedNotifications.map((notification, index) => {
                  const expired = isExpired(notification.expiresAt);
                  return (
                    <div
                      key={notification._id}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 transform hover:scale-102 shadow-md hover:shadow-xl animate-slideIn"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1 flex items-start gap-2">
                            <Bell className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
                            <span className="line-clamp-2">
                              {notification.title}
                            </span>
                          </h4>
                        </div>
                        <span
                          className={`px-3 py-1.5 text-xs font-bold rounded-full ml-3 whitespace-nowrap ${
                            expired
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : notification.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 animate-pulse"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {expired
                            ? "⏱️ Expired"
                            : notification.isActive
                            ? "✅ Active"
                            : "⭕ Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              Region
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {notification.region}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-xl">
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              Dismissed
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {notification?.dismissedCount || 0} users
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Created:</span>
                          <span className="text-gray-800 dark:text-gray-300">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        {notification.expiresAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                              Expires:
                            </span>
                            <span
                              className={`font-medium ${
                                expired
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {formatDate(notification.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>
                      {!expired && notification.isActive && (
                        <button
                          onClick={() => handleDeactivate(notification._id)}
                          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                          <Power className="w-4 h-4" />
                          Deactivate Notification
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <th className="p-4 text-sm font-bold rounded-tl-xl">
                        Title
                      </th>
                      <th className="p-4 text-sm font-bold">Message</th>
                      <th className="p-4 text-sm font-bold">Region</th>
                      <th className="p-4 text-sm font-bold">Created</th>
                      <th className="p-4 text-sm font-bold">Expires</th>
                      <th className="p-4 text-sm font-bold">Dismissed</th>
                      <th className="p-4 text-sm font-bold">Status</th>
                      <th className="p-4 text-sm font-bold rounded-tr-xl">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNotifications.map((notification, index) => {
                      const expired = isExpired(notification.expiresAt);
                      return (
                        <tr
                          key={notification._id}
                          className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-all duration-200 animate-slideIn"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <td className="p-4 text-sm font-bold text-gray-900 dark:text-white max-w-xs">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="truncate">
                                {notification.title}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                            <span className="line-clamp-2">
                              {notification.message}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200 rounded-full font-bold text-xs flex items-center gap-1 w-fit">
                              <MapPin className="w-3 h-3" />
                              {notification.region}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {formatDate(notification.createdAt)}
                          </td>
                          <td className="p-4 text-sm">
                            {notification.expiresAt ? (
                              <div className="flex flex-col">
                                <span
                                  className={
                                    expired
                                      ? "text-red-600 dark:text-red-400 font-bold"
                                      : "text-gray-600 dark:text-gray-400 font-medium"
                                  }
                                >
                                  {formatDate(notification.expiresAt)}
                                </span>
                                {expired && (
                                  <span className="text-xs text-red-500 dark:text-red-400 mt-0.5 font-semibold">
                                    ⏱️ (Expired)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic font-medium">
                                Never
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-500" />
                              <span className="font-bold text-gray-900 dark:text-white">
                                {notification?.dismissedCount || 0}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full ${
                                expired
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : notification.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 animate-pulse"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {expired ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  Expired
                                </>
                              ) : notification.isActive ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Power className="w-3.5 h-3.5" />
                                  Inactive
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            {!expired && notification.isActive ? (
                              <button
                                onClick={() =>
                                  handleDeactivate(notification._id)
                                }
                                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
                              >
                                <Power className="w-4 h-4" />
                                Deactivate
                              </button>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 italic font-medium">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistory;
