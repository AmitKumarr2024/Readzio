// Component: Table to display and manage subscription plans
import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  getAllSubscriptionPlans,
  toggleSubscriptionPlanStatus,
  updateSubscriptionPlanStatus,
} from "../../../store/adminSlice";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import {toast} from "react-hot-toast";

// Component to display and manage subscription plans with infinite scroll
const PlansTable = () => {
  // Initialize Redux dispatch
  const dispatch = useDispatch();
  // Select subscription plans and related state from Redux store
  const { plans, subscriptionLoading, currentPage, hasMore } = useSelector(
    (state) => state.admin
  );

  // State: Manage pagination
  const [page, setPage] = useState(1);
  const observerRef = useRef();

  // Load more plans when reaching the bottom of the table
  const loadMorePlans = () => {
    if (!subscriptionLoading && hasMore) {
      dispatch(getAllSubscriptionPlans({ page, limit: 10 }))
        .unwrap()
        .then((response) => {
          if (response.plans.length < 10) setPage((prev) => prev + 1);
        })
        .catch((err) => toast.error(err.message));
    }
  };

  // Effect: Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMorePlans();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, subscriptionLoading]);

  // Handle toggling plan status (active/suspended)
  const handleTogglePlanStatus = (planId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    dispatch(toggleSubscriptionPlanStatus({ planId, status: newStatus }))
      .unwrap()
      .then(() => {
        dispatch(updateSubscriptionPlanStatus({ planId, status: newStatus }));
        toast.success(`Plan ${newStatus}`);
      })
      .catch((err) => toast.error(err.message));
  };

  // Render: Subscription plans table
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
        Subscription Plans
      </h2>
      {plans.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">No plans available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subscribers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {plans.map((plan) => (
                <tr
                  key={plan._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {plan.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    ${(plan.price / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {plan.author?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {plan.activeSubscribers || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    ${(plan.totalRevenue || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {plan.status === "active" ? (
                      <FaCheckCircle className="inline w-5 h-5 text-green-600" />
                    ) : (
                      <FaTimesCircle className="inline w-5 h-5 text-red-600" />
                    )}
                    <span className="ml-2">{plan.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() =>
                        handleTogglePlanStatus(plan._id, plan.status)
                      }
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                      disabled={subscriptionLoading}
                    >
                      {plan.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            ref={observerRef}
            className="h-10 flex items-center justify-center"
          >
            {hasMore && !subscriptionLoading && (
              <div className="animate-pulse text-gray-600 dark:text-gray-300">
                Loading more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansTable;