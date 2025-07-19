// Component: Main interface for subscription management
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import CriteriaForm from "./CriteriaForm";
import PlansTable from "./PlansTable";
import DownloadButton from "./DownloadButton";
import { getAllSubscriptionPlans } from "../../../store/adminSlice";
import { FaExclamationCircle } from "react-icons/fa";

// Component to manage subscription plans and criteria
const AdminSubscriptionControls = ({ userId, user }) => {
  // Initialize Redux dispatch
  const dispatch = useDispatch();
  // Select subscription-related state from Redux store
  const { subscriptionLoading, subscriptionError, userEligibilityLoading } = useSelector(
    (state) => state.admin
  );

  // Effect: Fetch all subscription plans on mount
  useEffect(() => {
    dispatch(getAllSubscriptionPlans());
  }, [dispatch]);

  // Render: Loading state
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

  // Render: Error state
  if (subscriptionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-red-600">
        <FaExclamationCircle className="w-8 h-8 mr-4" />
        <span className="text-xl font-medium">{subscriptionError}</span>
      </div>
    );
  }

  // Render: Subscription management interface
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Subscription Management
        </h1>
        <CriteriaForm />
        <PlansTable />
        <DownloadButton />
      </div>
    </div>
  );
};

export default AdminSubscriptionControls;