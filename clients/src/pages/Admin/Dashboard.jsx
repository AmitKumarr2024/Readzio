import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { clearError, downloadAllDataCsv } from "../../store/adminSlice";
import {
  fetchNotifications,
  markAllAsRead,
} from "../../store/notificationSlice";
import { initializeSocket, disconnectSocket } from "../../store/socketSlice";
import ContactMessages from "./ContactMessages";
import Reports from "./Reports";
import ReportAcknowledgments from "./ReportAcknowledgments";
import UserManagement from "../../components/Admin/UserManagement";
import PostManagement from "../../components/Admin/Post/PostManagement";
import AdminMessageDashboard from "../../components/Admin/AdminMessageDashboard/AdminMessageDashboard";
import PaymentDashboard from "../../components/Admin/PaymentDashbord/PaymentDashboard";
import Insights from "../../components/Admin/Analytics/Insights";
import AdminEmailDashboard from "../../components/Admin/Email/AdminEmailDashboard";
import NotificationManager from "../../components/Admin/BannerNotification/NotificationManager";
import { Bell, X, Download } from "lucide-react";
import AdminSubscriptionControls from "../../components/Admin/subscriptionControl/AdminSubscriptionControls";
import AdsDashboard from "../../components/Admin/Ads/AdsDashboard";
import FeedbackDashboard from "../../components/Admin/Feedback/FeedbackDashboard";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p>{this.state.error?.message || "An unexpected error occurred"}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  const { loading, error } = useSelector((state) => state.admin || {});
  const { notifications, unreadCount } = useSelector(
    (state) => state.notifications || {}
  );
  const socketState = useSelector((state) => state.socket || {});
  const [activeTab, setActiveTab] = useState("analytics");

  useEffect(() => {
    if (user?.role === "admin") {
      dispatch(initializeSocket());
      dispatch(fetchNotifications());
    }
    return () => {
      dispatch(disconnectSocket());
    };
  }, [dispatch, user]);

  const handleMarkAllNotificationsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleDownloadExcel = () => {
    dispatch(downloadAllDataCsv());
  };

  const tabs = [
    { id: "analytics", label: "Analytics" },
    { id: "users", label: "Users" },
    { id: "posts", label: "Posts" },
    { id: "contacts", label: "Contact Messages" },
    { id: "reports", label: "Reports" },
    { id: "acknowledgments", label: "Acknowledgments" },
    { id: "notifications", label: "Send Notifications" },
    { id: "payments", label: "Payments" },
    { id: "email-status", label: "Email Status" },
    { id: "banner-notifications", label: "Banner Notifications" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "ads-dashboard", label: "Ads Dashboard" },
    { id: "feedback", label: "User Feedback" },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto bg-background-light dark:bg-background-dark rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-gray-700"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main-light dark:text-text-main-dark">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`font-medium ${
                  socketState.status === "connected"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                Socket:{" "}
                {socketState.status === "connected"
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>
            <div className="relative flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-text-main-light dark:text-text-main-dark">
                Notifications: {unreadCount}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                >
                  Mark All Read
                </button>
              )}
            </div>
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Excel
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-xl flex justify-between items-center"
          >
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="text-red-900 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-text-main-light dark:text-text-main-dark shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-4">
            <span className="text-text-main-light dark:text-text-main-dark">
              Loading...
            </span>
          </div>
        )}

        <ErrorBoundary>
          {activeTab === "analytics" && <Insights />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "posts" && <PostManagement />}
          {activeTab === "contacts" && <ContactMessages />}
          {activeTab === "reports" && <Reports />}
          {activeTab === "acknowledgments" && <ReportAcknowledgments />}
          {activeTab === "notifications" && <AdminMessageDashboard />}
          {activeTab === "payments" && <PaymentDashboard />}
          {activeTab === "email-status" && <AdminEmailDashboard />}
          {activeTab === "banner-notifications" && <NotificationManager />}
          {activeTab === "subscriptions" && (
            <AdminSubscriptionControls userId={user?._id} user={user} />
          )}
          {activeTab === "ads-dashboard" && <AdsDashboard />}
          {activeTab === "feedback" && <FeedbackDashboard />}
        </ErrorBoundary>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
