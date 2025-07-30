import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { X, Plus } from "lucide-react";
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
  const {
    user: loginUser,
    status: userStatus,
    error: userError,
  } = useSelector((state) => state.user);
  const { categories, userSelectedCategories, status, error } = useSelector(
    (state) => state.categories
  );

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formError, setFormError] = useState("");
  const userId = loginUser?._id;

  useEffect(() => {
    if (!token) {
      toast.error("Please log in to continue.");
      navigate("/login");
      return;
    }
    if (!userId && userStatus !== "loading") {
      console.warn(
        "[NewUserCategoryModal] User ID missing, dispatching getUser()"
      );
      dispatch(getUser());
    }
  }, [token, userId, userStatus, dispatch, navigate]);

  useEffect(() => {
    dispatch(fetchCategories());
    if (userId) {
      dispatch(fetchUserSelectedCategories());
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (userSelectedCategories.length > 0) {
      setSelectedCategories(userSelectedCategories.map((cat) => cat._id));
    }
  }, [userSelectedCategories]);

  useEffect(() => {
    if (error) toast.error(error);
    if (userError) toast.error(userError || "Failed to fetch user");
  }, [error, userError]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNewCategoryChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const handleAddCategory = async () => {
    if (!token) {
      toast.error("Please log in to add categories");
      return;
    }
    if (!newCategory.name || !newCategory.slug) {
      setFormError("Name and slug are required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(newCategory.slug)) {
      setFormError(
        "Slug must be lowercase, alphanumeric, and contain only dashes"
      );
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
      toast.success("Category created");
      setSelectedCategories((prev) => [...prev, result._id]);
      setNewCategory({ name: "", slug: "", description: "" });
      setShowAddCategory(false);
      dispatch(fetchCategories());
    } catch (err) {
      toast.error(err || "Failed to create category");
    }
  };

  const handleSelect = async () => {
    if (!token) {
      toast.error("Please log in to save categories");
      navigate("/login");
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }
    if (!userId) {
      toast.error("User not found");
      return;
    }
    try {
      await dispatch(
        assignCategoriesToUser({
          userId,
          categoryIds: selectedCategories,
          newCategories: [],
        })
      ).unwrap();
      toast.success("Categories saved");
      navigate(isNewUser ? "/" : "/create-post");
    } catch (err) {
      toast.error(err || "Failed to save categories");
    }
  };

  const handleSkip = () => {
    navigate(isNewUser ? "/" : "/create-post");
  };

  const handleCloseModal = () => {
    if (isNewUser && selectedCategories.length === 0) {
      toast.error("Please select at least one category before closing");
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center z-50 px-4 sm:px-6">
      <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleCloseModal}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300"
          aria-label="Close"
        >
          <X size={28} className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center text-gray-900 dark:text-gray-100 mb-4 sm:mb-6 tracking-tight">
          Discover Your Interests
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6 sm:mb-8 text-base sm:text-lg md:text-xl">
          Pick categories to tailor your experience
        </p>

        {status === "loading" && (
          <p className="text-center text-gray-600 dark:text-gray-300 text-lg md:text-xl animate-pulse">
            Loading categories...
          </p>
        )}
        {status === "failed" && (
          <p className="text-center text-red-500 dark:text-red-400 text-lg md:text-xl">
            Failed to load categories
          </p>
        )}
        {status === "succeeded" && categories.length === 0 && (
          <div className="mb-6 sm:mb-8">
            <p className="text-center text-gray-600 dark:text-gray-300 text-lg md:text-xl mb-4 sm:mb-6">
              No categories available. Add a new category below.
            </p>
            <div className="mt-4 sm:mt-6 space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 sm:p-6 rounded-2xl">
              {formError && (
                <p className="text-red-500 dark:text-red-400 text-center text-sm sm:text-base">
                  {formError}
                </p>
              )}
              <input
                type="text"
                name="name"
                placeholder="Category Name"
                value={newCategory.name}
                onChange={handleNewCategoryChange}
                className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
              />
              <input
                type="text"
                name="slug"
                placeholder="Slug (e.g., custom-category)"
                value={newCategory.slug}
                onChange={handleNewCategoryChange}
                className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
              />
              <textarea
                name="description"
                placeholder="Description (optional)"
                value={newCategory.description}
                onChange={handleNewCategoryChange}
                className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300 resize-none h-24 sm:h-28 md:h-32"
              />
              <button
                onClick={handleAddCategory}
                className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md active:scale-95"
              >
                Create Category
              </button>
            </div>
          </div>
        )}

        {status === "succeeded" && categories.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center mb-4 sm:mb-6">
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleCategoryToggle(category._id)}
                  className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    selectedCategories.includes(category._id)
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300"
                  }`}
                >
                  {category.name}
                  {category.createdBy && (
                    <span className="ml-2 text-yellow-400">★</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-2 mx-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold text-sm sm:text-base md:text-lg transition-all duration-300"
            >
              <Plus size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
              {showAddCategory ? "Hide Add Category" : "Add New Category"}
            </button>

            {showAddCategory && (
              <div className="mt-4 sm:mt-6 space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 sm:p-6 rounded-2xl">
                {formError && (
                  <p className="text-red-500 dark:text-red-400 text-center text-sm sm:text-base">
                    {formError}
                  </p>
                )}
                <input
                  type="text"
                  name="name"
                  placeholder="Category Name"
                  value={newCategory.name}
                  onChange={handleNewCategoryChange}
                  className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
                />
                <input
                  type="text"
                  name="slug"
                  placeholder="Slug (e.g., custom-category)"
                  value={newCategory.slug}
                  onChange={handleNewCategoryChange}
                  className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
                />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={handleNewCategoryChange}
                  className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300 resize-none h-24 sm:h-28 md:h-32"
                />
                <button
                  onClick={handleAddCategory}
                  className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md active:scale-95"
                >
                  Create Category
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 shadow-sm active:scale-95"
          >
            Skip
          </button>
          <button
            onClick={handleSelect}
            disabled={selectedCategories.length === 0}
            className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300 shadow-md active:scale-95 ${
              selectedCategories.length > 0
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                : "bg-emerald-300 dark:bg-emerald-700/50 text-white dark:text-gray-300 cursor-not-allowed"
            }`}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewUserCategoryModal;
