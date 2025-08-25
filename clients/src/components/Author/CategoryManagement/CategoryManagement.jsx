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
  forceRefreshCategories,
} from "../../../store/categorySlice";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFolderPlus,
  FaPlus,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaStar,
} from "react-icons/fa";

const AddCategory = ({ onAdd }) => {
  const dispatch = useDispatch();
  const { loadingStates, error, slugAvailability } = useSelector(
    (state) => state.categories
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value) => {
    setName(value);
    if (!slugTouched) {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim("-");
      setSlug(autoSlug);
    }
  };

  const handleSlugChange = (value) => {
    const cleanSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(cleanSlug);
    setSlugTouched(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Validation
    if (!name.trim() || !slug.trim()) {
      setFormError("Name and slug are required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setFormError(
        "Slug must contain only lowercase letters, numbers, and dashes"
      );
      return;
    }

    if (slugAvailability.isAvailable === false) {
      setFormError("Slug is already taken. Please choose a different one.");
      return;
    }

    // Wait for slug check if still loading
    if (slugAvailability.loading) {
      setFormError("Please wait for slug availability check to complete");
      return;
    }

    try {
      const result = await dispatch(
        createCategory({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
        })
      ).unwrap();

      toast.success("Category created successfully!");

      // Reset form
      setName("");
      setSlug("");
      setDescription("");
      setSlugTouched(false);

      // Force refresh categories to show new one
      dispatch(forceRefreshCategories());

      onAdd(result._id);
      dispatch(clearError());
      dispatch(resetSlugAvailability());
    } catch (err) {
      const errorMessage = err || "Failed to create category";
      setFormError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || !slugTouched) {
      dispatch(resetSlugAvailability());
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      dispatch(checkSlugAvailability({ slug, type: "category" }));
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [slug, slugTouched, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetSlugAvailability());
    };
  }, [dispatch]);

  const getSlugStatus = () => {
    if (!slug || !slugTouched) return null;
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { type: "error", message: "Invalid format" };
    }
    if (slugAvailability.loading) {
      return { type: "loading", message: "Checking availability..." };
    }
    if (slugAvailability.isAvailable === true) {
      return { type: "success", message: "Available" };
    }
    if (slugAvailability.isAvailable === false) {
      return { type: "error", message: "Already taken" };
    }
    return null;
  };

  const slugStatus = getSlugStatus();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8 overflow-hidden"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <FaFolderPlus className="text-indigo-600" />
          Add New Category
        </h3>

        <AnimatePresence>
          {(formError || error) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center gap-2">
                <FaTimes className="text-red-500 text-sm" />
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                  {formError || error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="category-name"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Category Name *
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              required
              placeholder="Enter category name"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {name.length}/50 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="category-slug"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Slug *
            </label>
            <input
              id="category-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                slugStatus?.type === "error"
                  ? "border-red-300 dark:border-red-600"
                  : slugStatus?.type === "success"
                  ? "border-green-300 dark:border-green-600"
                  : "border-gray-300 dark:border-gray-600"
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200`}
              required
              placeholder="e.g., technology, lifestyle"
              maxLength={50}
            />

            <AnimatePresence>
              {slugStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`mt-2 flex items-center gap-2 text-sm ${
                    slugStatus.type === "error"
                      ? "text-red-600 dark:text-red-400"
                      : slugStatus.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {slugStatus.type === "loading" && (
                    <FaSpinner className="animate-spin" />
                  )}
                  {slugStatus.type === "success" && <FaCheck />}
                  {slugStatus.type === "error" && <FaTimes />}
                  <span>{slugStatus.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              URL-friendly version of the name. Only lowercase letters, numbers,
              and dashes.
            </p>
          </div>

          <div>
            <label
              htmlFor="category-description"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
              rows={3}
              placeholder="Describe what this category is about..."
              maxLength={200}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description.length}/200 characters
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={
              loadingStates.creating ||
              slugStatus?.type === "loading" ||
              slugStatus?.type === "error"
            }
            className={`w-full sm:w-auto px-8 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg ${
              loadingStates.creating ||
              slugStatus?.type === "loading" ||
              slugStatus?.type === "error"
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-xl"
            }`}
            whileHover={!loadingStates.creating ? { scale: 1.02 } : {}}
            whileTap={!loadingStates.creating ? { scale: 0.98 } : {}}
          >
            {loadingStates.creating ? (
              <span className="flex items-center gap-2">
                <FaSpinner className="animate-spin" />
                Creating Category...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FaPlus />
                Add Category
              </span>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

const CategoryManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { categories, userSelectedCategories, status, error, loadingStates } =
    useSelector((state) => state.categories);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    if (user?._id) {
      dispatch(fetchUserSelectedCategories());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (userSelectedCategories.length > 0) {
      const newSelected = userSelectedCategories.map((cat) => cat._id);
      setSelectedCategories(newSelected);
      setHasChanges(false);
    } else {
      setSelectedCategories([]);
      setHasChanges(false);
    }
  }, [userSelectedCategories]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId];

      // Check if there are changes
      const originalIds = userSelectedCategories.map((cat) => cat._id);
      const hasChangesNow =
        JSON.stringify(newSelection.sort()) !==
        JSON.stringify(originalIds.sort());
      setHasChanges(hasChangesNow);

      return newSelection;
    });
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

      toast.success("Categories updated successfully!");
      setHasChanges(false);
      dispatch(clearError());
    } catch (err) {
      const errorMessage = err || "Failed to update categories";
      toast.error(errorMessage);
    }
  };

  const handleAddCategorySuccess = (newCategoryId) => {
    // Auto-select new category and mark as changed
    setSelectedCategories((prev) => {
      const newSelection = [...prev, newCategoryId];
      setHasChanges(true);
      return newSelection;
    });
    setShowAddCategory(false);
    toast.info("New category added and selected. Don't forget to save!");
  };

  const handleReset = () => {
    const originalIds = userSelectedCategories.map((cat) => cat._id);
    setSelectedCategories(originalIds);
    setHasChanges(false);
    toast.info("Changes reset");
  };

  if (loadingStates.fetching && categories.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-200 rounded-full animate-pulse"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Loading categories...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <FaFolderPlus className="text-indigo-600" />
                Category Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select your preferred categories to personalize your content
                feed.
              </p>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
                >
                  <div className="flex items-center gap-2">
                    <FaTimes className="text-red-500" />
                    <p className="text-red-700 dark:text-red-400 font-medium">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add Category Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-semibold transition-colors duration-200"
              >
                <motion.div
                  animate={{ rotate: showAddCategory ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaPlus size={16} />
                </motion.div>
                {showAddCategory ? "Cancel" : "Create New Category"}
              </button>
            </div>

            {/* Add Category Form */}
            <AnimatePresence>
              {showAddCategory && (
                <AddCategory onAdd={handleAddCategorySuccess} />
              )}
            </AnimatePresence>

            {/* Categories Grid */}
            {categories.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Available Categories ({categories.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((category) => {
                      const isSelected = selectedCategories.includes(
                        category._id
                      );
                      const isCustom = category.createdBy;

                      return (
                        <motion.button
                          key={category._id}
                          onClick={() => handleCategoryToggle(category._id)}
                          className={`p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg"
                              : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          layout
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold truncate">
                                  {category.name}
                                </h4>
                                {isCustom && (
                                  <FaStar
                                    className={`text-xs ${
                                      isSelected
                                        ? "text-yellow-300"
                                        : "text-yellow-500"
                                    }`}
                                    title="Custom category"
                                  />
                                )}
                              </div>
                              {category.description && (
                                <p
                                  className={`text-xs ${
                                    isSelected
                                      ? "text-indigo-100"
                                      : "text-gray-500 dark:text-gray-400"
                                  } line-clamp-2`}
                                >
                                  {category.description}
                                </p>
                              )}
                            </div>
                            <motion.div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? "bg-white border-white"
                                  : "border-gray-300 dark:border-gray-500"
                              }`}
                              animate={{ scale: isSelected ? 1 : 0.8 }}
                            >
                              {isSelected && (
                                <FaCheck className="text-indigo-600 text-xs" />
                              )}
                            </motion.div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    onClick={handleSave}
                    disabled={
                      loadingStates.assigning || selectedCategories.length === 0
                    }
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-lg text-white font-semibold transition-all duration-200 ${
                      hasChanges &&
                      !loadingStates.assigning &&
                      selectedCategories.length > 0
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={
                      hasChanges &&
                      !loadingStates.assigning &&
                      selectedCategories.length > 0
                        ? { scale: 1.02 }
                        : {}
                    }
                    whileTap={
                      hasChanges &&
                      !loadingStates.assigning &&
                      selectedCategories.length > 0
                        ? { scale: 0.98 }
                        : {}
                    }
                  >
                    {loadingStates.assigning ? (
                      <span className="flex items-center gap-2">
                        <FaSpinner className="animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <>Save Categories ({selectedCategories.length})</>
                    )}
                  </motion.button>

                  {hasChanges && (
                    <motion.button
                      onClick={handleReset}
                      className="px-6 py-3 rounded-lg text-gray-700 dark:text-gray-300 font-semibold border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Reset Changes
                    </motion.button>
                  )}
                </div>

                {/* Selection Info */}
                <motion.div
                  className="text-center text-sm text-gray-500 dark:text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {selectedCategories.length > 0 ? (
                    <>
                      {selectedCategories.length} of {categories.length}{" "}
                      categories selected
                      {hasChanges && " • Unsaved changes"}
                    </>
                  ) : (
                    "Select at least one category to personalize your feed"
                  )}
                </motion.div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <FaFolderPlus className="mx-auto text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                  No categories available
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Create your first category to get started!
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CategoryManagement;
