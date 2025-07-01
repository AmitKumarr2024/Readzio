import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMySubscribedPlans,
  cancelSubscription,
} from "../../../../store/subscriptionSlice";

const SubscribedPlansTable = () => {
  const dispatch = useDispatch();
  const { subscribedPlans, loading, error, hasFetchedSubscribedPlans } = useSelector(
    (state) => state.subscription
  );
  const [showConfirm, setShowConfirm] = useState(null);

  useEffect(() => {
    if (!hasFetchedSubscribedPlans) {
      dispatch(fetchMySubscribedPlans());
    }
  }, [dispatch, hasFetchedSubscribedPlans]);

  const handleCancel = (subscriptionId) => {
    setShowConfirm(subscriptionId);
  };

  const confirmCancel = async (subscriptionId) => {
    try {
      await dispatch(cancelSubscription(subscriptionId)).unwrap();
      dispatch(fetchMySubscribedPlans());
    } catch (err) {
      console.error("Cancellation failed:", err);
    } finally {
      setShowConfirm(null);
    }
  };

  if (loading)
    return (
      <p className="text-center text-text-main-light dark:text-text-main-dark">
        Loading purchased plans...
      </p>
    );
  if (error)
    return (
      <p className="text-center text-red-500 dark:text-red-400">
        Error: {error}
      </p>
    );

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <h2 className="text-xl font-semibold mb-4">Subscribed Plans</h2>
      {subscribedPlans.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          You haven't subscribed to any plans yet.
        </p>
      ) : (
        <table className="w-full table-auto border-collapse bg-white dark:bg-gray-800">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-left text-gray-700 dark:text-gray-200">
              <th className="p-2">Plan Name</th>
              <th className="p-2">Author</th>
              <th className="p-2">Price</th>
              <th className="p-2">Status</th>
              <th className="p-2">Expires</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {subscribedPlans.map((plan) => (
              <tr
                key={plan.subscriptionId}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="p-2">{plan.planName}</td>
                <td className="p-2">{plan.authorName || plan.authorId || "Unknown"}</td>
                <td className="p-2">₹{plan.price}</td>
                <td className="p-2 capitalize">{plan.status}</td>
                <td className="p-2">
                  {new Date(plan.expiresAt).toLocaleDateString("en-IN")}
                </td>
                <td className="p-2">
                  {plan.status === "active" ? (
                    <button
                      onClick={() => handleCancel(plan.subscriptionId)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 dark:hover:bg-red-700 transition"
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      N/A
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <p className="text-text-main-light dark:text-text-main-dark mb-4">
              Are you sure you want to cancel this subscription?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmCancel(showConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 dark:hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscribedPlansTable;