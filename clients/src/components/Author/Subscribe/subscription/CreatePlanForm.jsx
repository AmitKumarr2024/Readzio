import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  createSubscriptionPlan,
  getSubscriptionAnalytics,
  fetchSubscriptionPlansByAuthor,
} from "../../../../store/subscriptionSlice";
import toast from "react-hot-toast";
import PriceConfirmModal from "../../../../Utils/PriceConfirmModal";
import Pagination from "../../../../Utils/Pagination";
import { rupeesToPaise } from "../../../../Utils/currency";

const CreatePlanForm = ({ userId, posts, activePlan }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    postIds: [],
    durationDays: "",
    type: "custom",
    authorId: userId,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("title-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPriceModalVisible, setIsPriceModalVisible] = useState(false);
  const postsPerPage = 5;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" || name === "durationDays" ? Number(value) : value,
    }));
  };

  const handlePostChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const newPostIds = checked
        ? [...prev.postIds, value]
        : prev.postIds.filter((id) => id !== value);
      return { ...prev, postIds: newPostIds };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.durationDays) {
      toast.error("Please fill all required fields");
      return;
    }
    if (formData.price <= 0 || formData.durationDays <= 0) {
      toast.error("Price and duration must be positive");
      return;
    }
    if (activePlan) {
      toast.error("You already have an active plan. Delete it to create a new one.");
      return;
    }
    setIsPriceModalVisible(true);
  };

  const handlePriceConfirm = async () => {
    try {
      const planData = {
        ...formData,
        price: rupeesToPaise(formData.price), // Convert rupees to paise
        status: "pending",
        deletedAt: null,
      };
      const result = await dispatch(createSubscriptionPlan(planData)).unwrap();
      toast.success("Plan created and awaiting activation");
      await dispatch(getSubscriptionAnalytics(result.plan._id));
      await dispatch(fetchSubscriptionPlansByAuthor(userId));
      setFormData({
        name: "",
        description: "",
        price: "",
        postIds: [],
        durationDays: "",
        type: "custom",
        authorId: userId,
      });
    } catch (err) {
      toast.error(err?.message || "Failed to create plan");
    } finally {
      setIsPriceModalVisible(false);
    }
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
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  const handlePageChange = (pageIndex) => {
    if (pageIndex >= 1 && pageIndex <= totalPages) {
      setCurrentPage(pageIndex);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl rounded-3xl p-10 mb-8 max-w-6xl mx-auto border border-gray-100">
      <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark  mb-8 text-center bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Create Subscription Plan
      </h2>

      {activePlan && (
        <p className="text-red-600 bg-background-light dark:bg-background-dark  p-4 rounded-lg text-center mb-6 font-medium shadow-sm">
          You already have an active plan. Please delete your current plan from the Analytics tab to create a new one.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark  mb-2">Plan Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark  mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark   focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="Describe your plan (optional)"
            rows="4"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark  mb-2">Price (₹)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="e.g., ₹26.00"
            min="0.01"
            step="0.01"
            required
          />
          <p className="text-sm  text-text-main-light dark:text-text-main-dark  mt-2">
            Entered price:{" "}
            <span className="text-blue-600 font-semibold">
              ₹{(formData.price || 0).toFixed(2)}
            </span>
          </p>
          <p className="text-sm  text-text-main-light dark:text-text-main-dark mt-2">
            After deductions:{" "}
            <span className="text-blue-600 font-semibold">
              Razorpay Fee (2%): ₹{((formData.price || 0) * 0.02).toFixed(2)} | 
              Platform Fee (20%): ₹{((formData.price || 0) * 0.20).toFixed(2)} | 
              Net: ₹{((formData.price || 0) - ((formData.price || 0) * 0.22)).toFixed(2)}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark  mb-2">Duration (Days)</label>
          <input
            type="number"
            name="durationDays"
            value={formData.durationDays}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300  text-text-main-light dark:text-text-main-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
            placeholder="e.g., 30"
            min="1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark  mb-2">Posts (Optional)</label>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
              />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full sm:w-1/2 p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark  focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
              >
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="date-desc">Date (Newest)</option>
              </select>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-background-light dark:bg-background-dark  shadow-sm">
              {paginatedPosts.length === 0 ? (
                <p className=" text-text-main-light dark:text-text-main-dark  text-center font-medium">No posts found</p>
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
                    <label className="ml-3 text-sm font-medium  text-text-main-light dark:text-text-main-dark ">{post.title}</label>
                  </div>
                ))
              )}
            </div>
            <p className="text-sm  text-text-main-light dark:text-text-main-dark  mt-2">
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
          <label className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark  mb-2">Plan Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
          >
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600  text-text-main-light dark:text-text-main-dark  font-bold py-3 px-6 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={activePlan}
        >
          Create Plan
        </button>
      </form>

      <PriceConfirmModal
        isOpen={isPriceModalVisible}
        onClose={() => setIsPriceModalVisible(false)}
        onConfirm={handlePriceConfirm}
        price={formData.price || 0}
      />
    </div>
  );
};

export default CreatePlanForm;