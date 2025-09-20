import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FaEnvelope,
  FaHistory,
  FaPaperPlane,
  FaTrash,
  FaChartLine,
  FaUsers,
  FaExclamationTriangle,
} from "react-icons/fa";
import { checkAuth } from "../../../store/authSlice";
import EmailStatusBulletin from "./EmailStatusBulletin";
import { EnhancedManualEmailSender } from "./EnhancedManualEmailSender";
import { EnhancedDailyPostDetails } from "./EnhancedDailyPostDetails";
import { EnhancedNotificationManager } from "./EnhancedNotificationManager";

export default function EnhancedAdminEmailDashboard() {
  const dispatch = useDispatch();
  const {
    role,
    isAuthenticated,
    loading: authLoading,
    error: authError,
  } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("sender");

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(checkAuth());
    }
  }, [dispatch, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-600">
          <FaExclamationTriangle className="text-4xl mx-auto mb-4" />
          <p>Authentication Error: {authError}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            This area is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "sender",
      label: "Email Sender",
      icon: FaPaperPlane,
      color: "from-blue-600 to-purple-600",
      description: "Send daily emails with advanced options",
    },
    {
      id: "analytics",
      label: "Email Analytics",
      icon: FaChartLine,
      color: "from-purple-600 to-pink-600",
      description: "View detailed email reports and statistics",
    },
    {
      id: "status",
      label: "Status Monitor",
      icon: FaHistory,
      color: "from-green-600 to-blue-600",
      description: "Monitor email delivery status",
    },
    {
      id: "notifications",
      label: "Cleanup Tools",
      icon: FaTrash,
      color: "from-red-600 to-orange-600",
      description: "System maintenance and cleanup",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaEnvelope className="text-2xl text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                Email Management Center
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Advanced email system administration and monitoring
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-6 rounded-2xl shadow-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white border-transparent shadow-xl`
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <tab.icon
                  className={`text-3xl mb-3 ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                />
                <h3 className="font-semibold text-lg mb-2">{tab.label}</h3>
                <p
                  className={`text-sm ${
                    activeTab === tab.id
                      ? "text-white/80"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {tab.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {activeTab === "sender" && <EnhancedManualEmailSender />}
          {activeTab === "analytics" && <EnhancedDailyPostDetails />}
          {activeTab === "status" && <EmailStatusBulletin />}
          {activeTab === "notifications" && <EnhancedNotificationManager />}
        </div>
      </div>
    </div>
  );
}
