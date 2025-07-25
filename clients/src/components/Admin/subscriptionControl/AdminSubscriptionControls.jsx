// File: AdminSubscriptionControls.jsx
import React, { useEffect, useState, Suspense, lazy } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getAllSubscriptionPlans, getAllUsers } from "../../../store/adminSlice";
import { FaExclamationCircle } from "react-icons/fa";

const CriteriaForm = lazy(() => import("./CriteriaForm"));
const PlansTable = lazy(() => import("./PlansTable"));
const DownloadButton = lazy(() => import("./DownloadButton"));
const UserMilestoneManager = lazy(() => import("./UserMilestoneManager"));

const AdminSubscriptionControls = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("plans");

  const {
    subscriptionLoading,
    subscriptionError,
    userEligibilityLoading,
    users = [],
  } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(getAllSubscriptionPlans());
    dispatch(getAllUsers());
  }, [dispatch]);

  if (subscriptionLoading || userEligibilityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="rounded-full bg-indigo-600 h-12 w-12"></div>
          <div className="text-xl font-medium text-gray-600 dark:text-gray-300">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-red-600">
        <FaExclamationCircle className="w-8 h-8 mr-4" />
        <span className="text-xl font-medium">{subscriptionError}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Subscription Management
        </h1>

        <div className="flex space-x-4">
          <button
            onClick={() => setTab("plans")}
            className={`px-4 py-2 rounded font-medium ${
              tab === "plans"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 rounded font-medium ${
              tab === "users"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            }`}
          >
            Users
          </button>
        </div>

        <Suspense fallback={<div className="text-gray-600 dark:text-gray-300">Loading tab...</div>}>
          {tab === "plans" && (
            <>
              <CriteriaForm />
              <PlansTable />
              <DownloadButton />
            </>
          )}

          {tab === "users" && <UserMilestoneManager users={users} />}
        </Suspense>
      </div>
    </div>
  );
};

export default AdminSubscriptionControls;