import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { X, Plus, Loader2, Search, Sparkles, ChevronDown } from "lucide-react";
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

  // Core states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Loading control states
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);
  const [hasLoadedUserCategories, setHasLoadedUserCategories] = useState(false);
  const [hasLoadedUser, setHasLoadedUser] = useState(false);

  // Form states
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [formError, setFormError] = useState("");

  // Refs
  const prevUserIdRef = useRef(null);
  const userId = loginUser?._id;

  // Memoized functions to prevent infinite loops
  const loadUser = useCallback(() => {
    if (!token) {
      toast.error("Please log in to continue.");
      navigate("/login");
      return;
    }

    if (!userId && userStatus !== "loading" && !hasLoadedUser) {
      setHasLoadedUser(true);
      dispatch(getUser()).catch((err) => {
        console.error("[NewUserCategoryModal] Failed to load user:", err);
        setHasLoadedUser(false);
      });
    }
  }, [token, userId, userStatus, hasLoadedUser, dispatch, navigate]);

  const loadCategories = useCallback(() => {
    if (!hasLoadedCategories && status !== "loading") {
      setHasLoadedCategories(true);
      dispatch(fetchCategories()).catch((err) => {
        console.error("[NewUserCategoryModal] Failed to load categories:", err);
        setHasLoadedCategories(false);
      });
    }
  }, [hasLoadedCategories, status, dispatch]);

  const loadUserCategories = useCallback(() => {
    if (
      userId &&
      userId !== prevUserIdRef.current &&
      !hasLoadedUserCategories
    ) {
      prevUserIdRef.current = userId;
      setHasLoadedUserCategories(true);
      dispatch(fetchUserSelectedCategories()).catch((err) => {
        console.error(
          "[NewUserCategoryModal] Failed to load user categories:",
          err
        );
        setHasLoadedUserCategories(false);
      });
    }
  }, [userId, hasLoadedUserCategories, dispatch]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadUserCategories();
  }, [loadUserCategories]);

  // Set selected categories when user categories are loaded
  useEffect(() => {
    if (userSelectedCategories.length > 0 && categories.length > 0) {
      const validCategoryIds = userSelectedCategories
        .map((cat) => cat._id)
        .filter((id) => categories.some((category) => category._id === id));
      setSelectedCategories(validCategoryIds);
    }
  }, [userSelectedCategories, categories]);

  // Handle errors
  useEffect(() => {
    if (error && hasLoadedCategories) {
      toast.error(error);
    }
    if (userError && hasLoadedUser) {
      toast.error(userError || "Failed to fetch user");
    }
  }, [error, userError, hasLoadedCategories, hasLoadedUser]);

  // Utility functions
  const generateSlug = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  // Filter categories based on search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    // Validation
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

    setIsCreatingCategory(true);
    try {
      const result = await dispatch(
        createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
        })
      ).unwrap();

      toast.success("Category created successfully!");
      setSelectedCategories((prev) => [...prev, result._id]);
      setNewCategory({ name: "", slug: "", description: "" });
      setShowAddCategory(false);

      // Refresh categories list
      setHasLoadedCategories(false);
      loadCategories();
    } catch (err) {
      setFormError(err.message || "Failed to create category");
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
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

    setIsSubmitting(true);
    try {
      await dispatch(
        assignCategoriesToUser({
          userId,
          categoryIds: validCategoryIds,
          newCategories: [],
        })
      ).unwrap();

      toast.success("Categories saved successfully!");
      navigate(isNewUser ? "/" : "/create-post");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to save categories");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate(isNewUser ? "/" : "/create-post");
    onClose();
  };

  const handleCloseModal = () => {
    if (isNewUser && selectedCategories.length === 0) {
      toast.error("Please select at least one category before closing");
      return;
    }
    onClose();
  };

  const handleRetryLoad = () => {
    setHasLoadedCategories(false);
    setHasLoadedUserCategories(false);
    loadCategories();
    if (userId) {
      loadUserCategories();
    }
  };

  const isLoading = status === "loading" || userStatus === "loading";
  const hasError = status === "failed";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white p-6">
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Sparkles size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {isNewUser
                ? "Welcome! Discover Your Interests"
                : "Select Categories"}
            </h2>
            <p className="text-white/90">
              {isNewUser
                ? "Choose categories that match your interests to personalize your experience"
                : "Select categories for better content organization"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Loading State */}
          {isLoading && !hasLoadedCategories && (
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

          {/* No Categories - Show Add Form */}
          {!isLoading && !hasError && categories.length === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No categories available. Create your first category to get
                  started!
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Create New Category
                </h3>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      {formError}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g., Technology, Travel, Cooking"
                      value={newCategory.name}
                      onChange={handleNewCategoryChange}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      name="slug"
                      placeholder="auto-generated from name"
                      value={newCategory.slug}
                      onChange={handleNewCategoryChange}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Used in URLs. Auto-generated from name.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      name="description"
                      placeholder="Brief description of this category"
                      value={newCategory.description}
                      onChange={handleNewCategoryChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>

                  <button
                    onClick={handleAddCategory}
                    disabled={isCreatingCategory || !newCategory.name.trim()}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    {isCreatingCategory ? (
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
            </div>
          )}

          {/* Categories Available */}
          {!isLoading && !hasError && categories.length > 0 && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Selected Categories Count */}
              {selectedCategories.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    {selectedCategories.length} categor
                    {selectedCategories.length === 1 ? "y" : "ies"} selected
                  </p>
                </div>
              )}

              {/* Categories Grid */}
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No categories found matching "{searchTerm}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCategories.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => handleCategoryToggle(category._id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                        selectedCategories.includes(category._id)
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-lg"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          {category.description && (
                            <p
                              className={`text-sm mt-1 ${
                                selectedCategories.includes(category._id)
                                  ? "text-white/80"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {category.description}
                            </p>
                          )}
                        </div>
                        {category.createdBy && (
                          <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Add New Category Toggle */}
              <div className="text-center">
                <button
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <Plus size={16} />
                  {showAddCategory ? "Cancel" : "Create New Category"}
                </button>
              </div>

              {/* Add Category Form */}
              {showAddCategory && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Create New Category
                  </h3>

                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-red-600 dark:text-red-400 text-sm">
                        {formError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        placeholder="e.g., Technology, Travel, Cooking"
                        value={newCategory.name}
                        onChange={handleNewCategoryChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Slug *
                      </label>
                      <input
                        type="text"
                        name="slug"
                        placeholder="auto-generated from name"
                        value={newCategory.slug}
                        onChange={handleNewCategoryChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Used in URLs. Auto-generated from name.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        name="description"
                        placeholder="Brief description of this category"
                        value={newCategory.description}
                        onChange={handleNewCategoryChange}
                        rows={3}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    <button
                      onClick={handleAddCategory}
                      disabled={isCreatingCategory || !newCategory.name.trim()}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      {isCreatingCategory ? (
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
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-4 right-4 z-50 p-4">
          <div className="flex gap-4">
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Skip for Now
            </button>
            <button
              onClick={handleSelect}
              disabled={selectedCategories.length === 0 || isSubmitting}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                selectedCategories.length > 0 && !isSubmitting
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  Saving...
                </>
              ) : (
                `Continue (${selectedCategories.length} selected)`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserCategoryModal;
