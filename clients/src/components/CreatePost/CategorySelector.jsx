import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories, createCategory, clearError, selectCategory } from "../../store/categorySlice";
import toast, { Toaster } from "react-hot-toast";
import { X } from "lucide-react";
import { FaPlus } from "react-icons/fa";
import { motion } from "framer-motion";

const CategorySelector = ({ onBack, onContinue, onClose }) => {
  const dispatch = useDispatch();
  const { categories, status, error } = useSelector((state) => state.categories);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const generateSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const handleCategorySelect = (categoryName) => {
  const selected = categories.find((cat) => cat.name === categoryName);
  console.log("[DEBUG] CategorySelector: Selected category:", {
    name: categoryName,
    id: selected?._id,
    fullCategory: selected,
  });
  setSelectedCategory(categoryName);
  dispatch(selectCategory(selected || null));
  onContinue({ id: selected._id, name: categoryName });
};

  const handleNewCategoryChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({ ...prev, [name]: value }));
    if (name === "name") {
      setNewCategory((prev) => ({ ...prev, slug: generateSlug(value) }));
    }
    setFormError("");
  };

  const handleAddCategory = async () => {
    const { name, slug, description } = newCategory;
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

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

    try {
      const result = await dispatch(
        createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
        })
      ).unwrap();

      setSelectedCategory(result.name);
      dispatch(selectCategory(result));
      setNewCategory({ name: "", slug: "", description: "" });
      setShowAddCategory(false);
      toast.success("Category added");
      dispatch(fetchCategories());
      onContinue({ id: result._id, name: result.name });
    } catch (err) {
      setFormError(err || "Failed to add category");
      toast.error(err || "Failed to add category");
    }
  };

  const handleClose = () => {
    if (!selectedCategory) {
      toast.error("Please select a category before closing");
      return;
    }
    onClose();
  };

  return (
    <>
      <Toaster position="top-center" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative bg-background-light dark:bg-background-dark  backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4  text-text-main-light dark:text-text-main-dark hover:text-red-600"
        >
          <X size={28} />
        </button>

        <h2 className="text-3xl font-bold text-center  text-text-main-light dark:text-text-main-dark mb-6">
          Choose a Category
        </h2>

        {status === "loading" && !categories.length ? (
          <p className="text-center  text-text-main-light dark:text-text-main-dark">Loading categories...</p>
        ) : status === "failed" ? (
          <p className="text-center text-red-600">Failed to load categories</p>
        ) : null}

        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {categories.map((category) => (
                <motion.button
                  key={category._id}
                  onClick={() => handleCategorySelect(category.name)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1 ${
                    selectedCategory === category.name
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {category.name}
                  {category.createdBy && (
                    <span className="text-xs text-yellow-400">★</span>
                  )}
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-2 mx-auto text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
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
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={handleNewCategoryChange}
                  className="w-full p-3 border rounded-lg"
                />
                <input
                  type="text"
                  name="slug"
                  placeholder="Slug (e.g., my-category)"
                  value={newCategory.slug}
                  onChange={handleNewCategoryChange}
                  className="w-full p-3 border rounded-lg"
                />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={handleNewCategoryChange}
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                />
                <button
                  onClick={handleAddCategory}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add Category
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:underline"
          >
            ← Back
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default CategorySelector;