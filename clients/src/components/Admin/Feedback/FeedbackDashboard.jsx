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
    dispatch(getAllUsers({ page: 1, limit: 100 })); // Adjusted to fetch reasonable number of users
  }, [dispatch]);

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">Feedback Management</h1>
      <div className="tabs tabs-boxed mb-6 flex justify-center">
        <button
          className={`tab tab-lg font-semibold px-6 py-3 rounded-l-lg transition-colors ${
            activeTab === "feedback"
              ? "tab-active bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
          onClick={() => setActiveTab("feedback")}
        >
          Feedback List
        </button>
        <button
          className={`tab tab-lg font-semibold px-6 py-3 rounded-r-lg transition-colors ${
            activeTab === "prompts"
              ? "tab-active bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
          onClick={() => setActiveTab("prompts")}
        >
          Send Feedback Prompts
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {activeTab === "feedback" && (
          <FeedbackTable
            feedbackList={list}
            loading={loadingList}
            error={errorList}
          />
        )}
        {activeTab === "prompts" && (
          <UserFeedbackPrompt users={users} loading={loading} error={error} />
        )}
      </div>
    </div>
  );
};

export default FeedbackDashboard;