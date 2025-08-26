import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategories,
  createCategory,
  selectCategory,
} from "../features/categories/categorySlice";
import { toast } from "react-hot-toast";
import { X, Plus, Loader2, Search, ChevronDown } from "lucide-react";

const CategorySelector = ({
  onBack,
  onContinue,
  onClose,
  isNewUser = false,
}) => {
  const dispatch = useDispatch();
  const { categories, selectedCategory, status, error } = useSelector(
    (state) => state.categories
  );

  // Form states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Control states
  const [hasContinuedOrSelected, setHasContinuedOrSelected] = useState(false);
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Refs
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Memoized fetch function to prevent infinite loops
  const fetchCategoriesOnce = useCallback(() => {
    if (!hasLoadedCategories && status !== "loading") {
      setHasLoadedCategories(true);
      dispatch(fetchCategories()).catch((err) => {
        console.error("[CategorySelector] Failed to fetch categories:", err);
        setHasLoadedCategories(false);
      });
    }
  }, [dispatch, hasLoadedCategories, status]);

  // Load categories once on mount
  useEffect(() => {
    fetchCategoriesOnce();
  }, [fetchCategoriesOnce]);

  // Handle errors
  useEffect(() => {
    if (error && hasLoadedCategories) {
      toast.error(error);
    }
  }, [error, hasLoadedCategories]);

  // Auto-generate slug from name
  useEffect(() => {
    if (newCategoryName && !newCategorySlug) {
      const slug = newCategoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setNewCategorySlug(slug);
    }
  }, [newCategoryName, newCategorySlug]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Filter categories based on search term
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    const trimmedSlug = newCategorySlug.trim();

    if (!trimmedName || !trimmedSlug) {
      return toast.error("Category name and slug are required");
    }

    // Check if category already exists
    const existingCategory = categories.find(
      (cat) =>
        cat.name.toLowerCase() === trimmedName.toLowerCase() ||
        cat.slug.toLowerCase() === trimmedSlug.toLowerCase()
    );

    if (existingCategory) {
      return toast.error("Category with this name or slug already exists");
    }

    setIsCreatingCategory(true);

    try {
      const result = await dispatch(
        createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: newCategoryDescription.trim(),
        })
      ).unwrap();

      // Auto-select the newly created category
      dispatch(selectCategory(result));
      setHasContinuedOrSelected(true);

      // Reset form
      setNewCategoryName("");
      setNewCategorySlug("");
      setNewCategoryDescription("");
      setShowCreateForm(false);

      toast.success("Category created successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSelectCategory = (category) => {
    dispatch(selectCategory(category));
    setHasContinuedOrSelected(true);
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const handleContinue = () => {
    if (!selectedCategory) {
      return toast.error("Please select or create a category");
    }
    onContinue(selectedCategory);
  };

  const handleClose = () => {
    if (!hasContinuedOrSelected && isNewUser) {
      toast.error("Please select a category before closing");
    } else {
      onClose();
    }
  };

  const handleRetryFetch = () => {
    setHasLoadedCategories(false);
    fetchCategoriesOnce();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isNewUser ? "Select Your Interests" : "Select Post Category"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isNewUser
              ? "Choose categories that match your interests to personalize your experience"
              : "Select a category for your post or create a new one"}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Loading State */}
          {status === "loading" && !hasLoadedCategories && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-blue-500 mr-3" />
              <span className="text-gray-600 dark:text-gray-400">
                Loading categories...
              </span>
            </div>
          )}

          {/* Error State */}
          {status === "failed" && (
            <div className="text-center py-6">
              <p className="text-red-500 dark:text-red-400 mb-4">
                Failed to load categories
              </p>
              <button
                onClick={handleRetryFetch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Category Selection */}
          {status !== "loading" && categories.length > 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Choose Existing Category
              </label>

              {/* Custom Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-3 text-left bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        selectedCategory
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-500 dark:text-gray-400"
                      }
                    >
                      {selectedCategory
                        ? selectedCategory.name
                        : "Select a category"}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search categories..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    {/* Category Options */}
                    <div className="py-1">
                      {filteredCategories.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          No categories found
                        </div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <button
                            key={cat._id}
                            onClick={() => handleSelectCategory(cat)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 text-sm"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {cat.name}
                            </div>
                            {cat.description && (
                              <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                {cat.description}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Category Display */}
              {selectedCategory && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">
                        Selected: {selectedCategory.name}
                      </div>
                      {selectedCategory.description && (
                        <div className="text-green-600 dark:text-green-300 text-sm">
                          {selectedCategory.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        dispatch(selectCategory(null));
                        setHasContinuedOrSelected(false);
                      }}
                      className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create New Category Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              <Plus size={16} />
              {showCreateForm ? "Cancel" : "Create New Category"}
            </button>

            {showCreateForm && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Technology, Cooking, Travel"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Slug *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., technology, cooking, travel"
                    value={newCategorySlug}
                    onChange={(e) => setNewCategorySlug(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Used in URLs. Auto-generated from name if left empty.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Brief description of this category"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    rows={2}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 resize-none"
                  />
                </div>

                <button
                  onClick={handleAddCategory}
                  disabled={
                    isCreatingCategory ||
                    !newCategoryName.trim() ||
                    !newCategorySlug.trim()
                  }
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingCategory ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Category
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-2xl">
          <div className="flex justify-between items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
              >
                ← Back
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedCategory}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;
