import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { X } from "lucide-react";
import { FaPlus } from "react-icons/fa";
import {
  fetchCategories,
  fetchUserSelectedCategories,
  assignCategoriesToUser,
  createCategory,
} from "../../store/categorySlice";
import { getUser } from "../../store/userSlice";

const NewUserCategoryModal = ({ onClose, isNewUser }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const { user: loginUser, status: userStatus, error: userError } = useSelector((state) => state.user);
  const { categories, userSelectedCategories, status, error } = useSelector((state) => state.categories);

  console.log("loggin user", loginUser);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "" });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formError, setFormError] = useState("");

  // Redirect if not logged in and fetch user
  useEffect(() => {
    console.log("Token:", token, "LoginUser:", loginUser);
    if (!token) {
      console.log("No token found, redirecting to login");
      toast.error("Please log in to continue.");
      navigate("/login");
    } else if (!loginUser?.data?._id && userStatus !== "loading") {
      console.log("No user found, dispatching getUser");
      dispatch(getUser());
    }
  }, [token, loginUser, userStatus, dispatch, navigate]);

  useEffect(() => {
    console.log("Fetching categories and user-selected categories");
    dispatch(fetchCategories());
    if (loginUser?.data?._id) {
      dispatch(fetchUserSelectedCategories());
    }
  }, [dispatch, loginUser]);

  useEffect(() => {
    if (userSelectedCategories.length > 0) {
      console.log("Setting selected categories:", userSelectedCategories);
      setSelectedCategories(userSelectedCategories.map((cat) => cat._id));
    }
  }, [userSelectedCategories]);

  useEffect(() => {
    if (error) {
      console.error("Category error:", error);
      toast.error(error);
    }
    if (userError) {
      console.error("User fetch error:", userError);
      toast.error(userError || "Failed to fetch user");
    }
  }, [error, userError]);

  const handleCategoryToggle = (categoryId) => {
    console.log("Toggling category:", categoryId);
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNewCategoryChange = (e) => {
    const { name, value } = e.target;
    console.log(`Updating new category field ${name}:`, value);
    setNewCategory((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const handleAddCategory = async () => {
    console.log("Attempting to add category:", newCategory);
    if (!token) {
      console.log("No token, cannot add category");
      toast.error("Please log in to add categories");
      return;
    }

    if (!newCategory.name || !newCategory.slug) {
      console.log("Validation failed: Name or slug missing");
      setFormError("Name and slug are required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(newCategory.slug)) {
      console.log("Validation failed: Invalid slug format");
      setFormError("Slug must be lowercase, alphanumeric, and contain only dashes");
      return;
    }

    try {
      const result = await dispatch(
        createCategory({
          name: newCategory.name,
          slug: newCategory.slug,
          description: newCategory.description,
        })
      ).unwrap();
      console.log("Category created successfully:", result);
      toast.success("Category created");
      setSelectedCategories((prev) => [...prev, result._id]);
      setNewCategory({ name: "", slug: "", description: "" });
      setShowAddCategory(false);
      dispatch(fetchCategories());
    } catch (err) {
      console.error("Failed to create category:", err);
      toast.error(err || "Failed to create category");
    }
  };

  const handleSelect = async () => {
    console.log("Saving selected categories:", selectedCategories);
    console.log("Token:", token);
    console.log("User:", loginUser);
    if (!token) {
      console.log("No token, redirecting to login");
      toast.error("Please log in to save categories");
      navigate("/login");
      return;
    }

    if (selectedCategories.length === 0) {
      console.log("No categories selected");
      toast.error("Please select at least one category");
      return;
    }

    if (!loginUser?.data?._id) {
      console.log("User not found, user object:", loginUser);
      toast.error("User not found");
      return;
    }

    try {
      await dispatch(
        assignCategoriesToUser({
          userId: loginUser.data._id,
          categoryIds: selectedCategories,
          newCategories: [],
        })
      ).unwrap();
      console.log("Categories saved successfully");
      toast.success("Categories saved");
      navigate(isNewUser ? "/" : "/create-post");
    } catch (err) {
      console.error("Failed to save categories:", err);
      toast.error(err || "Failed to save categories");
    }
  };

  const handleSkip = () => {
    console.log("Skipping category selection");
    navigate(isNewUser ? "/" : "/create-post");
  };

  const handleCloseModal = () => {
    console.log("Attempting to close modal, selected categories:", selectedCategories);
    if (isNewUser && selectedCategories.length === 0) {
      console.log("Cannot close: No categories selected for new user");
      toast.error("Please select at least one category before closing");
      return;
    }
    onClose();
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300">
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-gray-700 hover:text-red-600 transition"
            aria-label="Close"
          >
            <X size={28} />
          </button>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Select Your Interests
          </h2>
          <p className="text-gray-600 text-center mb-6 text-sm">
            Choose categories to personalize your experience
          </p>

          {status === "loading" && (
            <p className="text-center text-gray-600">Loading categories...</p>
          )}
          {status === "failed" && (
            <p className="text-center text-red-600">Failed to load categories</p>
          )}
          {status === "succeeded" && categories.length === 0 && (
            <p className="text-center text-gray-600">No categories available</p>
          )}

          {status === "succeeded" && categories.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {categories.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => handleCategoryToggle(category._id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      selectedCategories.includes(category._id)
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600"
                    }`}
                  >
                    {category.name}
                    {category.createdBy && (
                      <span className="ml-1 text-xs text-yellow-400">★</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="flex items-center gap-2 mx-auto text-indigo-600 hover:text-indigo-800"
              >
                <FaPlus size={16} />
                {showAddCategory ? "Hide Add Category" : "Add New Category"}
              </button>

              {showAddCategory && (
                <div className="mt-4 space-y-4">
                  {formError && <p className="text-red-600">{formError}</p>}
                  <input
                    type="text"
                    name="name"
                    placeholder="Category Name"
                    value={newCategory.name}
                    onChange={handleNewCategoryChange}
                    className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    name="slug"
                    placeholder="Slug (e.g., custom-category)"
                    value={newCategory.slug}
                    onChange={handleNewCategoryChange}
                    className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <textarea
                    name="description"
                    placeholder="Description (optional)"
                    value={newCategory.description}
                    onChange={handleNewCategoryChange}
                    className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Create Category
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between gap-4">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all duration-200"
            >
              Skip
            </button>
            <button
              onClick={handleSelect}
              disabled={selectedCategories.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                selectedCategories.length > 0
                  ? "bg-emerald-500 text-white hover:bg-emerald-700"
                  : "bg-emerald-300 text-white cursor-not-allowed"
              }`}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewUserCategoryModal;