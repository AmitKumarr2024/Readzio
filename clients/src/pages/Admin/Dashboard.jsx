import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { clearError } from "../../store/adminSlice";
import {
  fetchNotifications,
  markAllAsRead,
} from "../../store/notificationSlice";
import { initializeSocket, disconnectSocket } from "../../store/socketSlice";
import ContactMessages from "./ContactMessages";
import Reports from "./Reports";
import ReportAcknowledgments from "./ReportAcknowledgments";
import UserManagement from "../../components/Admin/UserManagement";
import PostManagement from "../../components/Admin/PostManagement";
import AdminMessageDashboard from "../../components/Admin/AdminMessageDashboard/AdminMessageDashboard";
import PaymentDashboard from "../../components/Admin/PaymentDashbord/PaymentDashboard";
import Analytics from "../../components/Admin/Analytics/Analytics";
import { Bell, Search, X } from "lucide-react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl shadow-sm">
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
  const [searchQuery, setSearchQuery] = useState("");
  const isConnected = socketState?.status === "connected";

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

  const tabs = [
    { id: "analytics", label: "Analytics" },
    { id: "users", label: "Users" },
    { id: "posts", label: "Posts" },
    { id: "contacts", label: "Contact Messages" },
    { id: "reports", label: "Reports" },
    { id: "acknowledgments", label: "Acknowledgments" },
    { id: "notifications", label: "Send Notifications" },
    { id: "payments", label: "Payments" },
    { id: "ads", label: "Ads" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}>
                Socket: {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="relative flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">
                Notifications: {unreadCount}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 transition"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex justify-between items-center"
          >
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="text-red-900 font-semibold hover:text-red-700 transition"
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
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-4">
            <span className="text-gray-500">Loading...</span>
          </div>
        )}

        <div className="mt-4">
          {activeTab === "analytics" && <Analytics />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "posts" && <PostManagement />}
          {activeTab === "contacts" && <ContactMessages />}
          {activeTab === "reports" && <Reports />}
          {activeTab === "acknowledgments" && <ReportAcknowledgments />}
          {activeTab === "notifications" && <AdminMessageDashboard />}
          {activeTab === "payments" && <PaymentDashboard />}
         
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;