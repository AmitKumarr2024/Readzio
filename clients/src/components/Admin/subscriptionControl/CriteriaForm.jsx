import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateGlobalEligibilityCriteria } from "../../../store/adminSlice";
import { toast } from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";

const DEFAULT_CRITERIA = {
  minFollowers: 1000,
  minPosts: 30,
  minEngagementRate: 0.02, // stored as 0.02 (2%)
  minAccountAgeDays: 30,
};

const CriteriaForm = () => {
  const dispatch = useDispatch();
  const { subscriptionCriteria, subscriptionLoading } = useSelector(
    (state) => state.admin
  );

  const [criteriaForm, setCriteriaForm] = useState(DEFAULT_CRITERIA);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (subscriptionCriteria) {
      setCriteriaForm({
        minFollowers:
          subscriptionCriteria.minFollowers ?? DEFAULT_CRITERIA.minFollowers,
        minPosts: subscriptionCriteria.minPosts ?? DEFAULT_CRITERIA.minPosts,
        minEngagementRate:
          subscriptionCriteria.minEngagementRate ??
          DEFAULT_CRITERIA.minEngagementRate,
        minAccountAgeDays:
          subscriptionCriteria.minAccountAgeDays ??
          DEFAULT_CRITERIA.minAccountAgeDays,
      });
    }
  }, [subscriptionCriteria]);

  const validateForm = () => {
    const newErrors = {};
    if (criteriaForm.minFollowers < 0) {
      newErrors.minFollowers = "Minimum followers cannot be negative";
    }
    if (criteriaForm.minPosts < 0) {
      newErrors.minPosts = "Minimum posts cannot be negative";
    }
    if (
      criteriaForm.minEngagementRate < 0 ||
      criteriaForm.minEngagementRate > 1
    ) {
      newErrors.minEngagementRate =
        "Engagement rate must be between 0% and 100%";
    }
    if (criteriaForm.minAccountAgeDays < 0) {
      newErrors.minAccountAgeDays = "Account age cannot be negative";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleReset = () => {
    if (subscriptionCriteria) {
      setCriteriaForm({
        minFollowers:
          subscriptionCriteria.minFollowers ?? DEFAULT_CRITERIA.minFollowers,
        minPosts: subscriptionCriteria.minPosts ?? DEFAULT_CRITERIA.minPosts,
        minEngagementRate:
          subscriptionCriteria.minEngagementRate ??
          DEFAULT_CRITERIA.minEngagementRate,
        minAccountAgeDays:
          subscriptionCriteria.minAccountAgeDays ??
          DEFAULT_CRITERIA.minAccountAgeDays,
      });
    }
    setErrors({});
    toast.success("Form reset to current criteria");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
        Global Eligibility Criteria
      </h2>
      <form
        onSubmit={handleUpdateCriteria}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Min Followers */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Followers
          </label>
          <input
            type="number"
            min="0"
            value={criteriaForm.minFollowers}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minFollowers: parseInt(e.target.value) || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 ${
              errors.minFollowers ? "border-red-500" : ""
            }`}
          />
          {errors.minFollowers && (
            <p className="text-red-500 text-xs mt-1">{errors.minFollowers}</p>
          )}
        </div>

        {/* Min Posts */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Posts
          </label>
          <input
            type="number"
            min="0"
            value={criteriaForm.minPosts}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minPosts: parseInt(e.target.value) || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 ${
              errors.minPosts ? "border-red-500" : ""
            }`}
          />
          {errors.minPosts && (
            <p className="text-red-500 text-xs mt-1">{errors.minPosts}</p>
          )}
        </div>

        {/* Min Engagement Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Engagement Rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={Number((criteriaForm.minEngagementRate * 100).toFixed(2))}
            onChange={(e) => {
              const percent = parseFloat(e.target.value);
              setCriteriaForm({
                ...criteriaForm,
                minEngagementRate: isNaN(percent) ? 0 : percent / 100,
              });
            }}
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 ${
              errors.minEngagementRate ? "border-red-500" : ""
            }`}
          />
          {errors.minEngagementRate && (
            <p className="text-red-500 text-xs mt-1">
              {errors.minEngagementRate}
            </p>
          )}
        </div>

        {/* Min Account Age */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Min Account Age (Days)
          </label>
          <input
            type="number"
            min="0"
            value={criteriaForm.minAccountAgeDays}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                minAccountAgeDays: parseInt(e.target.value) || 0,
              })
            }
            className={`mt-1 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-200 ${
              errors.minAccountAgeDays ? "border-red-500" : ""
            }`}
          />
          {errors.minAccountAgeDays && (
            <p className="text-red-500 text-xs mt-1">
              {errors.minAccountAgeDays}
            </p>
          )}
        </div>

        {/* Submit + Reset */}
        <div className="sm:col-span-2 flex space-x-4">
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition flex items-center justify-center"
            disabled={subscriptionLoading}
          >
            {subscriptionLoading && <FaSpinner className="animate-spin mr-2" />}
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
