import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBannerNotifications } from "../../../store/adminSlice";
import CreateBannerForm from "./CreateBannerForm";
import NotificationHistory from "./NotificationHistory";
import LoadingBar from "../../../Utils/LoadingBar";

const NotificationManager = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { loading } = useSelector((state) => state.admin);
  const [activeTab, setActiveTab] = useState("create");

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      dispatch(fetchBannerNotifications());
    }
  }, [dispatch, isAuthenticated, user]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-8 transition-all duration-300">
      {/* Loading Bar */}
      <LoadingBar loading={loading} text="Fetching notifications..." />

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-300 dark:border-gray-600 mb-6">
        <button
          className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
            activeTab === "create"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
          onClick={() => setActiveTab("create")}
        >
          Create Banner
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
            activeTab === "history"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "create" && <CreateBannerForm />}
      {activeTab === "history" && <NotificationHistory />}
    </div>
  );
};

export default NotificationManager;