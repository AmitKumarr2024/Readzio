import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { X } from "lucide-react";
import defaultCategories from "../../Utils/categories";

const CategorySelector = ({
  selectedCategory,
  setSelectedCategory,
  onBack,
  onContinue,
  onClose,
}) => {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categories, setCategories] = useState(defaultCategories);
  const [hasContinuedOrSelected, setHasContinuedOrSelected] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("customCategories"));
    if (stored) setCategories([...defaultCategories, ...stored]);
  }, []);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return toast.error("Category name cannot be empty");
    if (categories.includes(trimmed)) return toast.error("Category already exists");

    const updatedCustom = JSON.parse(localStorage.getItem("customCategories")) || [];
    updatedCustom.push(trimmed);
    localStorage.setItem("customCategories", JSON.stringify(updatedCustom));
    setCategories((prev) => [...prev, trimmed]);
    setNewCategoryName("");
    toast.success("Category added");
  };

  const handleContinue = () => {
    if (!selectedCategory) return toast.error("Please select or create a category");

    setHasContinuedOrSelected(true);
    onContinue();
  };

  const handleClose = () => {
    if (!hasContinuedOrSelected) {
      toast.error("Please select or create a category before closing");
    } else {
      onClose();
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-700 hover:text-red-600 transition"
          aria-label="Close"
        >
          <X size={28} />
        </button>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Select or Create Category
        </h2>

        <label className="block text-sm font-medium mb-1 text-gray-700">
          Choose Existing Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
        >
          <option value="">-- Select a category --</option>
          {categories.map((cat, i) => (
            <option key={i} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1 text-gray-700">
          Or Add a New Category
        </label>
        <div className="flex flex-col gap-2 mb-6">
          <input
            type="text"
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleAddCategory}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Add
          </button>
        </div>

        <div className="flex justify-between items-center">
          <button onClick={onBack} className="text-gray-500 hover:underline">
            ⬅ Back
          </button>
          <button
            onClick={handleContinue}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default CategorySelector;
