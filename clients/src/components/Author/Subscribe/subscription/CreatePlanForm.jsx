import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createSubscriptionPlan,
  fetchSubscriptionPlansByAuthor,
  activateSubscriptionPlan,
} from "../../../../store/subscriptionSlice";
import {toast} from "react-hot-toast";
import PriceConfirmModal from "../../../../Utils/PriceConfirmModal";
import Pagination from "../../../../Utils/Pagination";
import {
  rupeesToPaisa,
  formatINRFromRupees,
} from "../../../../Utils/priceUtils";

// Form component for creating new subscription plans
const CreatePlanForm = ({ userId, posts }) => {
  const dispatch = useDispatch();
  const { plans, error } = useSelector((state) => state.subscription);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    postIds: [],
    durationDays: [],
    type: "custom",
    authorId: userId,
  });
  const [searchTerm, setSearchTerm] = useState(""); // Search term for filtering posts
  const [sortOption, setSortOption] = useState("title-asc"); // Sorting option for posts
  const [currentPage, setCurrentPage] = useState(1); // Current pagination page
  const [isPriceModalVisible, setIsPriceModalVisible] = useState(false); // Price confirmation modal visibility
  const postsPerPage = 5; // Number of posts per page

  // Track used durations and calculate remaining plan slots
  const usedDurations = plans
    .filter((plan) => !plan.deletedAt)
    .map((plan) => plan.durationDays);
  const maxPlans = 3; // Maximum allowed plans
  const remainingPlanSlots = maxPlans - usedDurations.length;
  const availableDurations =
    remainingPlanSlots > 0
      ? [30, 90, 365].filter((duration) => !usedDurations.includes(duration))
      : [];

  // Handle input changes for form fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle duration selection
  const handleDurationChange = (e) => {
    const value = Number(e.target.value);
    setFormData((prev) => {
      const newDurations = prev.durationDays.includes(value)
        ? prev.durationDays.filter((d) => d !== value)
        : [...prev.durationDays, value];
      if (newDurations.length > remainingPlanSlots) {
        toast.error(`Only ${remainingPlanSlots} more plan(s) can be created.`);
        return prev;
      }
      return { ...prev, durationDays: newDurations };
    });
  };

  // Handle post selection
  const handlePostChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const newPostIds = checked
        ? [...prev.postIds, value]
        : prev.postIds.filter((id) => id !== value);
      return { ...prev, postIds: newPostIds };
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.price ||
      formData.durationDays.length === 0
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (formData.price <= 0) {
      toast.error("Price must be positive");
      return;
    }
    if (usedDurations.length + formData.durationDays.length > maxPlans) {
      toast.error(
        `Maximum ${maxPlans} plans allowed. Delete existing plans to create new ones.`
      );
      return;
    }
    setIsPriceModalVisible(true);
  };

  // Confirm and create plans
  const handlePriceConfirm = async () => {
    try {
      for (const duration of formData.durationDays) {
        const planData = {
          ...formData,
          durationDays: duration,
          price: rupeesToPaisa(formData.price),
          status: "pending",
          deletedAt: null,
        };
        await dispatch(createSubscriptionPlan(planData)).unwrap();
      }
      toast.success("Plan(s) created and awaiting activation");
      await dispatch(fetchSubscriptionPlansByAuthor(userId));
      setFormData({
        name: "",
        description: "",
        price: "",
        postIds: [],
        durationDays: [],
        type: "custom",
        authorId: userId,
      });
    } catch (err) {
      toast.error(err?.message || "Failed to create plan");
    } finally {
      setIsPriceModalVisible(false);
    }
  };

  // Activate a pending plan
  const handleActivatePlan = async (planId) => {
    try {
      await dispatch(activateSubscriptionPlan(planId)).unwrap();
      toast.success("Plan activated successfully");
      await dispatch(fetchSubscriptionPlansByAuthor(userId));
    } catch (err) {
      if (err.includes("Maximum 3 plans allowed")) {
        toast.error(
          "Cannot activate: Maximum 3 plans allowed. Delete an existing plan to activate this one."
        );
      } else {
        toast.error(err || "Failed to activate plan");
      }
    }
  };

  // Filter and sort posts for selection
  const filteredPosts = posts
    .filter((post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "title-asc") {
        return a.title.localeCompare(b.title);
      } else if (sortOption === "title-desc") {
        return b.title.localeCompare(a.title);
      } else if (sortOption === "date-asc") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortOption === "date-desc") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

  const totalPosts = filteredPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = filteredPosts.slice(
    startIndex,
    startIndex + postsPerPage
  );

  // Handle pagination page change
  const handlePageChange = (pageIndex) => {
    if (pageIndex >= 1 && pageIndex <= totalPages) {
      setCurrentPage(pageIndex);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl rounded-3xl p-10 mb-8 max-w-6xl mx-auto border border-gray-100">
      <h2 className="text-3xl font-extrabold text-text-main-light dark:text-text-main-dark mb-8 text-center bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Create Subscription Plan
      </h2>

      {remainingPlanSlots <= 0 && (
        <p className="text-red-600 bg-background-light dark:bg-background-dark p-4 rounded-lg text-center mb-6 font-medium shadow-sm">
          Maximum {maxPlans} plans allowed. Please delete an existing plan from
          the Analytics tab to create or activate a new one.
        </p>
      )}

      {remainingPlanSlots > 0 && (
        <p className="text-sm text-text-main-light dark:text-text-main-dark mb-6 text-center">
          You can create {remainingPlanSlots} more plan(s).
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Plan Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="Describe your plan (optional)"
            rows="4"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Price (₹)
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="e.g., ₹26.00"
            min="0.01"
            step="0.01"
            required
          />
          <p className="text-sm text-text-main-light dark:text-text-main-dark mt-2">
            Entered price:{" "}
            <span className="text-blue-600 font-semibold">
            ₹{formatINRFromRupees(formData.price)}
            </span>
          </p>
          <p className="text-sm text-text-main-light dark:text-text-main-dark mt-2">
            After deductions:{" "}
            <span className="text-blue-600 font-semibold">
              Razorpay Fee (2%): ₹{((formData.price || 0) * 0.02).toFixed(2)} |
              Platform Fee (20%): ₹{((formData.price || 0) * 0.2).toFixed(2)} |
              Net: ₹{((formData.price || 0) * (1 - 0.22)).toFixed(2)}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Duration (Days)
          </label>
          <div className="space-y-2">
            {availableDurations.length === 0 ? (
              <p className="text-red-600">
                No more plans can be created (limit reached or all durations
                used).
              </p>
            ) : (
              availableDurations.map((duration) => (
                <div key={duration} className="flex items-center">
                  <input
                    type="checkbox"
                    value={duration}
                    checked={formData.durationDays.includes(duration)}
                    onChange={handleDurationChange}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    disabled={
                      formData.durationDays.length >= remainingPlanSlots &&
                      !formData.durationDays.includes(duration)
                    }
                  />
                  <label className="ml-3 text-sm font-medium text-text-main-light dark:text-text-main-dark">
                    {duration === 30
                      ? "Monthly (30 days)"
                      : duration === 90
                      ? "Quarterly (90 days)"
                      : "Yearly (365 days)"}
                  </label>
                </div>
              ))
            )}
          </div>
          {availableDurations.length > 0 && (
            <p className="text-sm text-text-main-light dark:text-text-main-dark mt-2">
              Select up to {remainingPlanSlots} duration(s).
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Posts (Optional)
          </label>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
              />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
              >
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="date-desc">Date (Newest)</option>
              </select>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-background-light dark:bg-background-dark shadow-sm">
              {paginatedPosts.length === 0 ? (
                <p className="text-text-main-light dark:text-text-main-dark text-center font-medium">
                  No posts found
                </p>
              ) : (
                paginatedPosts.map((post) => (
                  <div key={post._id} className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      value={post._id}
                      checked={formData.postIds.includes(post._id)}
                      onChange={handlePostChange}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <label className="ml-3 text-sm font-medium text-text-main-light dark:text-text-main-dark">
                      {post.title}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-sm text-text-main-light dark:text-text-main-dark mt-2">
              {formData.postIds.length} post(s) selected
            </p>
            {totalPosts > postsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Plan Type
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
          >
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={availableDurations.length === 0}
        >
          Create Plan
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-4">
          Existing Plans
        </h3>
        {plans.length === 0 ? (
          <p className="text-text-main-light dark:text-text-main-dark">
            No plans created yet.
          </p>
        ) : (
          <div className="space-y-4">
            {plans
              .filter((plan) => !plan.deletedAt)
              .map((plan) => (
                <div
                  key={plan._id}
                  className="flex justify-between items-center p-4 bg-background-light dark:bg-background-dark border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-sm">
                      Duration: {plan.durationDays} days | Status: {plan.status}
                    </p>
                  </div>
                  {plan.status !== "active" && plan.status !== "deleted" && (
                    <button
                      onClick={() => handleActivatePlan(plan._id)}
                      className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        remainingPlanSlots <= 0 && plan.status !== "active"
                      }
                    >
                      Activate
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <PriceConfirmModal
        isOpen={isPriceModalVisible}
        onClose={() => setIsPriceModalVisible(false)}
        onConfirm={handlePriceConfirm}
        price={Number(formData.price) || 0}
      />
    </div>
  );
};

export default CreatePlanForm;