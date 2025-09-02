import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategories,
  createCategory,
  clearError,
  selectCategory,
} from "../../store/categorySlice";
import { toast } from "react-hot-toast";
import { X, Plus, Search, Loader2, Tag, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import debounce from "lodash/debounce"; // Added lodash for debouncing

const CategorySelector = ({ onBack, onContinue, onClose }) => {
  const dispatch = useDispatch();
  const { categories, status, error } = useSelector(
    (state) => state.categories
  );

  // Core states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Loading control states
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);

  // Form states
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [formError, setFormError] = useState("");

  // Refs
  const searchInputRef = useRef(null);

  // Debounced search handler
  const debouncedSetSearchTerm = useCallback(debounce(setSearchTerm, 300), []);

  // Memoized fetch function
  const loadCategories = useCallback(() => {
    if (!hasLoadedCategories && status !== "loading") {
      setHasLoadedCategories(true);
      dispatch(fetchCategories()).catch((err) => {
        console.error("[CategorySelector] Failed to load categories:", err);
        toast.error("Failed to load categories.");
      });
    }
  }, [hasLoadedCategories, status, dispatch]);

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Handle errors
  useEffect(() => {
    if (error && hasLoadedCategories) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, hasLoadedCategories, dispatch]);

  // Auto-generate slug from name
  useEffect(() => {
    if (newCategory.name && !newCategory.slug) {
      const slug = generateSlug(newCategory.name);
      setNewCategory((prev) => ({ ...prev, slug }));
    }
  }, [newCategory.name]);

  const generateSlug = useCallback(
    (name) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    []
  );

  // Memoized filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description &&
          cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  const handleCategorySelect = useCallback(
    (category) => {
      setSelectedCategory(category);
      dispatch(selectCategory(category));
      setTimeout(() => {
        onContinue({ id: category._id, name: category.name });
      }, 300);
    },
    [dispatch, onContinue]
  );

  const handleNewCategoryChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setNewCategory((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "name" ? { slug: generateSlug(value) } : {}),
      }));
      setFormError("");
    },
    [generateSlug]
  );

  const handleAddCategory = useCallback(async () => {
    const { name, slug, description } = newCategory;
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    // Validation
    if (!trimmedName || !trimmedSlug) {
      setFormError("Name and slug are required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setFormError("Slug must be lowercase, alphanumeric, and use dashes");
      return;
    }
    if (categories.find((cat) => cat.slug === trimmedSlug)) {
      setFormError("Category slug already exists");
      return;
    }
    if (
      categories.find(
        (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setFormError("Category name already exists");
      return;
    }

    setIsCreatingCategory(true);
    try {
      const result = await dispatch(
        createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
        })
      ).unwrap();

      setNewCategory({ name: "", slug: "", description: "" });
      setShowAddCategory(false);
      toast.success("Category created successfully!");
      setTimeout(() => {
        onContinue({ id: result.category._id, name: result.category.name });
      }, 500);
    } catch (err) {
      setFormError(err.message || "Failed to create category");
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  }, [dispatch, newCategory, onContinue, categories]);

  const handleRetryLoad = useCallback(() => {
    setHasLoadedCategories(false);
    loadCategories();
  }, [loadCategories]);

  const isLoading = status === "loading" && !hasLoadedCategories;
  const hasError = status === "failed";
  const isEmpty = categories.length === 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }} // Simplified animation
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Tag size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Choose a Category</h2>
            <p className="text-white/90">
              Select or create a category for your content
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin w-8 h-8 text-blue-500 mr-3" />
              <span className="text-gray-600 dark:text-gray-400 text-lg">
                Loading categories...
              </span>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="text-center py-8">
              <div className="text-red-500 dark:text-red-400 mb-4 text-lg">
                Failed to load categories
              </div>
              <button
                onClick={handleRetryLoad}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* No Categories State */}
          {!isLoading && !hasError && isEmpty && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <Tag size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Categories Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first category to get started!
                </p>
              </div>
              <CreateCategoryForm
                newCategory={newCategory}
                formError={formError}
                isCreating={isCreatingCategory}
                onChange={handleNewCategoryChange}
                onSubmit={handleAddCategory}
              />
            </div>
          )}

          {/* Categories Available */}
          {!isLoading && !hasError && !isEmpty && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search categories..."
                  onChange={(e) => debouncedSetSearchTerm(e.target.value)} // Debounced search
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Selected Category Display */}
              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-200">
                        Selected: {selectedCategory.name}
                      </div>
                      {selectedCategory.description && (
                        <div className="text-green-600 dark:text-green-300 text-sm">
                          {selectedCategory.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Categories Grid */}
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No categories found matching "{searchTerm}"
                  </p>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout">
                    {filteredCategories.slice(0, 50).map(
                      (
                        category // Limit to 50 categories
                      ) => (
                        <motion.button
                          key={category._id}
                          onClick={() => handleCategorySelect(category)}
                          className={`p-4 rounded-xl border-2 transition-colors text-left ${
                            selectedCategory?._id === category._id
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-lg"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          }`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }} // Simplified animation
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">
                                {category.name}
                              </h3>
                              {category.description && (
                                <p
                                  className={`text-sm ${
                                    selectedCategory?._id === category._id
                                      ? "text-white/80"
                                      : "text-gray-600 dark:text-gray-400"
                                  }`}
                                >
                                  {category.description}
                                </p>
                              )}
                            </div>
                            {category.createdBy && (
                              <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0 ml-3" />
                            )}
                          </div>
                        </motion.button>
                      )
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Add New Category Toggle */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <Plus size={16} />
                  {showAddCategory ? "Cancel" : "Create New Category"}
                </button>
              </div>

              {/* Add Category Form */}
              <AnimatePresence>
                {showAddCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }} // Simplified animation
                  >
                    <CreateCategoryForm
                      newCategory={newCategory}
                      formError={formError}
                      isCreating={isCreatingCategory}
                      onChange={handleNewCategoryChange}
                      onSubmit={handleAddCategory}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !hasError && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                >
                  ← Back
                </button>
              )}
              {selectedCategory && (
                <button
                  onClick={() =>
                    onContinue({
                      id: selectedCategory._id,
                      name: selectedCategory.name,
                    })
                  }
                  className="ml-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Continue with {selectedCategory.name}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// Separate component for the create category form
const CreateCategoryForm = ({
  newCategory,
  formError,
  isCreating,
  onChange,
  onSubmit,
}) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Create New Category
    </h3>
    {formError && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
      >
        <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
      </motion.div>
    )}
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category Name *
        </label>
        <input
          type="text"
          name="name"
          placeholder="e.g., Technology, Travel, Cooking"
          value={newCategory.name}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Slug *
        </label>
        <input
          type="text"
          name="slug"
          placeholder="auto-generated from name"
          value={newCategory.slug}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Used in URLs. Auto-generated from name if left empty.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          name="description"
          placeholder="Brief description of this category"
          value={newCategory.description}
          onChange={onChange}
          rows={3}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={isCreating || !newCategory.name.trim()}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
      >
        {isCreating ? (
          <>
            <Loader2 className="animate-spin w-5 h-5" />
            Creating...
          </>
        ) : (
          <>
            <Plus size={20} />
            Create Category
          </>
        )}
      </button>
    </div>
  </div>
);

export default CategorySelector;
