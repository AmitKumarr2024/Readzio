import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { updateSubscriptionPlan } from "../../../../store/subscriptionSlice";
import toast from "react-hot-toast";
import Pagination from "../../../../Utils/Pagination";
import { rupeesToPaise, paiseToRupees } from "../../../../Utils/currency";

const UpdatePlanForm = ({ userId, posts, updatePlan, setUpdatePlan }) => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("title-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 5;

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    console.log("UpdatePlanForm: Updating plan", { price: updatePlan.price, plan: updatePlan });
    if (updatePlan.price <= 0) {
      toast.error("Price must be positive");
      return;
    }
    try {
      const planData = {
        ...updatePlan,
        authorId: userId,
        price: Number(updatePlan.price), // Ensure price is a number (in paise)
      };
      console.log("UpdatePlanForm: Sending to backend", { planData });
      const result = await dispatch(
        updateSubscriptionPlan({
          planId: updatePlan._id,
          planData,
        })
      ).unwrap();
      console.log("UpdatePlanForm: Plan updated successfully", {
        planId: result.plan._id,
        returnedPrice: result.plan.price,
      });
      toast.success("Plan updated successfully");
      setUpdatePlan(null);
    } catch (error) {
      console.error("UpdatePlanForm: Failed to update plan", {
        error: error.message,
      });
      toast.error(error.message || "Failed to update plan");
    }
  };

  const handleUpdatePlanPostIds = (postId) => {
    console.log("UpdatePlanForm: Toggling post ID", { postId });
    setUpdatePlan((prev) => ({
      ...prev,
      postIds: prev.postIds?.includes(postId)
        ? prev.postIds.filter((id) => id !== postId)
        : [...(prev.postIds || []), postId],
    }));
  };

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

  const handlePageChange = (pageIndex) => {
    if (pageIndex >= 1 && pageIndex <= totalPages) {
      setCurrentPage(pageIndex);
    }
  };

  if (!updatePlan) return null;

  const priceInRupees = updatePlan.price ? paiseToRupees(updatePlan.price) : 0;

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark  shadow-2xl rounded-3xl p-10 mb-8 max-w-7xl mx-auto border border-gray-100">
      <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark mb-8 text-center bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Update Plan: {updatePlan.name}
      </h2>

      <form onSubmit={handleUpdatePlan} className="space-y-8">
        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-2">
            Plan Name
          </label>
          <input
            type="text"
            value={updatePlan.name}
            onChange={(e) =>
              setUpdatePlan({ ...updatePlan, name: e.target.value })
            }
            className="w-full p-4 rounded-lg border border-gray-300  text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="e.g., Premium Plan"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-2">
            Description (Optional)
          </label>
          <textarea
            value={updatePlan.description || ""}
            onChange={(e) =>
              setUpdatePlan({ ...updatePlan, description: e.target.value })
            }
            className="w-full p-4 rounded-lg border border-gray-300  text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="Describe your plan"
            rows="4"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-2">
            Price (₹)
          </label>
          <input
            type="number"
            value={priceInRupees}
            onChange={(e) => {
              const newPrice = rupeesToPaise(e.target.value);
              console.log("Price input changed", { input: e.target.value, paise: newPrice });
              setUpdatePlan({ ...updatePlan, price: newPrice });
            }}
            className="w-full p-4 rounded-lg border border-gray-300  text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="e.g., ₹26.00"
            min="0.01"
            step="0.01"
            required
          />
          <p className="text-sm text-text-main-light dark:text-text-main-dark mt-2">
            Entered price:{" "}
            <span className="text-blue-600 font-semibold">
              ₹{Number(priceInRupees).toFixed(2)}
            </span> → {(Number(priceInRupees) * 100).toFixed(0)} paise
          </p>
          <p className="text-sm  text-text-main-light dark:text-text-main-dark mt-2">
            After deductions:{" "}
            <span className="text-blue-600 font-semibold">
              Razorpay Fee (2%): ₹{(Number(priceInRupees) * 0.02).toFixed(2)} | 
              Platform Fee (20%): ₹{(Number(priceInRupees) * 0.20).toFixed(2)} | 
              Net: ₹{(Number(priceInRupees) - (Number(priceInRupees) * 0.22)).toFixed(2)}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-2">
            Posts (Optional)
          </label>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
              />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
              >
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="date-desc">Date (Newest)</option>
              </select>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-background-light dark:bg-background-dark shadow-sm">
              {paginatedPosts.length === 0 ? (
                <p className="bg-background-light dark:bg-background-dark  text-center font-medium">
                  No posts found
                </p>
              ) : (
                paginatedPosts.map((post) => (
                  <div key={post._id} className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      value={post._id}
                      checked={updatePlan.postIds?.includes(post._id) || false}
                      onChange={() => handleUpdatePlanPostIds(post._id)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <label className="ml-3 text-sm font-medium text-text-main-light dark:text-text-main-dark">
                      {post.title || post._id}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-sm  text-text-main-light dark:text-text-main-dark mt-2">
              {updatePlan.postIds?.length || 0} post(s) selected
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
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-2">
            Duration (Days)
          </label>
          <input
            type="number"
            value={updatePlan.durationDays || ""}
            onChange={(e) =>
              setUpdatePlan({
                ...updatePlan,
                durationDays: Number(e.target.value),
              })
            }
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="e.g., 30"
            min="1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Plan Type
          </label>
          <select
            value={updatePlan.type || "custom"}
            onChange={(e) =>
              setUpdatePlan({ ...updatePlan, type: e.target.value })
            }
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
          >
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-2">
            Status
          </label>
          <select
            value={updatePlan.status || "pending"}
            onChange={(e) =>
              setUpdatePlan({ ...updatePlan, status: e.target.value })
            }
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
          >
            <option value="pending">Pending (not visible to users yet)</option>
            <option value="active">Active (live and available)</option>
            <option value="not_confirmed">Draft / Not Confirmed</option>
          </select>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600  text-text-main-light dark:text-text-main-dark font-bold py-3 px-6 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            Update Plan
          </button>
          <button
            type="button"
            onClick={() => setUpdatePlan(null)}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600  text-text-main-light dark:text-text-main-dark font-bold py-3 px-6 rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdatePlanForm;