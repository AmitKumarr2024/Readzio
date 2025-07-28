// components/Author/CategoryManagement/CategoryManagement.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategories,
  fetchUserSelectedCategories,
  createCategory,
  assignCategoriesToUser,
  clearError,
  resetSlugAvailability,
  checkSlugAvailability,
} from "../../../store/categorySlice";
import {toast} from "react-hot-toast";
import { motion } from "framer-motion";
import { FaFolderPlus, FaPlus, FaSpinner } from "react-icons/fa";

const AddCategory = ({ onAdd }) => {
  const dispatch = useDispatch();
  const { status, error, slugAvailability } = useSelector(
    (state) => state.categories
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (slugAvailability.isAvailable === false) {
      setFormError("Slug is already taken. Please choose a different one.");
      return;
    }

    if (!name || !slug) {
      setFormError("Name and slug are required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setFormError(
        "Slug must be lowercase, alphanumeric, and contain only dashes"
      );
      return;
    }

    try {
      const result = await dispatch(
        createCategory({ name, slug, description })
      ).unwrap();
      toast.success("Category created");
      setName("");
      setSlug("");
      setDescription("");
      onAdd(result._id); // Pass new category ID to auto-select
      dispatch(clearError());
    } catch (err) {
      setFormError(err || "Failed to create category");
      toast.error(err || "Failed to create category");
    }
  };
  useEffect(() => {
    if (slug && /^[a-z0-9-]+$/.test(slug)) {
      dispatch(checkSlugAvailability({ slug }));
    } else {
      dispatch(resetSlugAvailability());
    }
  }, [slug, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetSlugAvailability());
    };
  }, [dispatch]);

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8 bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-100"
    >
      <h3 className="text-2xl font-semibold  text-text-main-light dark:text-text-main-dark mb-4 flex items-center gap-3">
        <FaFolderPlus className="text-indigo-600" /> Add New Category
      </h3>
      {(formError || error) && (
        <p className="text-red-600 mb-4">{formError || error}</p>
      )}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-1"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            aria-required="true"
            placeholder="Enter category name"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-semibold mb-1">
            Slug
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugTouched(true);
            }}
            className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            placeholder="e.g., custom-category"
          />
          {slugTouched && slug && (
            <p
              className={`mt-1 text-sm ${
                slugAvailability.loading
                  ? "text-gray-500"
                  : slugAvailability.isAvailable
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {slugAvailability.loading
                ? "Checking availability..."
                : slugAvailability.isAvailable
                ? "Slug is available ✅"
                : "Slug is already taken ❌"}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold  text-text-main-light dark:text-text-main-dark mb-1"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Enter category description"
          />
        </div>
        <motion.button
          type="submit"
          disabled={status === "loading"}
          className={`px-6 py-3 rounded-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 ${
            status === "loading" ? "opacity-50 cursor-not-allowed" : ""
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Add Category"
        >
          {status === "loading" ? "Creating..." : "Add Category"}
        </motion.button>
      </div>
    </motion.form>
  );
};

const CategoryManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, userSelectedCategories, status, error } = useSelector(
    (state) => state.categories
  );
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    if (user?._id) {
      dispatch(fetchUserSelectedCategories());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (userSelectedCategories.length > 0) {
      setSelectedCategories(userSelectedCategories.map((cat) => cat._id));
    } else {
      setSelectedCategories([]);
    }
  }, [userSelectedCategories]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (!user?._id) {
      toast.error("Please log in to save categories");
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }
    try {
      await dispatch(
        assignCategoriesToUser({
          userId: user._id,
          categoryIds: selectedCategories,
          newCategories: [],
        })
      ).unwrap();
      toast.success("Categories updated");
      dispatch(fetchUserSelectedCategories());
      dispatch(clearError());
    } catch (err) {
      toast.error(err || "Failed to update categories");
    }
  };

  const handleAddCategorySuccess = (newCategoryId) => {
    dispatch(fetchCategories());
    setSelectedCategories((prev) => [...prev, newCategoryId]); // Auto-select new category
    setShowAddCategory(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark  text-text-main-light dark:text-text-main-dark backdrop-blur-xl rounded-2xl shadow-xl p-6"
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h2 className="text-3xl font-extrabold   text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-3">
            <FaFolderPlus className="text-indigo-600" /> Category Management
          </h2>

          {status === "loading" && !categories.length && (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
              <motion.div
                className="flex flex-col items-center space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark">
                  Loading...
                </p>
              </motion.div>
            </div>
          )}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-red-600 text-lg py-6"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="flex items-center gap-2 mb-4 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
            aria-label={
              showAddCategory
                ? "Hide add category form"
                : "Show add category form"
            }
          >
            <FaPlus size={16} />
            {showAddCategory ? "Hide Add Category" : "Add New Category"}
          </button>

          {showAddCategory && <AddCategory onAdd={handleAddCategorySuccess} />}

          {categories.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark mb-4">
                Select Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <motion.button
                    key={category._id}
                    onClick={() => handleCategoryToggle(category._id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1 ${
                      selectedCategories.includes(category._id)
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Toggle ${category.name} category`}
                    aria-pressed={selectedCategories.includes(category._id)}
                  >
                    {category.name}
                    {category.createdBy && (
                      <span className="text-xs text-yellow-400">★</span>
                    )}
                  </motion.button>
                ))}
              </div>
              <motion.button
                onClick={handleSave}
                disabled={
                  status === "loading" || selectedCategories.length === 0
                }
                className={`mt-6 px-6 py-3 rounded-full text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 ${
                  status === "loading" || selectedCategories.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Save selected categories"
              >
                {status === "loading" ? "Saving..." : "Save Categories"}
              </motion.button>
            </div>
          ) : status !== "loading" ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-600 text-lg py-10"
            >
              No categories found. 📂
            </motion.p>
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CategoryManagement;
