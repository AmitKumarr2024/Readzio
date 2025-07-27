import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUserFeedback, getAllUsers } from "../../../store/userSlice";
import FeedbackTable from "./FeedbackTable";
import UserFeedbackPrompt from "./UserFeedbackPrompt";

const FeedbackDashboard = () => {
  const dispatch = useDispatch();
  const { list, loadingList, errorList } = useSelector((state) => state.user.feedback);
  const { users, loading, error } = useSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState("feedback");

  useEffect(() => {
    dispatch(fetchAllUserFeedback());
    dispatch(getAllUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  return (
    <div className="min-h-screen p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Feedback Management
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === "feedback"
                  ? "bg-blue-600 text-white"
                  : "bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => setActiveTab("feedback")}
            >
              Feedback List
            </button>
            <button
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === "prompts"
                  ? "bg-blue-600 text-white"
                  : "bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => setActiveTab("prompts")}
            >
              Send Prompts
            </button>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          {activeTab === "feedback" ? (
            <FeedbackTable
              feedbackList={list}
              loading={loadingList}
              error={errorList}
            />
          ) : (
            <UserFeedbackPrompt
              users={users}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDashboard;
