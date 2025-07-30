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
      const validCategoryIds = userSelectedCategories
        .map((cat) => cat._id)
        .filter((id) => categories.some((category) => category._id === id));
      setSelectedCategories(validCategoryIds);
    }
  }, [userSelectedCategories, categories]);

  useEffect(() => {
    if (error) toast.error(error);
    if (userError) toast.error(userError || "Failed to fetch user");
  }, [error, userError]);

  const generateSlug = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleCategoryToggle = (categoryId) => {
    if (!categories.some((cat) => cat._id === categoryId)) {
      toast.error("Invalid category selected");
      return;
    }
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNewCategoryChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "name" ? { slug: generateSlug(value) } : {}),
    }));
    setFormError("");
  };

  const handleAddCategory = async () => {
    if (!token) {
      toast.error("Please log in to add categories");
      navigate("/login");
      return;
    }
    const { name, slug, description } = newCategory;
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName || !trimmedSlug) {
      setFormError("Name and slug are required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setFormError(
        "Slug must be lowercase, alphanumeric, and contain only dashes"
      );
      return;
    }
    if (categories.some((cat) => cat.slug === trimmedSlug)) {
      setFormError("Category slug already exists");
      return;
    }
    try {
      const result = await dispatch(
        createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
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
      navigate("/login");
      return;
    }
    const validCategoryIds = selectedCategories.filter((id) =>
      categories.some((cat) => cat._id === id)
    );
    if (validCategoryIds.length === 0) {
      toast.error("No valid categories selected");
      return;
    }
    try {
      await dispatch(
        assignCategoriesToUser({
          userId,
          categoryIds: validCategoryIds,
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
    <div className="fixed inset-0 bg-gray-500/50 dark:bg-gray-900/50 flex items-center justify-center z-50 px-4 sm:px-6">
      <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <button
          onClick={handleCloseModal}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300"
          aria-label="Close"
        >
          <X size={24} className="w-6 h-6" />
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
          Discover Your Interests
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-4 text-sm sm:text-base">
          Pick categories to tailor your experience
        </p>

        {status === "loading" && (
          <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base animate-pulse">
            Loading categories...
          </p>
        )}
        {status === "failed" && (
          <p className="text-center text-red-500 dark:text-red-400 text-sm sm:text-base">
            Failed to load categories
          </p>
        )}
        {status === "succeeded" && categories.length === 0 && (
          <div className="mb-4">
            <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-3">
              No categories available. Add a new category below.
            </p>
            <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              {formError && (
                <p className="text-red-500 dark:text-red-400 text-center text-xs sm:text-sm">
                  {formError}
                </p>
              )}
              <input
                type="text"
                name="name"
                placeholder="Category Name"
                value={newCategory.name}
                onChange={handleNewCategoryChange}
                className="w-full p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
              />
              <input
                type="text"
                name="slug"
                placeholder="Slug (auto-generated)"
                value={newCategory.slug}
                onChange={handleNewCategoryChange}
                className="w-full p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
              />
              <textarea
                name="description"
                placeholder="Description (optional)"
                value={newCategory.description}
                onChange={handleNewCategoryChange}
                className="w-full p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300 resize-none h-20"
              />
              <button
                onClick={handleAddCategory}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-xs sm:text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-sm active:scale-95"
              >
                Create Category
              </button>
            </div>
          </div>
        )}

        {status === "succeeded" && categories.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleCategoryToggle(category._id)}
                  className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    selectedCategories.includes(category._id)
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300"
                  }`}
                >
                  {category.name}
                  {category.createdBy && (
                    <span className="ml-1 text-yellow-400">★</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-1 mx-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold text-xs sm:text-sm transition-all duration-300"
            >
              <Plus size={16} className="w-4 h-4 sm:w-5 sm:h-5" />
              {showAddCategory ? "Hide Add Category" : "Add New Category"}
            </button>

            {showAddCategory && (
              <div className="mt-3 space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                {formError && (
                  <p className="text-red-500 dark:text-red-400 text-center text-xs sm:text-sm">
                    {formError}
                  </p>
                )}
                <input
                  type="text"
                  name="name"
                  placeholder="Category Name"
                  value={newCategory.name}
                  onChange={handleNewCategoryChange}
                  className="w-full p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
                />
                <input
                  type="text"
                  name="slug"
                  placeholder="Slug (auto-generated)"
                  value={newCategory.slug}
                  onChange={handleNewCategoryChange}
                  className="w-full p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300"
                />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={handleNewCategoryChange}
                  className="w-full p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all duration-300 resize-none h-20"
                />
                <button
                  onClick={handleAddCategory}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-xs sm:text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-sm active:scale-95"
                >
                  Create Category
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold text-xs sm:text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 shadow-sm active:scale-95"
          >
            Skip
          </button>
          <button
            onClick={handleSelect}
            disabled={selectedCategories.length === 0}
            className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 shadow-sm active:scale-95 ${
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
