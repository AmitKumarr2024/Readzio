import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import {
  deleteSubscriptionPlan,
  fetchSubscriptionPlansByAuthor,
  updateSubscriptionPlan,
} from "../../../../store/subscriptionSlice";
import Pagination from "../../../../Utils/Pagination";
import toast from "react-hot-toast";
import ConfirmModal from "../../../../Utils/ConfirmModal";
import { paiseToRupees } from "../../../../Utils/currency";

const PlansAnalytics = ({
  userId,
  plans = [],
  analytics = {},
  setUpdatePlan,
}) => {
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const plansPerPage = 10;

  const refreshPlans = () => {
    dispatch(fetchSubscriptionPlansByAuthor(userId)).catch(() => {});
  };

  const handleDeletePlan = async (planId) => {
    try {
      await dispatch(deleteSubscriptionPlan(planId)).unwrap();
      refreshPlans();
      toast.success("Plan deleted successfully");
    } catch (err) {
      setErrorMessage(err?.message || "Failed to delete plan.");
      toast.error(err?.message || "Failed to delete plan.");
    } finally {
      setIsModalOpen(false);
      setSelectedPlanId(null);
    }
  };

  const handleActivatePlan = async (plan) => {
    try {
      const updatedPlan = { ...plan, status: "active" };
      await dispatch(
        updateSubscriptionPlan({ planId: plan._id, planData: updatedPlan })
      ).unwrap();
      toast.success("Plan activated");
      refreshPlans();
    } catch (err) {
      toast.error(err?.message || "Failed to activate plan.");
    }
  };

  const formatINR = (amount) => {
    const safeAmount = Number(amount) || 0;
    return `₹${paiseToRupees(safeAmount)}`;
  };

  const formatStatus = (plan) => {
    if (plan.deletedAt) return "Deleted";
    const statusMap = {
      active: "Active",
      pending: "Pending Approval",
      not_confirmed: "Draft",
    };
    return statusMap[plan.status] || "Unknown";
  };

  const getStatusColor = (plan) => {
    if (plan.deletedAt) return "text-red-600";
    if (plan.status === "active") return "text-green-600";
    if (plan.status === "pending") return "text-yellow-600";
    return "text-gray-600";
  };

  const getRowBackground = (plan, index) => {
    if (plan.status !== "active" || plan.deletedAt) return "bg-yellow-100";
    return index % 2 === 0 ? "bg-white" : "bg-gray-50";
  };

  const rowVariants = {
    warning: {
      opacity: [1, 0.7, 1],
      transition: {
        opacity: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
      },
    },
    static: { opacity: 1 },
  };

  const filteredPlans = plans
    .filter(
      (plan) =>
        String(plan.author) === String(userId) &&
        plan.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "name-asc")
        return (a.name || "").localeCompare(b.name || "");
      if (sortOption === "name-desc")
        return (b.name || "").localeCompare(a.name || "");
      if (sortOption === "price-asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sortOption === "price-desc") return (b.price ?? 0) - (a.price ?? 0);
      return 0;
    });

  const totalPages = Math.ceil(filteredPlans.length / plansPerPage);
  const currentPlans = filteredPlans.slice(
    (currentPage - 1) * plansPerPage,
    currentPage * plansPerPage
  );

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl rounded-3xl p-8 mb-8 max-w-8xl mx-auto border border-gray-100">
      <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark mb-3 text-center bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Plans Analytics
      </h2>

      {errorMessage && (
        <div className="bg-background-light dark:bg-background-dark  text-red-600 px-6 py-4 rounded-lg mb-6 font-medium text-center">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search plans by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-lg w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-300 hover:shadow-sm"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="text-lg w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-300 hover:shadow-sm"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
        </select>
      </div>

      <div className="overflow-x-auto bg-background-light dark:bg-background-dark  rounded-lg shadow-sm">
        <table className="w-full text-sm text-center  text-text-main-light dark:text-text-main-dark border border-gray-200">
          <thead className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-semibold">
            <tr>
              <th className="px-6 py-4">Plan Title</th>
              <th className="px-6 py-4">Price (₹)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Total Subscribers</th>
              <th className="px-6 py-4">Active Subscribers</th>
              <th className="px-6 py-4">Total Revenue (₹)</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPlans.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-10  text-text-main-light dark:text-text-main-dark font-medium"
                >
                  No plans found
                </td>
              </tr>
            ) : (
              currentPlans.map((plan, index) => {
                const stats = analytics[plan._id] || {
                  totalSubscribers: 0,
                  activeSubscribers: 0,
                  totalRevenue: 0,
                };

                return (
                  <motion.tr
                    key={plan._id}
                    className={`border-t ${getRowBackground(
                      plan,
                      index
                    )} group bg-background-light dark:bg-background-dark  hover:bg-amber-100 hover:text-gray-600 transition-colors duration-200`}
                    variants={rowVariants}
                    animate={
                      plan.status !== "active" || plan.deletedAt
                        ? "warning"
                        : "static"
                    }
                  >
                    <td className="px-6 py-4 font-medium">{plan.name}</td>
                    <td className="px-6 py-4">{formatINR(plan.price)}</td>
                    <td
                      className={`px-6 py-4 font-semibold ${getStatusColor(
                        plan
                      )}`}
                    >
                      {formatStatus(plan)}
                      {plan.status !== "active" && !plan.deletedAt && (
                        <span className="ml-2 inline-block bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded animate-pulse">
                          Needs Activation
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{stats.totalSubscribers}</td>
                    <td className="px-6 py-4">{stats.activeSubscribers}</td>
                    <td className="px-6 py-4">
                      {formatINR(stats.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 space-y-2 space-x-2">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => setUpdatePlan(plan)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                        >
                          Edit
                        </button>
                        {!plan.deletedAt && (
                          <button
                            onClick={() => {
                              setSelectedPlanId(plan._id);
                              setIsModalOpen(true);
                            }}
                            className="bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105"
                          >
                            Delete
                          </button>
                        )}
                        {plan.status !== "active" && !plan.deletedAt && (
                          <button
                            onClick={() => handleActivatePlan(plan)}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlanId(null);
        }}
        onConfirm={() => handleDeletePlan(selectedPlanId)}
        title="Confirm Plan Deletion"
        message="This will permanently delete the plan. This action cannot be undone. Are you sure?"
        confirmLabel="Yes, Delete"
        className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-3xl shadow-2xl border border-gray-100"
        confirmButtonClass="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-full hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105"
        cancelButtonClass="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-2 rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
      />
    </div>
  );
};

export default PlansAnalytics;
