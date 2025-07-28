// Component: Form to update global subscription eligibility criteria
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateGlobalEligibilityCriteria } from "../../../store/adminSlice";
import {toast} from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";

// Component to manage subscription eligibility criteria
const CriteriaForm = () => {
  // Initialize Redux dispatch
  const dispatch = useDispatch();
  // Select subscription criteria and loading state from Redux store
  const { subscriptionCriteria, subscriptionLoading } = useSelector(
    (state) => state.admin
  );
  // State: Manage form inputs and validation errors
  const [criteriaForm, setCriteriaForm] = useState({
    minFollowers: 10000,
    minPosts: 30,
    minEngagementRate: 0.05,
    minAccountAgeDays: 30,
  });
  const [errors, setErrors] = useState({});

  // Effect: Sync form state with Redux subscriptionCriteria
  useEffect(() => {
    if (subscriptionCriteria) {
      setCriteriaForm({
        minFollowers: subscriptionCriteria.minFollowers ?? 10000,
        minPosts: subscriptionCriteria.minPosts ?? 30,
        minEngagementRate: subscriptionCriteria.minEngagementRate ?? 0.05,
        minAccountAgeDays: subscriptionCriteria.minAccountAgeDays ?? 30,
      });
    }
  }, [subscriptionCriteria]);

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (criteriaForm.minFollowers < 0)
      newErrors.minFollowers = "Minimum followers cannot be negative";
    if (criteriaForm.minPosts < 0)
      newErrors.minPosts = "Minimum posts cannot be negative";
    if (
      criteriaForm.minEngagementRate < 0 ||
      criteriaForm.minEngagementRate > 1
    )
      newErrors.minEngagementRate = "Engagement rate must be between 0 and 100%";
    if (criteriaForm.minAccountAgeDays < 0)
      newErrors.minAccountAgeDays = "Account age cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission to update criteria
  const handleUpdateCriteria = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    dispatch(updateGlobalEligibilityCriteria(criteriaForm))
      .unwrap()
      .then(() => toast.success("Criteria updated successfully"))
      .catch((err) => toast.error(err.message));
  };

  // Reset form to current Redux criteria
  const handleReset = () => {
    if (subscriptionCriteria) {
      setCriteriaForm({
        minFollowers: subscriptionCriteria.minFollowers ?? 10000,
        minPosts: subscriptionCriteria.minPosts ?? 30,
        minEngagementRate: subscriptionCriteria.minEngagementRate ?? 0.05,
        minAccountAgeDays: subscriptionCriteria.minAccountAgeDays ?? 30,
      });
    }
    setErrors({});
    toast.success("Form reset to current criteria");
  };

  // Render: Form for updating eligibility criteria
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
        Global Eligibility Criteria
      </h2>
      <form
        onSubmit={handleUpdateCriteria}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Followers
          </label>
          <input
            type="number"
            value={criteriaForm.minFollowers}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minFollowers: parseInt(e.target.value) || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.minFollowers ? "border-red-500" : ""
            }`}
            min="0"
          />
          {errors.minFollowers && (
            <p className="text-red-500 text-xs mt-1">{errors.minFollowers}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Posts
          </label>
          <input
            type="number"
            value={criteriaForm.minPosts}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minPosts: parseInt(e.target.value) || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.minPosts ? "border-red-500" : ""
            }`}
            min="0"
          />
          {errors.minPosts && (
            <p className="text-red-500 text-xs mt-1">{errors.minPosts}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Engagement Rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={criteriaForm.minEngagementRate * 100}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minEngagementRate: parseFloat(e.target.value) / 100 || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.minEngagementRate ? "border-red-500" : ""
            }`}
            min="0"
            max="100"
          />
          {errors.minEngagementRate && (
            <p className="text-red-500 text-xs mt-1">{errors.minEngagementRate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Account Age (Days)
          </label>
          <input
            type="number"
            value={criteriaForm.minAccountAgeDays}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minAccountAgeDays: parseInt(e.target.value) || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.minAccountAgeDays ? "border-red-500" : ""
            }`}
            min="0"
          />
          {errors.minAccountAgeDays && (
            <p className="text-red-500 text-xs mt-1">{errors.minAccountAgeDays}</p>
          )}
        </div>
        <div className="sm:col-span-2 flex space-x-4">
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition flex items-center justify-center"
            disabled={subscriptionLoading}
          >
            {subscriptionLoading ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : null}
            Update Criteria
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default CriteriaForm;